import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchShipStationShipments,
  mapCarrierCode,
  parseWeight,
  type ShipStationShipment,
} from '@/lib/shipstation/client';

interface SyncResult {
  matched: number;
  created: number;
  updated: number;
  notFound: number;
  errors: number;
  carrierStats: Record<string, number>;
}

// GET - Check ShipStation connection status
export async function GET() {
  try {
    // Try to fetch a single shipment to verify credentials
    const shipments = await fetchShipStationShipments({
      pageSize: 1,
      maxPages: 1,
    });

    return NextResponse.json({
      connected: true,
      message: 'ShipStation API connected',
      sampleCount: shipments.length,
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      message: error instanceof Error ? error.message : 'Failed to connect',
    });
  }
}

// POST - Sync shipments from ShipStation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      startDate,
      endDate,
      carrierCode,
      updateExisting = true,
    } = body as {
      startDate?: string;
      endDate?: string;
      carrierCode?: string;
      updateExisting?: boolean;
    };

    console.log('[ShipStation Sync] Starting sync...', { startDate, endDate, carrierCode });

    // Fetch shipments from ShipStation
    const shipments = await fetchShipStationShipments({
      startDate,
      endDate,
      carrierCode,
    });

    console.log(`[ShipStation Sync] Fetched ${shipments.length} shipments from ShipStation`);

    if (shipments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No shipments found in date range',
        results: {
          matched: 0,
          created: 0,
          updated: 0,
          notFound: 0,
          errors: 0,
          carrierStats: {},
        },
      });
    }

    const supabase = await createServiceClient();

    // Get all orders to match by order number
    // ShipStation orderNumber often contains the Shopify order number
    const orderNumbers = [...new Set(shipments.map(s => s.orderNumber))];

    // Fetch orders that might match (by platform_order_id or order_number)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orders, error: ordersError } = await (supabase as any)
      .from('orders')
      .select('id, brand_id, platform_order_id, order_number, raw_data');

    if (ordersError) {
      console.error('[ShipStation Sync] Error fetching orders:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Build lookup maps for matching
    const orderByPlatformId = new Map<string, { id: string; brand_id: string }>();
    const orderByOrderNumber = new Map<string, { id: string; brand_id: string }>();

    for (const order of orders || []) {
      if (order.platform_order_id) {
        orderByPlatformId.set(order.platform_order_id, { id: order.id, brand_id: order.brand_id });
      }
      // Also try to extract number from order_number (e.g., "#3575" -> "3575")
      const numMatch = order.order_number?.match(/\d+/);
      if (numMatch) {
        orderByOrderNumber.set(numMatch[0], { id: order.id, brand_id: order.brand_id });
      }
    }

    // Get or create carrier accounts
    const carrierAccounts = new Map<string, string>();
    const carriers = ['royalmail', 'dhl', 'deutschepost'];

    for (const carrier of carriers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let { data: account } = await (supabase as any)
        .from('carrier_accounts')
        .select('id')
        .eq('carrier', carrier)
        .single();

      if (!account) {
        const carrierNames: Record<string, string> = {
          royalmail: 'Royal Mail',
          dhl: 'DHL Express',
          deutschepost: 'Deutsche Post Cross-Border',
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newAccount } = await (supabase as any)
          .from('carrier_accounts')
          .insert({
            carrier,
            account_name: carrierNames[carrier] || carrier,
          })
          .select()
          .single();
        account = newAccount;
      }

      if (account) {
        carrierAccounts.set(carrier, account.id);
      }
    }

    // Process shipments
    const results: SyncResult = {
      matched: 0,
      created: 0,
      updated: 0,
      notFound: 0,
      errors: 0,
      carrierStats: {},
    };

    const notFoundOrders: string[] = [];

    for (const shipment of shipments) {
      const carrier = mapCarrierCode(shipment.carrierCode);
      results.carrierStats[carrier] = (results.carrierStats[carrier] || 0) + 1;

      // Try to find matching order
      let matchedOrder = orderByPlatformId.get(shipment.orderNumber);
      if (!matchedOrder) {
        matchedOrder = orderByOrderNumber.get(shipment.orderNumber);
      }

      if (!matchedOrder) {
        results.notFound++;
        if (notFoundOrders.length < 10) {
          notFoundOrders.push(shipment.orderNumber);
        }
        continue;
      }

      results.matched++;

      // Check if shipment already exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingShipment } = await (supabase as any)
        .from('shipments')
        .select('id')
        .eq('tracking_number', shipment.trackingNumber)
        .eq('carrier', carrier)
        .single();

      const shipmentData = {
        order_id: matchedOrder.id,
        brand_id: matchedOrder.brand_id,
        carrier,
        carrier_account_id: carrierAccounts.get(carrier) || null,
        tracking_number: shipment.trackingNumber,
        service_type: shipment.serviceCode || '',
        direction: 'outbound',
        weight_kg: parseWeight(shipment.weight),
        shipping_cost: shipment.shipmentCost > 0 ? shipment.shipmentCost : null,
        shipping_date: shipment.shipDate,
        status: 'from_shipstation',
        raw_data: {
          shipstation_id: shipment.shipmentId,
          shipstation_order_id: shipment.orderId,
          shipstation_order_number: shipment.orderNumber,
          service_code: shipment.serviceCode,
          carrier_code: shipment.carrierCode,
        },
      };

      if (existingShipment) {
        if (updateExisting) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from('shipments')
            .update(shipmentData)
            .eq('id', existingShipment.id);

          if (error) {
            results.errors++;
          } else {
            results.updated++;
          }
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('shipments')
          .insert(shipmentData);

        if (error) {
          results.errors++;
          console.error('[ShipStation Sync] Insert error:', error.message);
        } else {
          results.created++;
        }
      }
    }

    console.log('[ShipStation Sync] Complete:', results);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.matched} shipments (${results.created} created, ${results.updated} updated)`,
      results,
      notFoundSample: notFoundOrders,
    });
  } catch (error) {
    console.error('[ShipStation Sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
