// Daily P&L Summary Email Template
// Modern, elegant design with clean lines

import { Resend } from 'resend';

// Resend client is initialized lazily to avoid build-time errors
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export interface BrandSummary {
  code: string;
  name: string;
  revenue: number;
  shopifyRevenue: number;
  etsyRevenue: number;
  b2bRevenue: number;
  orders: number;
  shopifyOrders: number;
  etsyOrders: number;
  b2bOrders: number;
  gp3: number;
  opex: number;
  netProfit: number;
}

export interface DailySummaryData {
  date: string;
  isTodaySoFar?: boolean;
  totalRevenue: number;
  shopifyRevenue: number;
  etsyRevenue: number;
  b2bRevenue: number;
  totalOrders: number;
  gp1: number;
  gp2: number;
  gp3: number;
  totalOpex: number;
  trueNetProfit: number;
  grossMarginPct: number;
  netMarginPct: number;
  totalAdSpend: number;
  mer: number;
  poas: number;
  brands?: Record<string, BrandSummary>;
  previousDay?: {
    totalRevenue: number;
    trueNetProfit: number;
    totalOrders: number;
  };
}

function formatCurrency(amount: number): string {
  const prefix = amount < 0 ? '-' : '';
  return `${prefix}£${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercentage(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Color palette - refined and elegant
const COLORS = {
  primary: '#18181b',      // Near black
  secondary: '#71717a',    // Zinc gray
  muted: '#a1a1aa',        // Light gray
  border: '#e4e4e7',       // Very light gray
  background: '#fafafa',   // Off-white
  white: '#ffffff',
  success: '#059669',      // Emerald (muted green)
  danger: '#dc2626',       // Red
  accent: '#2563eb',       // Blue accent
};

export function generateDailySummaryHTML(data: DailySummaryData): string {
  const isProfitable = data.trueNetProfit > 0;
  const profitColor = isProfitable ? COLORS.success : COLORS.danger;
  const isTodaySoFar = data.isTodaySoFar || false;

  const revenueChange = data.previousDay
    ? calculateChange(data.totalRevenue, data.previousDay.totalRevenue)
    : null;
  const profitChange = data.previousDay
    ? calculateChange(data.trueNetProfit, data.previousDay.trueNetProfit)
    : null;
  const ordersChange = data.previousDay
    ? calculateChange(data.totalOrders, data.previousDay.totalOrders)
    : null;

  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const headerTitle = isTodaySoFar ? 'Today So Far' : 'Daily Summary';
  const headerSubtitle = isTodaySoFar ? `${formattedDate} · 7pm update` : formattedDate;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>P&L ${headerTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 20px; background-color: ${COLORS.background}; color: ${COLORS.primary}; line-height: 1.5;">

  <!-- Header -->
  <table style="width: 100%; margin-bottom: 32px;">
    <tr>
      <td>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: ${COLORS.muted}; margin-bottom: 4px;">Valhalla Holdings</div>
        <div style="font-size: 24px; font-weight: 600; color: ${COLORS.primary};">${headerTitle}</div>
        <div style="font-size: 14px; color: ${COLORS.secondary}; margin-top: 4px;">${headerSubtitle}</div>
      </td>
      <td style="text-align: right; vertical-align: top;">
        <div style="display: inline-block; padding: 8px 16px; border-radius: 20px; background-color: ${isProfitable ? '#ecfdf5' : '#fef2f2'}; border: 1px solid ${isProfitable ? '#a7f3d0' : '#fecaca'};">
          <span style="font-size: 13px; font-weight: 600; color: ${profitColor};">${isProfitable ? 'Profitable' : 'Loss'}</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- Hero Metric -->
  <div style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 28px; margin-bottom: 24px; text-align: center;">
    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: ${COLORS.muted}; margin-bottom: 8px;">Net Profit${isTodaySoFar ? ' (so far)' : ''}</div>
    <div style="font-size: 36px; font-weight: 700; color: ${profitColor}; letter-spacing: -1px;">${formatCurrency(data.trueNetProfit)}</div>
    ${profitChange !== null ? `<div style="font-size: 13px; color: ${profitChange >= 0 ? COLORS.success : COLORS.danger}; margin-top: 6px;">${formatPercentage(profitChange)} vs previous day</div>` : ''}
  </div>

  <!-- Key Metrics Row -->
  <table style="width: 100%; margin-bottom: 24px; border-collapse: separate; border-spacing: 12px 0;">
    <tr>
      <td style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 20px; text-align: center; width: 33%;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.muted}; margin-bottom: 6px;">Revenue</div>
        <div style="font-size: 20px; font-weight: 600; color: ${COLORS.primary};">${formatCurrency(data.totalRevenue)}</div>
        ${revenueChange !== null ? `<div style="font-size: 12px; color: ${revenueChange >= 0 ? COLORS.success : COLORS.danger}; margin-top: 4px;">${formatPercentage(revenueChange)}</div>` : ''}
      </td>
      <td style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 20px; text-align: center; width: 33%;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.muted}; margin-bottom: 6px;">Orders</div>
        <div style="font-size: 20px; font-weight: 600; color: ${COLORS.primary};">${data.totalOrders}</div>
        ${ordersChange !== null ? `<div style="font-size: 12px; color: ${ordersChange >= 0 ? COLORS.success : COLORS.danger}; margin-top: 4px;">${formatPercentage(ordersChange)}</div>` : ''}
      </td>
      <td style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 20px; text-align: center; width: 33%;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.muted}; margin-bottom: 6px;">Net Margin</div>
        <div style="font-size: 20px; font-weight: 600; color: ${data.netMarginPct >= 0 ? COLORS.success : COLORS.danger};">${data.netMarginPct.toFixed(1)}%</div>
        <div style="font-size: 12px; color: ${COLORS.muted}; margin-top: 4px;">Target: 15%</div>
      </td>
    </tr>
  </table>

  <!-- Profit Waterfall -->
  <div style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.secondary}; margin-bottom: 16px;">Profit Breakdown</div>
    <table style="width: 100%; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.secondary};">Revenue</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500; font-variant-numeric: tabular-nums;">${formatCurrency(data.totalRevenue)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.muted}; padding-left: 12px;">GP1 <span style="color: ${COLORS.muted};">after COGS</span></td>
        <td style="padding: 8px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(data.gp1)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.muted}; padding-left: 12px;">GP2 <span style="color: ${COLORS.muted};">after Ops</span></td>
        <td style="padding: 8px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(data.gp2)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.muted}; padding-left: 12px;">GP3 <span style="color: ${COLORS.muted};">after £${data.totalAdSpend.toFixed(0)} ads</span></td>
        <td style="padding: 8px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(data.gp3)}</td>
      </tr>
      <tr style="border-top: 1px solid ${COLORS.border};">
        <td style="padding: 12px 0 8px 0; color: ${COLORS.secondary};">OPEX</td>
        <td style="padding: 12px 0 8px 0; text-align: right; color: ${COLORS.danger}; font-variant-numeric: tabular-nums;">-${formatCurrency(data.totalOpex)}</td>
      </tr>
      <tr style="background: ${isProfitable ? '#f0fdf4' : '#fef2f2'};">
        <td style="padding: 12px; font-weight: 600; color: ${profitColor}; border-radius: 6px 0 0 6px;">Net Profit</td>
        <td style="padding: 12px; text-align: right; font-weight: 700; font-size: 16px; color: ${profitColor}; border-radius: 0 6px 6px 0; font-variant-numeric: tabular-nums;">${formatCurrency(data.trueNetProfit)}</td>
      </tr>
    </table>
  </div>

  <!-- Brand Performance -->
  <div style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.secondary}; margin-bottom: 16px;">By Brand</div>

    ${data.brands && Object.keys(data.brands).length > 0 ? `
    ${Object.values(data.brands).map((brand, idx, arr) => {
      const shopifyAOV = brand.shopifyOrders > 0 ? brand.shopifyRevenue / brand.shopifyOrders : 0;
      const etsyAOV = brand.etsyOrders > 0 ? brand.etsyRevenue / brand.etsyOrders : 0;
      const b2bAOV = brand.b2bOrders > 0 ? brand.b2bRevenue / brand.b2bOrders : 0;
      const totalAOV = brand.orders > 0 ? brand.revenue / brand.orders : 0;
      const isLast = idx === arr.length - 1;

      return `
      <div style="padding-bottom: ${isLast ? '0' : '16px'}; margin-bottom: ${isLast ? '0' : '16px'}; border-bottom: ${isLast ? 'none' : `1px solid ${COLORS.border}`};">
        <table style="width: 100%; margin-bottom: 12px;">
          <tr>
            <td style="font-weight: 600; font-size: 15px; color: ${COLORS.primary};">${brand.name}</td>
            <td style="text-align: right;">
              <span style="font-weight: 600; color: ${brand.netProfit >= 0 ? COLORS.success : COLORS.danger};">${formatCurrency(brand.netProfit)}</span>
            </td>
          </tr>
        </table>
        <table style="width: 100%; font-size: 12px; color: ${COLORS.secondary};">
          <tr style="border-bottom: 1px solid ${COLORS.border};">
            <td style="padding: 6px 0; font-weight: 500; color: ${COLORS.muted};">Channel</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 500; color: ${COLORS.muted};">Revenue</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 500; color: ${COLORS.muted};">Orders</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 500; color: ${COLORS.muted};">AOV</td>
          </tr>
          ${brand.shopifyOrders > 0 || brand.shopifyRevenue > 0 ? `
          <tr>
            <td style="padding: 6px 0;"><span style="display: inline-block; width: 6px; height: 6px; background: #22c55e; border-radius: 50%; margin-right: 6px;"></span>Shopify</td>
            <td style="padding: 6px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(brand.shopifyRevenue)}</td>
            <td style="padding: 6px 0; text-align: right; font-variant-numeric: tabular-nums;">${brand.shopifyOrders}</td>
            <td style="padding: 6px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(shopifyAOV)}</td>
          </tr>
          ` : ''}
          ${brand.etsyOrders > 0 || brand.etsyRevenue > 0 ? `
          <tr>
            <td style="padding: 6px 0;"><span style="display: inline-block; width: 6px; height: 6px; background: #f97316; border-radius: 50%; margin-right: 6px;"></span>Etsy</td>
            <td style="padding: 6px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(brand.etsyRevenue)}</td>
            <td style="padding: 6px 0; text-align: right; font-variant-numeric: tabular-nums;">${brand.etsyOrders}</td>
            <td style="padding: 6px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(etsyAOV)}</td>
          </tr>
          ` : ''}
          ${brand.b2bOrders > 0 || brand.b2bRevenue > 0 ? `
          <tr>
            <td style="padding: 6px 0;"><span style="display: inline-block; width: 6px; height: 6px; background: #3b82f6; border-radius: 50%; margin-right: 6px;"></span>B2B</td>
            <td style="padding: 6px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(brand.b2bRevenue)}</td>
            <td style="padding: 6px 0; text-align: right; font-variant-numeric: tabular-nums;">${brand.b2bOrders}</td>
            <td style="padding: 6px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(b2bAOV)}</td>
          </tr>
          ` : ''}
          <tr style="border-top: 1px solid ${COLORS.border}; font-weight: 500; color: ${COLORS.primary};">
            <td style="padding: 8px 0;">Total</td>
            <td style="padding: 8px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(brand.revenue)}</td>
            <td style="padding: 8px 0; text-align: right; font-variant-numeric: tabular-nums;">${brand.orders}</td>
            <td style="padding: 8px 0; text-align: right; font-variant-numeric: tabular-nums;">${formatCurrency(totalAOV)}</td>
          </tr>
        </table>
      </div>
      `;
    }).join('')}

    <!-- Group Total -->
    <div style="background: ${COLORS.primary}; border-radius: 8px; padding: 16px; margin-top: 16px;">
      <table style="width: 100%;">
        <tr>
          <td style="color: ${COLORS.white}; font-weight: 600;">Valhalla Group</td>
          <td style="text-align: right;">
            <div style="color: ${COLORS.white}; font-weight: 600; font-size: 16px;">${formatCurrency(data.totalRevenue)}</div>
            <div style="color: ${data.trueNetProfit >= 0 ? '#86efac' : '#fca5a5'}; font-size: 12px; margin-top: 2px;">Net: ${formatCurrency(data.trueNetProfit)}</div>
          </td>
        </tr>
      </table>
    </div>
    ` : `
    <table style="width: 100%; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0;"><span style="display: inline-block; width: 8px; height: 8px; background: #22c55e; border-radius: 50%; margin-right: 8px;"></span>Shopify</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.shopifyRevenue)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><span style="display: inline-block; width: 8px; height: 8px; background: #f97316; border-radius: 50%; margin-right: 8px;"></span>Etsy</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.etsyRevenue)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><span style="display: inline-block; width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; margin-right: 8px;"></span>B2B</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.b2bRevenue)}</td>
      </tr>
    </table>
    `}
  </div>

  <!-- Marketing Metrics -->
  ${data.totalAdSpend > 0 ? `
  <div style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.secondary}; margin-bottom: 16px;">Marketing</div>
    <table style="width: 100%; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.secondary};">Ad Spend</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500; font-variant-numeric: tabular-nums;">${formatCurrency(data.totalAdSpend)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.secondary};">MER <span style="color: ${COLORS.muted};">(Revenue / Spend)</span></td>
        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${data.mer >= 3 ? COLORS.success : COLORS.secondary};">${data.mer.toFixed(2)}x</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: ${COLORS.secondary};">POAS <span style="color: ${COLORS.muted};">(Profit / Spend)</span></td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500; color: ${data.poas >= 100 ? COLORS.success : COLORS.danger};">${data.poas.toFixed(0)}%</td>
      </tr>
    </table>
  </div>
  ` : ''}

  <!-- Footer -->
  <div style="text-align: center; padding: 24px 0;">
    <a href="https://pnl.displaychamp.com" style="display: inline-block; background: ${COLORS.primary}; color: ${COLORS.white}; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">View Dashboard</a>
  </div>

  <div style="text-align: center; font-size: 11px; color: ${COLORS.muted}; padding-top: 16px; border-top: 1px solid ${COLORS.border};">
    Valhalla Holdings · P&L Dashboard<br>
    ${isTodaySoFar ? 'Evening update · 7:00 PM' : 'Morning summary · 7:00 AM'}
  </div>

</body>
</html>
  `.trim();
}

