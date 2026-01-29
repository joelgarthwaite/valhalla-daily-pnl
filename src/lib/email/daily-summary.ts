// Daily P&L Summary Email Template
// Sends at 6pm with profitability status and key metrics

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
  isTodaySoFar?: boolean; // true = "today so far" (evening), false = "yesterday's full results" (morning)
  // Revenue
  totalRevenue: number;
  shopifyRevenue: number;
  etsyRevenue: number;
  b2bRevenue: number;
  // Orders
  totalOrders: number;
  // Profit tiers
  gp1: number;
  gp2: number;
  gp3: number;
  totalOpex: number;
  trueNetProfit: number;
  // Margins
  grossMarginPct: number;
  netMarginPct: number;
  // Ad spend
  totalAdSpend: number;
  mer: number;
  poas: number;
  // Brand breakdowns
  brands?: Record<string, BrandSummary>;
  // Comparison (vs previous day)
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

function getStatusEmoji(profitable: boolean): string {
  return profitable ? '✅' : '⚠️';
}

function getProfitColor(amount: number): string {
  return amount >= 0 ? '#22c55e' : '#ef4444';
}

export function generateDailySummaryHTML(data: DailySummaryData): string {
  const isProfitable = data.trueNetProfit > 0;
  const profitColor = getProfitColor(data.trueNetProfit);
  const statusEmoji = getStatusEmoji(isProfitable);
  const isTodaySoFar = data.isTodaySoFar || false;

  // Calculate changes vs previous day
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

  // Different titles for morning (yesterday) vs evening (today so far)
  const emailTitle = isTodaySoFar ? 'Today So Far' : 'Daily P&L Summary';
  const subtitleText = isTodaySoFar
    ? `${formattedDate} (as of 7pm)`
    : formattedDate;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailTitle} - ${data.date}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, ${isTodaySoFar ? '#7c3aed' : '#1e3a8a'} 0%, ${isTodaySoFar ? '#a78bfa' : '#3b82f6'} 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0 0 10px 0; font-size: 24px;">${emailTitle}</h1>
    <p style="margin: 0; opacity: 0.9; font-size: 16px;">${subtitleText}</p>
  </div>

  <!-- Profitability Status -->
  <div style="background-color: ${isProfitable ? '#f0fdf4' : '#fef2f2'}; border-left: 4px solid ${profitColor}; padding: 20px; margin: 0;">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 32px;">${statusEmoji}</span>
      <div>
        <h2 style="margin: 0; color: ${profitColor}; font-size: 20px;">
          ${isTodaySoFar
            ? (isProfitable ? 'On Track for Profit!' : 'Not Profitable Yet')
            : (isProfitable ? 'Profitable Day!' : 'Unprofitable Day')}
        </h2>
        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
          True Net Profit${isTodaySoFar ? ' (so far)' : ''}: <strong style="color: ${profitColor}; font-size: 18px;">${formatCurrency(data.trueNetProfit)}</strong>
          ${profitChange !== null ? `<span style="color: ${profitChange >= 0 ? '#22c55e' : '#ef4444'};">(${formatPercentage(profitChange)} vs ${isTodaySoFar ? 'yesterday' : 'day before'})</span>` : ''}
        </p>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div style="background-color: white; padding: 25px; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

    <!-- Key Metrics Grid -->
    <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">📊 Key Metrics</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border-radius: 8px 0 0 0;">
          <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Revenue</div>
          <div style="color: #111827; font-size: 20px; font-weight: bold;">${formatCurrency(data.totalRevenue)}</div>
          ${revenueChange !== null ? `<div style="color: ${revenueChange >= 0 ? '#22c55e' : '#ef4444'}; font-size: 12px;">${formatPercentage(revenueChange)}</div>` : ''}
        </td>
        <td style="padding: 12px; background-color: #f9fafb; border-radius: 0 8px 0 0;">
          <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Orders</div>
          <div style="color: #111827; font-size: 20px; font-weight: bold;">${data.totalOrders}</div>
          ${ordersChange !== null ? `<div style="color: ${ordersChange >= 0 ? '#22c55e' : '#ef4444'}; font-size: 12px;">${formatPercentage(ordersChange)}</div>` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb;">
          <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Net Margin</div>
          <div style="color: ${data.netMarginPct >= 15 ? '#22c55e' : data.netMarginPct >= 0 ? '#f59e0b' : '#ef4444'}; font-size: 20px; font-weight: bold;">${data.netMarginPct.toFixed(1)}%</div>
          <div style="color: #6b7280; font-size: 12px;">Target: >15%</div>
        </td>
        <td style="padding: 12px; background-color: #f9fafb;">
          <div style="color: #6b7280; font-size: 12px; text-transform: uppercase;">MER</div>
          <div style="color: ${data.mer >= 3 ? '#22c55e' : '#f59e0b'}; font-size: 20px; font-weight: bold;">${data.mer.toFixed(2)}x</div>
          <div style="color: #6b7280; font-size: 12px;">Target: >3x</div>
        </td>
      </tr>
    </table>

    <!-- Profit Waterfall -->
    <h3 style="margin: 25px 0 15px 0; color: #374151; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">💰 Profit Breakdown</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Revenue</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.totalRevenue)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">→ GP1 (after COGS)</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.gp1)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">→ GP2 (after Ops)</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.gp2)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">→ GP3 (after Ads: ${formatCurrency(data.totalAdSpend)})</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.gp3)}</td>
      </tr>
      <tr style="border-top: 1px solid #e5e7eb;">
        <td style="padding: 8px 0; color: #6b7280;">- OPEX</td>
        <td style="padding: 8px 0; text-align: right; color: #ef4444; font-weight: 500;">-${formatCurrency(data.totalOpex)}</td>
      </tr>
      <tr style="background-color: ${isProfitable ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px;">
        <td style="padding: 12px 8px; font-weight: bold; color: ${profitColor};">= True Net Profit</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px; color: ${profitColor};">${formatCurrency(data.trueNetProfit)}</td>
      </tr>
    </table>

    <!-- Brand Performance -->
    <h3 style="margin: 25px 0 15px 0; color: #374151; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">🏢 Performance by Brand</h3>
    ${data.brands && Object.keys(data.brands).length > 0 ? `
    ${Object.values(data.brands).map(brand => {
      const shopifyAOV = brand.shopifyOrders > 0 ? brand.shopifyRevenue / brand.shopifyOrders : 0;
      const etsyAOV = brand.etsyOrders > 0 ? brand.etsyRevenue / brand.etsyOrders : 0;
      const b2bAOV = brand.b2bOrders > 0 ? brand.b2bRevenue / brand.b2bOrders : 0;
      return `
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 700; color: #111827; font-size: 15px;">${brand.name}</span>
          <span style="font-weight: 700; color: ${brand.netProfit >= 0 ? '#22c55e' : '#ef4444'};">${formatCurrency(brand.netProfit)}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <th style="padding: 4px 0; text-align: left; font-weight: 500; color: #6b7280;">Channel</th>
              <th style="padding: 4px 0; text-align: right; font-weight: 500; color: #6b7280;">Revenue</th>
              <th style="padding: 4px 0; text-align: right; font-weight: 500; color: #6b7280;">Orders</th>
              <th style="padding: 4px 0; text-align: right; font-weight: 500; color: #6b7280;">AOV</th>
            </tr>
          </thead>
          <tbody>
            ${brand.shopifyOrders > 0 || brand.shopifyRevenue > 0 ? `
            <tr>
              <td style="padding: 4px 0;"><span style="display: inline-block; width: 8px; height: 8px; background-color: #22c55e; border-radius: 50%; margin-right: 6px;"></span>Shopify</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 500;">${formatCurrency(brand.shopifyRevenue)}</td>
              <td style="padding: 4px 0; text-align: right;">${brand.shopifyOrders}</td>
              <td style="padding: 4px 0; text-align: right;">${formatCurrency(shopifyAOV)}</td>
            </tr>
            ` : ''}
            ${brand.etsyOrders > 0 || brand.etsyRevenue > 0 ? `
            <tr>
              <td style="padding: 4px 0;"><span style="display: inline-block; width: 8px; height: 8px; background-color: #f97316; border-radius: 50%; margin-right: 6px;"></span>Etsy</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 500;">${formatCurrency(brand.etsyRevenue)}</td>
              <td style="padding: 4px 0; text-align: right;">${brand.etsyOrders}</td>
              <td style="padding: 4px 0; text-align: right;">${formatCurrency(etsyAOV)}</td>
            </tr>
            ` : ''}
            ${brand.b2bOrders > 0 || brand.b2bRevenue > 0 ? `
            <tr>
              <td style="padding: 4px 0;"><span style="display: inline-block; width: 8px; height: 8px; background-color: #3b82f6; border-radius: 50%; margin-right: 6px;"></span>B2B</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 500;">${formatCurrency(brand.b2bRevenue)}</td>
              <td style="padding: 4px 0; text-align: right;">${brand.b2bOrders}</td>
              <td style="padding: 4px 0; text-align: right;">${formatCurrency(b2bAOV)}</td>
            </tr>
            ` : ''}
            <tr style="border-top: 1px solid #e5e7eb; font-weight: 600;">
              <td style="padding: 6px 0;">Total</td>
              <td style="padding: 6px 0; text-align: right;">${formatCurrency(brand.revenue)}</td>
              <td style="padding: 6px 0; text-align: right;">${brand.orders}</td>
              <td style="padding: 6px 0; text-align: right;">${formatCurrency(brand.orders > 0 ? brand.revenue / brand.orders : 0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      `;
    }).join('')}
    <div style="background-color: #1e3a8a; border-radius: 8px; padding: 12px; color: white;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 700; font-size: 15px;">Valhalla Group Total</span>
        <div style="text-align: right;">
          <div style="font-weight: 700; font-size: 16px;">${formatCurrency(data.totalRevenue)}</div>
          <div style="font-size: 12px; opacity: 0.9;">Net: <span style="color: ${data.trueNetProfit >= 0 ? '#86efac' : '#fca5a5'};">${formatCurrency(data.trueNetProfit)}</span></div>
        </div>
      </div>
    </div>
    ` : `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0;">
          <span style="display: inline-block; width: 10px; height: 10px; background-color: #22c55e; border-radius: 50%; margin-right: 8px;"></span>
          Shopify
        </td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.shopifyRevenue)}</td>
        <td style="padding: 8px 0; text-align: right; color: #6b7280; width: 60px;">${data.totalRevenue > 0 ? ((data.shopifyRevenue / data.totalRevenue) * 100).toFixed(0) : 0}%</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">
          <span style="display: inline-block; width: 10px; height: 10px; background-color: #f97316; border-radius: 50%; margin-right: 8px;"></span>
          Etsy
        </td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.etsyRevenue)}</td>
        <td style="padding: 8px 0; text-align: right; color: #6b7280; width: 60px;">${data.totalRevenue > 0 ? ((data.etsyRevenue / data.totalRevenue) * 100).toFixed(0) : 0}%</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">
          <span style="display: inline-block; width: 10px; height: 10px; background-color: #3b82f6; border-radius: 50%; margin-right: 8px;"></span>
          B2B
        </td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.b2bRevenue)}</td>
        <td style="padding: 8px 0; text-align: right; color: #6b7280; width: 60px;">${data.totalRevenue > 0 ? ((data.b2bRevenue / data.totalRevenue) * 100).toFixed(0) : 0}%</td>
      </tr>
    </table>
    `}

    <!-- Ad Performance -->
    ${data.totalAdSpend > 0 ? `
    <h3 style="margin: 25px 0 15px 0; color: #374151; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">📈 Ad Performance</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">Ad Spend</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formatCurrency(data.totalAdSpend)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">POAS (Profit on Ad Spend)</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500; color: ${data.poas >= 200 ? '#22c55e' : '#f59e0b'};">${data.poas.toFixed(0)}%</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b7280;">MER (Revenue / Ad Spend)</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500; color: ${data.mer >= 3 ? '#22c55e' : '#f59e0b'};">${data.mer.toFixed(2)}x</td>
      </tr>
    </table>
    ` : ''}

    <!-- Footer CTA -->
    <div style="margin-top: 30px; text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <a href="https://pnl.displaychamp.com" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">
        View Full Dashboard →
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0;">Valhalla Daily P&L Dashboard</p>
    <p style="margin: 5px 0 0 0;">${isTodaySoFar ? 'Evening update sent at 7:00 PM' : 'Morning summary sent at 7:00 AM'}</p>
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
  const statusMessage = isTodaySoFar
    ? (isProfitable ? '✅ ON TRACK FOR PROFIT!' : '⚠️ NOT PROFITABLE YET')
    : (isProfitable ? '✅ PROFITABLE DAY!' : '⚠️ UNPROFITABLE DAY');

  return `
${title} - ${formattedDate}${isTodaySoFar ? ' (as of 7pm)' : ''}
${'='.repeat(50)}

${statusMessage}

True Net Profit${isTodaySoFar ? ' (so far)' : ''}: ${formatCurrency(data.trueNetProfit)}
Net Margin: ${data.netMarginPct.toFixed(1)}%

KEY METRICS
-----------
Revenue: ${formatCurrency(data.totalRevenue)}
Orders: ${data.totalOrders}
MER: ${data.mer.toFixed(2)}x

PROFIT BREAKDOWN
----------------
Revenue:        ${formatCurrency(data.totalRevenue)}
→ GP1:          ${formatCurrency(data.gp1)}
→ GP2:          ${formatCurrency(data.gp2)}
→ GP3:          ${formatCurrency(data.gp3)}
- OPEX:         ${formatCurrency(data.totalOpex)}
= Net Profit:   ${formatCurrency(data.trueNetProfit)}

PERFORMANCE BY BRAND
--------------------
${data.brands && Object.keys(data.brands).length > 0
  ? Object.values(data.brands).map(brand =>
      `${brand.name}:
  Revenue: ${formatCurrency(brand.revenue)} (Shopify: ${formatCurrency(brand.shopifyRevenue)}, Etsy: ${formatCurrency(brand.etsyRevenue)}, B2B: ${formatCurrency(brand.b2bRevenue)})
  Net Profit: ${formatCurrency(brand.netProfit)}`
    ).join('\n\n') + `

VALHALLA GROUP TOTAL
Revenue: ${formatCurrency(data.totalRevenue)}
Net Profit: ${formatCurrency(data.trueNetProfit)}`
  : `Shopify: ${formatCurrency(data.shopifyRevenue)}
Etsy:    ${formatCurrency(data.etsyRevenue)}
B2B:     ${formatCurrency(data.b2bRevenue)}`}

${data.totalAdSpend > 0 ? `
AD PERFORMANCE
--------------
Ad Spend: ${formatCurrency(data.totalAdSpend)}
POAS: ${data.poas.toFixed(0)}%
MER: ${data.mer.toFixed(2)}x
` : ''}
---
View full dashboard: https://pnl.displaychamp.com
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
  const statusEmoji = isProfitable ? '✅' : '⚠️';
  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  // Different subject lines for morning (yesterday) vs evening (today so far)
  const subjectPrefix = isTodaySoFar ? 'Today So Far' : 'Daily P&L';
  const profitLabel = isTodaySoFar ? 'profit so far' : 'profit';

  try {
    const client = getResendClient();
    const { error } = await client.emails.send({
      from: 'Valhalla P&L <pnl@displaychamp.com>',
      to: recipients,
      subject: `${statusEmoji} ${subjectPrefix}: ${formatCurrency(data.trueNetProfit)} ${profitLabel} (${formattedDate})`,
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
