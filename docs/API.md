# Valhalla Hub - API Reference

> Complete reference for all API endpoints across the Valhalla Hub platform.
> Last Updated: January 2026

---

## Table of Contents

1. [Authentication](#authentication)
2. [P&L Data Endpoints](#pnl-data-endpoints)
3. [Order Sync Endpoints](#order-sync-endpoints)
4. [Shipping & Shipments](#shipping--shipments)
5. [Invoice Processing](#invoice-processing)
6. [Ad Spend Endpoints](#ad-spend-endpoints)
7. [Operating Expenses](#operating-expenses)
8. [B2B Revenue](#b2b-revenue)
9. [Xero Integration](#xero-integration)
10. [Cron Jobs](#cron-jobs)
11. [Email Notifications](#email-notifications)
12. [Error Handling](#error-handling)

---

## Authentication

All API endpoints require authentication via Supabase Auth.

### Headers

```http
Authorization: Bearer <supabase-access-token>
```

### Service Role Endpoints

Some endpoints use the service role key for bypassing RLS:
- `/api/pnl/data` - Fast P&L queries
- `/api/pnl/refresh` - P&L calculations
- `/api/orders/sync` - Order sync operations

---

## P&L Data Endpoints

### GET `/api/pnl/data`

Fetch P&L data for the dashboard. Uses service role for fast queries.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Start date (YYYY-MM-DD) |
| `to` | string | Yes | End date (YYYY-MM-DD) |
| `brand` | string | No | 'all', 'DC', or 'BI' (default: 'all') |

**Example Request:**

```bash
curl -H "Authorization: Bearer <token>" \
  "https://pnl.displaychamp.com/api/pnl/data?from=2025-01-01&to=2025-01-31&brand=all"
```

**Response:**

```json
{
  "brands": [
    { "id": "uuid", "name": "Display Champ", "code": "DC" },
    { "id": "uuid", "name": "Bright Ivy", "code": "BI" }
  ],
  "dailyPnl": [
    {
      "date": "2025-01-27",
      "brand_id": "uuid",
      "total_revenue": 5000.00,
      "net_revenue": 4800.00,
      "shopify_revenue": 3500.00,
      "etsy_revenue": 1300.00,
      "b2b_revenue": 0,
      "total_refunds": 200.00,
      "cogs": 1440.00,
      "gp1": 3360.00,
      "shopify_fees": 105.30,
      "etsy_fees": 84.50,
      "pick_pack": 240.00,
      "logistics": 144.00,
      "gp2": 2786.20,
      "total_ad_spend": 800.00,
      "gp3": 1986.20,
      "total_opex": 150.00,
      "true_net_profit": 1836.20,
      "order_count": 45
    }
  ],
  "adSpend": [
    {
      "date": "2025-01-27",
      "brand_id": "uuid",
      "platform": "meta",
      "spend": 650.00,
      "impressions": 45000,
      "clicks": 1200,
      "conversions": 15,
      "revenue_attributed": 2100.00
    }
  ],
  "quarterlyGoals": [
    {
      "year": 2025,
      "quarter": 1,
      "brand_id": "uuid",
      "revenue_target": 150000.00,
      "gross_margin_target": 65.00
    }
  ],
  "opex": {
    "summary": {
      "totalMonthly": 4500.00,
      "byCategory": {
        "staff": 2500.00,
        "premises": 800.00,
        "software": 350.00,
        "professional": 200.00,
        "other": 650.00
      }
    },
    "periodTotal": 4500.00,
    "expenseCount": 15
  }
}
```

---

### POST `/api/pnl/refresh`

Recalculate and store daily P&L records.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Alternative (days-based):**

```json
{
  "days": 90
}
```

**Response:**

```json
{
  "success": true,
  "message": "P&L refreshed for 31 days",
  "recordsUpdated": 62
}
```

---

### GET `/api/pnl/country`

Fetch P&L breakdown by customer shipping destination.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Start date (YYYY-MM-DD) |
| `to` | string | Yes | End date (YYYY-MM-DD) |
| `brand` | string | No | 'all', 'DC', or 'BI' (default: 'all') |

**Response:**

```json
{
  "countries": [
    {
      "country_code": "GB",
      "country_name": "United Kingdom",
      "revenue": 50000.00,
      "orders": 1200,
      "aov": 41.67,
      "cogs": 15000.00,
      "gp1": 35000.00,
      "platform_fees": 1500.00,
      "pick_pack": 2500.00,
      "logistics": 1500.00,
      "gp2": 29500.00,
      "gp2_margin": 59.00,
      "ad_spend": 5000.00,
      "gp3": 24500.00,
      "gp3_margin": 49.00,
      "platforms": {
        "shopify": { "revenue": 35000, "orders": 800 },
        "etsy": { "revenue": 15000, "orders": 400 }
      }
    }
  ],
  "summary": {
    "totalCountries": 45,
    "totalRevenue": 120000.00,
    "totalOrders": 3200,
    "domesticPct": 60,
    "internationalPct": 40,
    "topCountry": "GB",
    "topGp2Margin": "DE"
  },
  "hasAdSpendData": true
}
```

---

## Order Sync Endpoints

### POST `/api/orders/sync`

Sync orders from all connected platforms.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "all",
  "platforms": ["shopify", "etsy"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | No | Defaults to 30 days ago |
| `endDate` | string | No | Defaults to today |
| `brandCode` | string | No | 'all', 'DC', or 'BI' |
| `platforms` | array | No | ['shopify', 'etsy'] (default: all) |

**Response:**

```json
{
  "success": true,
  "results": {
    "shopify": {
      "DC": { "ordersCreated": 45, "ordersUpdated": 12 },
      "BI": { "ordersCreated": 8, "ordersUpdated": 2 }
    },
    "etsy": {
      "DC": { "ordersCreated": 22, "ordersUpdated": 5 },
      "BI": { "ordersCreated": 15, "ordersUpdated": 3 }
    }
  },
  "totalCreated": 90,
  "totalUpdated": 22,
  "exclusions": 3
}
```

---

### POST `/api/shopify/sync`

Sync orders from Shopify only.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "DC"
}
```

---

### POST `/api/etsy/sync`

Sync orders from Etsy only.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "BI"
}
```

---

### GET `/api/shopify/sync`

Check Shopify connection status.

**Response:**

```json
{
  "connected": true,
  "stores": [
    {
      "brand": "DC",
      "domain": "display-champ.myshopify.com",
      "lastSync": "2025-01-27T05:00:00Z"
    },
    {
      "brand": "BI",
      "domain": "brightivy.myshopify.com",
      "lastSync": "2025-01-27T05:00:00Z"
    }
  ]
}
```

---

### POST `/api/orders/exclude`

Exclude an order from P&L calculations.

**Request Body:**

```json
{
  "orderId": "uuid",
  "reason": "Test order"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Order excluded successfully"
}
```

---

### DELETE `/api/orders/exclude`

Restore an excluded order.

**Request Body:**

```json
{
  "platform": "shopify",
  "platformOrderId": "5123456789"
}
```

---

## Shipping & Shipments

### GET `/api/shipments`

List shipments with optional filters.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `unlinked` | boolean | No | If 'true', only return shipments without an order_id |
| `carrier` | string | No | Filter by carrier: 'dhl', 'royalmail', 'deutschepost' |
| `search` | string | No | Search by tracking number |
| `limit` | number | No | Max results (default: 100) |
| `offset` | number | No | Pagination offset (default: 0) |

**Example Request:**

```bash
# Get unlinked shipments (for B2B order matching)
curl "https://pnl.displaychamp.com/api/shipments?unlinked=true&limit=50"

# Search by tracking number
curl "https://pnl.displaychamp.com/api/shipments?search=1234567890"
```

**Response:**

```json
{
  "shipments": [
    {
      "id": "uuid",
      "tracking_number": "1234567890",
      "carrier": "dhl",
      "shipping_cost": 15.80,
      "service_type": "express",
      "shipping_date": "2025-01-25",
      "order_id": null,
      "brand_id": "uuid"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

---

### GET `/api/shipping/data`

Fetch shipping analytics data (orders with shipments).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Start date (YYYY-MM-DD) |
| `to` | string | Yes | End date (YYYY-MM-DD) |
| `brand` | string | No | 'all', 'DC', or 'BI' |

**Response:**

```json
{
  "brands": [...],
  "orders": [...],
  "shipments": [...],
  "meta": {
    "ordersCount": 500,
    "shipmentsCount": 520,
    "shipmentsWithCost": 480,
    "shipmentsWithOrderId": 490,
    "dateRange": { "from": "...", "to": "..." }
  }
}
```

**Note:** Orders can have multiple shipments. The system aggregates ALL shipping costs per order for accurate P&L tracking.

---

### POST `/api/shipstation/sync`

Sync shipments from ShipStation.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "carrierCode": "deutsche_post_cross_border",
  "updateExisting": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | No | Start date (defaults to 30 days ago) |
| `endDate` | string | No | End date (defaults to today) |
| `carrierCode` | string | No | Filter by ShipStation carrier code |
| `updateExisting` | boolean | No | Update existing shipments (default: true) |

**ShipStation Carrier Mapping:**

| ShipStation Code | Database Carrier |
|-----------------|------------------|
| `royal_mail` | `royalmail` |
| `dhl_express_uk` | `dhl` |
| `deutsche_post_cross_border` | `deutschepost` |

**Response:**

```json
{
  "success": true,
  "message": "Synced 570 shipments (3 created, 466 updated)",
  "results": {
    "matched": 570,
    "created": 3,
    "updated": 466,
    "notFound": 3,
    "errors": 0,
    "carrierStats": {
      "royalmail": 466,
      "deutschepost": 103,
      "dhl": 4
    }
  }
}
```

---

## Invoice Processing

### POST `/api/invoices/analyze`

Analyze a carrier invoice CSV before processing.

**Request Body:**

```json
{
  "csvContent": "Track and Trace Code,Total Price...",
  "carrier": "dhl"
}
```

**Response:**

```json
{
  "success": true,
  "analysis": {
    "totalRecords": 150,
    "totalCost": 2345.67,
    "carrier": "dhl",
    "dateRange": { "from": "2025-01-01", "to": "2025-01-15" },
    "records": [
      {
        "tracking_number": "1234567890",
        "shipping_cost": 15.80,
        "weight_kg": 0.5,
        "service_type": "express",
        "shipping_date": "2025-01-05"
      }
    ]
  }
}
```

---

### POST `/api/invoices/process`

Process analyzed invoice records and create/update shipments.

**Request Body:**

```json
{
  "records": [...],
  "carrier": "dhl",
  "invoiceNumber": "INV-2025-001",
  "fileName": "dhl-invoice-jan.csv"
}
```

**Response:**

```json
{
  "success": true,
  "summary": {
    "matched": 120,
    "created": 15,
    "updated": 105,
    "unmatched": 15
  },
  "unmatchedRecords": [
    {
      "tracking_number": "9999999999",
      "shipping_cost": 25.00,
      "reason": "No matching order found"
    }
  ]
}
```

---

### POST `/api/invoices/royalmail`

Process Royal Mail invoice CSV and allocate costs by date/service averages.

**Request Body:**

```json
{
  "csvContent": "...",
  "dryRun": false,
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "applyAverageToOld": true,
  "minDaysForAverage": 14
}
```

| Field | Type | Description |
|-------|------|-------------|
| `csvContent` | string | Royal Mail CSV file content |
| `dryRun` | boolean | Preview without applying (default: false) |
| `applyAverageToOld` | boolean | Apply service averages to old unmatched (default: false) |
| `minDaysForAverage` | number | Min age for average fallback (default: 14 days) |

**Royal Mail Product Code Mapping:**

| CSV Code | Service Type | Description |
|----------|--------------|-------------|
| TPS | rm_tracked_48 | Tracked 48 (UK) |
| TPM | rm_tracked_24 | Tracked 24 (UK) |
| SD1 | special_delivery_1pm | Special Delivery by 1pm |
| MPR | intl_tracked_ddp | International Tracked DDP |
| MP7 | intl_tracked_packet | International NPC Tracked Packet |

**Response:**

```json
{
  "success": true,
  "shipments": {
    "matched": 250,
    "unmatched": 45
  },
  "serviceTypeAverages": {
    "rm_tracked_48": 3.25,
    "rm_tracked_24": 4.50,
    "intl_tracked_ddp": 8.75
  },
  "averageUpdates": {
    "applied": 30,
    "skipped": 15
  }
}
```

---

### GET `/api/invoices/unmatched`

List unmatched invoice records for reconciliation.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | 'pending', 'matched', 'voided', 'resolved', 'all' |
| `carrier` | string | 'dhl', 'royalmail' |
| `limit` | number | Max results (default: 100) |
| `offset` | number | Pagination offset |

**Response:**

```json
{
  "records": [
    {
      "id": "uuid",
      "tracking_number": "1234567890",
      "carrier": "dhl",
      "shipping_cost": 15.80,
      "service_type": "express",
      "shipping_date": "2025-01-05",
      "invoice_number": "INV-001",
      "status": "pending",
      "resolution_notes": null,
      "matched_order_id": null,
      "created_at": "2025-01-10T10:00:00Z"
    }
  ],
  "total": 45,
  "statusCounts": {
    "pending": 30,
    "matched": 10,
    "voided": 3,
    "resolved": 2,
    "total": 45
  }
}
```

---

### PATCH `/api/invoices/unmatched`

Update an unmatched record status (match, void, resolve).

**Request Body:**

```json
{
  "id": "uuid",
  "status": "matched",
  "matched_order_id": "order-uuid",
  "resolution_notes": "Matched to B2B order #3126"
}
```

**Status Values:**

| Status | Description |
|--------|-------------|
| `pending` | Needs review |
| `matched` | Linked to order (creates shipment) |
| `voided` | Wasted label / cancelled |
| `resolved` | Investigated and closed |

**When Matching:**
- If shipment already exists for tracking+carrier: Updates existing shipment
- If no shipment exists: Creates new shipment linked to order
- Supports multiple shipments per order (split shipments)

**Response:**

```json
{
  "success": true,
  "record": { ... }
}
```

---

### POST `/api/invoices/unmatched`

Batch operations on unmatched records.

**Actions:**

**Deduplicate:**
```json
{
  "action": "dedupe"
}
```
Removes duplicate records (same tracking + invoice + cost).

**Auto-Resolve:**
```json
{
  "action": "auto-resolve"
}
```
Auto-resolves records where shipment already exists and is linked to an order.

**Response:**

```json
{
  "success": true,
  "message": "Auto-resolved 15 records that had matching shipments",
  "resolved": 15,
  "checked": 100
}
```

---

## Ad Spend Endpoints

### POST `/api/meta/sync`

Sync ad spend from Meta Marketing API.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "DC"
}
```

**Response:**

```json
{
  "success": true,
  "recordsSynced": 31,
  "totalSpend": 15000.00,
  "breakdown": {
    "impressions": 450000,
    "clicks": 12000,
    "conversions": 350,
    "revenueAttributed": 52000.00
  }
}
```

---

### POST `/api/meta/country-sync`

Sync country-level ad spend breakdown from Meta.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "all"
}
```

---

### GET `/api/meta/token`

Check Meta access token status.

**Response:**

```json
{
  "valid": true,
  "expiresAt": "2025-03-27T00:00:00Z",
  "daysRemaining": 59,
  "needsRefresh": false
}
```

---

### POST `/api/meta/token`

Exchange short-lived token for long-lived token.

**Request Body:**

```json
{
  "shortLivedToken": "<facebook-short-token>"
}
```

---

### POST `/api/google/sync`

Sync ad spend from Google Ads API.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "DC"
}
```

**Note:** Currently pending Google Ads Basic Access approval.

---

### GET `/api/google/auth`

Initiate Google Ads OAuth flow.

**Response:** Redirects to Google OAuth consent screen.

---

## Operating Expenses

### GET `/api/opex`

Fetch OPEX summary for a period.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Start date (YYYY-MM-DD) |
| `to` | string | Yes | End date (YYYY-MM-DD) |
| `brand` | string | No | 'all', 'DC', or 'BI' |

**Response:**

```json
{
  "summary": {
    "totalMonthly": 4500.00,
    "byCategory": {
      "staff": 2500.00,
      "premises": 800.00,
      "software": 350.00,
      "professional": 200.00,
      "insurance": 100.00,
      "equipment": 150.00,
      "travel": 100.00,
      "banking": 50.00,
      "marketing_other": 100.00,
      "other": 150.00
    }
  },
  "periodTotal": 4500.00,
  "expenseCount": 15,
  "expenses": [
    {
      "id": "uuid",
      "name": "Joel Salary",
      "category": "staff",
      "amount": 2500.00,
      "frequency": "monthly",
      "start_date": "2024-01-01",
      "end_date": null,
      "is_active": true
    }
  ]
}
```

---

## B2B Revenue

### POST `/api/b2b/import`

Bulk import B2B revenue by week.

**Request Body:**

```json
{
  "brand_code": "DC",
  "customer_name": "Weekly B2B Sales",
  "entries": [
    {
      "year": 2025,
      "week": 1,
      "subtotal": 630.00,
      "shipping_charged": 0,
      "notes": "Week 1 wholesale"
    },
    {
      "year": 2025,
      "week": 2,
      "subtotal": 450.00,
      "notes": "Week 2 wholesale"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "imported": 2,
  "totalValue": 1080.00
}
```

---

### GET `/api/b2b/import`

Get B2B import format documentation.

**Response:**

```json
{
  "format": {
    "brand_code": "DC | BI",
    "customer_name": "string",
    "entries": [
      {
        "year": "number (2024-2026)",
        "week": "number (1-52)",
        "subtotal": "number (required)",
        "shipping_charged": "number (optional)",
        "notes": "string (optional)"
      }
    ]
  },
  "example": "..."
}
```

---

## Xero Integration

### GET `/api/xero/auth`

Initiate Xero OAuth PKCE flow.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand` | string | Yes | 'DC' or 'BI' |

**Response:** Redirects to Xero OAuth consent screen.

---

### GET `/api/xero/balances`

Fetch current bank balances from Xero.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand` | string | No | 'all', 'DC', or 'BI' |

**Response:**

```json
{
  "balances": [
    {
      "brand": "DC",
      "accountName": "Monzo Business",
      "accountType": "BANK",
      "balance": 15234.56,
      "currency": "GBP",
      "updatedAt": "2025-01-27T12:00:00Z"
    },
    {
      "brand": "DC",
      "accountName": "Amex",
      "accountType": "CREDITCARD",
      "balance": -2500.00,
      "currency": "GBP",
      "updatedAt": "2025-01-27T12:00:00Z"
    }
  ],
  "totals": {
    "totalCash": 15234.56,
    "totalCredit": -2500.00,
    "netPosition": 12734.56
  }
}
```

---

### GET `/api/xero/invoices`

List synced Xero invoices.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | 'pending', 'approved', 'ignored' |
| `brand` | string | 'all', 'DC', 'BI' |

**Response:**

```json
{
  "invoices": [
    {
      "id": "uuid",
      "xero_invoice_id": "xero-guid",
      "invoice_number": "INV-0001",
      "contact_name": "B2B Customer Ltd",
      "total": 500.00,
      "date": "2025-01-15",
      "approval_status": "pending",
      "matched_order_id": null,
      "line_items": [...]
    }
  ],
  "total": 25
}
```

---

### POST `/api/xero/invoices`

Sync PAID invoices from Xero.

**Request Body:**

```json
{
  "brandCode": "DC",
  "fromDate": "2025-01-01",
  "toDate": "2025-01-31",
  "status": "ALL",
  "skipDateFilter": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | 'PAID', 'AUTHORISED', 'ALL' (default: 'ALL') |
| `skipDateFilter` | boolean | Fetch all invoices ignoring dates |

---

### PATCH `/api/xero/invoices/[id]`

Approve or ignore a Xero invoice.

**Approve (creates B2B order):**
```json
{
  "action": "approve",
  "tracking_number": "1234567890",
  "notes": "Optional notes"
}
```

**Ignore:**
```json
{
  "action": "ignore",
  "notes": "Not a product sale"
}
```

---

### GET `/api/xero/invoices/reconcile`

Get unreconciled B2B orders with match suggestions.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `brand` | string | 'all', 'DC', 'BI' |
| `minConfidence` | number | Minimum match score 0-100 (default: 40) |

**Match Scoring:**

| Factor | Max Points | Criteria |
|--------|------------|----------|
| Amount | 60 | Exact=60, within 1%=50, within 5%=30 |
| Date | 25 | Same day=25, within 3 days=20, within 7 days=15 |
| Customer | 15 | Exact=15, partial=10, word overlap=5 |

**Response:**

```json
{
  "orders": [
    {
      "id": "uuid",
      "order_number": "B2B-001",
      "subtotal": 500.00,
      "customer_name": "B2B Customer",
      "suggestions": [
        {
          "invoice": { ... },
          "confidence": 85,
          "reasons": ["Amount exact match", "Date within 3 days"]
        }
      ]
    }
  ]
}
```

---

### POST `/api/xero/invoices/reconcile`

Link a B2B order to a Xero invoice.

**Request Body:**

```json
{
  "orderId": "order-uuid",
  "invoiceId": "invoice-uuid"
}
```

---

## Cron Jobs

### GET `/api/cron/daily-sync`

Automated daily sync endpoint (called by Vercel cron).

**Authentication:**

```http
Authorization: Bearer <CRON_SECRET>
```

**Schedule:**
- 5:00 AM UTC - Full sync
- 6:00 PM UTC - Full sync + email

**Actions Performed:**
1. Sync Shopify orders (7 days)
2. Sync Etsy orders (7 days)
3. Sync Meta ad spend (7 days)
4. Sync Meta country breakdown
5. Refresh P&L calculations
6. Send daily summary email (6pm only)

**Response:**

```json
{
  "success": true,
  "timestamp": "2025-01-27T05:00:00Z",
  "actions": {
    "shopifySync": { "success": true, "orders": 45 },
    "etsySync": { "success": true, "orders": 22 },
    "metaSync": { "success": true, "spend": 650.00 },
    "pnlRefresh": { "success": true, "days": 7 },
    "emailSent": false
  }
}
```

**Manual Trigger:**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://pnl.displaychamp.com/api/cron/daily-sync
```

---

## Email Notifications

### POST `/api/email/daily-summary`

Send daily P&L summary email.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | No | Date for summary (default: yesterday) |
| `test` | string | No | If 'true', logs only (no send) |

**Request:**

```bash
# Send for specific date
curl -X POST "https://pnl.displaychamp.com/api/email/daily-summary?date=2025-01-26"

# Test mode (no send)
curl -X POST "https://pnl.displaychamp.com/api/email/daily-summary?test=true"
```

**Response:**

```json
{
  "success": true,
  "recipients": ["joel@displaychamp.com", "lee@displaychamp.com"],
  "date": "2025-01-26",
  "metrics": {
    "revenue": 5000.00,
    "orders": 45,
    "trueNetProfit": 1836.20,
    "netMargin": 36.7,
    "isProfitable": true
  }
}
```

---

## Error Handling

### Error Response Format

All API errors return a consistent format:

```json
{
  "error": true,
  "message": "Description of the error",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | User lacks required permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RATE_LIMITED` | 429 | Too many requests |
| `EXTERNAL_API_ERROR` | 502 | External API (Shopify/Etsy/Meta) failed |
| `DATABASE_ERROR` | 500 | Supabase query failed |
| `TOKEN_EXPIRED` | 401 | OAuth token needs refresh |

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| Meta API | 5 queries/second |
| Etsy API | 5 queries/second, 5000/day |
| Shopify API | Based on plan |
| P&L endpoints | No limit (internal) |

---

## Webhook Endpoints (Future)

Reserved for future webhook integrations:

- `/api/webhooks/shopify` - Shopify order webhooks
- `/api/webhooks/etsy` - Etsy receipt webhooks
- `/api/webhooks/stripe` - Payment webhooks

---

*API documentation maintained by the Valhalla development team.*