export function generateDailySummaryText(data: DailySummaryData): string {
  const isProfitable = data.trueNetProfit > 0;
  const isTodaySoFar = data.isTodaySoFar || false;
  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const title = isTodaySoFar ? 'TODAY SO FAR' : 'DAILY P&L SUMMARY';
  const statusMessage = isProfitable ? 'PROFITABLE' : 'LOSS';

  return `
VALHALLA HOLDINGS
${title} - ${formattedDate}${isTodaySoFar ? ' (7pm update)' : ''}
${'─'.repeat(50)}

${statusMessage}

Net Profit: ${formatCurrency(data.trueNetProfit)}
Net Margin: ${data.netMarginPct.toFixed(1)}%

KEY METRICS
───────────
Revenue: ${formatCurrency(data.totalRevenue)}
Orders: ${data.totalOrders}
MER: ${data.mer.toFixed(2)}x

PROFIT BREAKDOWN
────────────────
Revenue:        ${formatCurrency(data.totalRevenue)}
  GP1:          ${formatCurrency(data.gp1)}
  GP2:          ${formatCurrency(data.gp2)}
  GP3:          ${formatCurrency(data.gp3)}
- OPEX:         ${formatCurrency(data.totalOpex)}
= Net Profit:   ${formatCurrency(data.trueNetProfit)}

BY BRAND
────────
${data.brands && Object.keys(data.brands).length > 0
  ? Object.values(data.brands).map(brand => {
      const shopifyAOV = brand.shopifyOrders > 0 ? brand.shopifyRevenue / brand.shopifyOrders : 0;
      const etsyAOV = brand.etsyOrders > 0 ? brand.etsyRevenue / brand.etsyOrders : 0;
      const b2bAOV = brand.b2bOrders > 0 ? brand.b2bRevenue / brand.b2bOrders : 0;
      return `${brand.name}: ${formatCurrency(brand.revenue)} (${brand.orders} orders)
  Net Profit: ${formatCurrency(brand.netProfit)}
  ${brand.shopifyOrders > 0 ? `Shopify: ${formatCurrency(brand.shopifyRevenue)} · ${brand.shopifyOrders} orders · ${formatCurrency(shopifyAOV)} AOV` : ''}
  ${brand.etsyOrders > 0 ? `Etsy: ${formatCurrency(brand.etsyRevenue)} · ${brand.etsyOrders} orders · ${formatCurrency(etsyAOV)} AOV` : ''}
  ${brand.b2bOrders > 0 ? `B2B: ${formatCurrency(brand.b2bRevenue)} · ${brand.b2bOrders} orders · ${formatCurrency(b2bAOV)} AOV` : ''}`;
    }).join('\n\n')
  : `Shopify: ${formatCurrency(data.shopifyRevenue)}
Etsy: ${formatCurrency(data.etsyRevenue)}
B2B: ${formatCurrency(data.b2bRevenue)}`}

${data.totalAdSpend > 0 ? `
MARKETING
─────────
Ad Spend: ${formatCurrency(data.totalAdSpend)}
MER: ${data.mer.toFixed(2)}x
POAS: ${data.poas.toFixed(0)}%
` : ''}
───
View dashboard: https://pnl.displaychamp.com
  `.trim();
}

export async function sendDailySummaryEmail(
  data: DailySummaryData,
  recipients: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const isProfitable = data.trueNetProfit > 0;
  const isTodaySoFar = data.isTodaySoFar || false;
  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  // Clean, professional subject line
  const subjectPrefix = isTodaySoFar ? 'Today' : 'Daily';
  const statusIndicator = isProfitable ? '↑' : '↓';

  try {
    const client = getResendClient();
    const { error } = await client.emails.send({
      from: 'Valhalla P&L <pnl@displaychamp.com>',
      to: recipients,
      subject: `${statusIndicator} ${subjectPrefix}: ${formatCurrency(data.trueNetProfit)} · ${formattedDate}`,
      html: generateDailySummaryHTML(data),
      text: generateDailySummaryText(data),
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Email send error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
