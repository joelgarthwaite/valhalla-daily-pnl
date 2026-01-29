// Daily P&L Summary Email Template
// Modern, elegant design with clean lines

import { Resend } from 'resend';

// Morning quotes - reflective, wisdom-focused (for yesterday's recap)
const MORNING_QUOTES = [
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "Revenue is vanity, profit is sanity, but cash is king.", author: "Business Wisdom" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { text: "Profit in business comes from repeat customers.", author: "W. Edwards Deming" },
  { text: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs" },
  { text: "Without data, you're just another person with an opinion.", author: "W. Edwards Deming" },
  { text: "The best investment you can make is in yourself.", author: "Warren Buffett" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Robin Sharma" },
  { text: "A satisfied customer is the best business strategy of all.", author: "Michael LeBoeuf" },
  { text: "Business has only two functions: marketing and innovation.", author: "Peter Drucker" },
  { text: "The harder I work, the luckier I get.", author: "Gary Player" },
];

// Evening quotes - motivational, action-focused (for today's progress)
const EVENING_QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "It's not about ideas. It's about making ideas happen.", author: "Scott Belsky" },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
  { text: "The goal is not to be perfect by the end. The goal is to be better today.", author: "Simon Sinek" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Chase the vision, not the money; the money will end up following you.", author: "Tony Hsieh" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "I never dreamed about success. I worked for it.", author: "Estée Lauder" },
  { text: "Excellence is not a skill. It's an attitude.", author: "Ralph Marston" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
];

function getRandomQuote(isTodaySoFar: boolean): { text: string; author: string } {
  const quotes = isTodaySoFar ? EVENING_QUOTES : MORNING_QUOTES;
  // Use date-based seed for consistency within a day but variety across days
  const today = new Date().toISOString().split('T')[0];
  const seed = today.split('-').reduce((acc, num) => acc + parseInt(num, 10), 0);
  const index = seed % quotes.length;
  return quotes[index];
}

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

// Insight types for categorization
interface Insight {
  type: 'win' | 'concern';
  text: string;
  priority: number; // Higher = more important
}

// Generate intelligent insights based on P&L data
function generateInsights(data: DailySummaryData): Insight[] {
  const insights: Insight[] = [];
  const aov = data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;
  const isTodaySoFar = data.isTodaySoFar || false;

  // Context-aware language
  const timeContext = isTodaySoFar ? 'so far today' : 'yesterday';
  const vsText = isTodaySoFar ? 'vs yesterday' : 'vs day before';

  // Calculate channel percentages
  const shopifyPct = data.totalRevenue > 0 ? (data.shopifyRevenue / data.totalRevenue) * 100 : 0;
  const etsyPct = data.totalRevenue > 0 ? (data.etsyRevenue / data.totalRevenue) * 100 : 0;
  const b2bPct = data.totalRevenue > 0 ? (data.b2bRevenue / data.totalRevenue) * 100 : 0;

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

  // === PROFITABILITY ===
  if (data.trueNetProfit > 0) {
    if (data.netMarginPct >= 20) {
      insights.push({ type: 'win', text: `Excellent ${data.netMarginPct.toFixed(1)}% net margin ${timeContext} - well above 15% target`, priority: 95 });
    } else if (data.netMarginPct >= 15) {
      insights.push({ type: 'win', text: `Net margin at ${data.netMarginPct.toFixed(1)}% ${timeContext} - hitting the 15% target`, priority: 85 });
    } else if (data.netMarginPct >= 10) {
      insights.push({ type: 'concern', text: `Net margin at ${data.netMarginPct.toFixed(1)}% ${timeContext} - below 15% target`, priority: 70 });
    }
  } else {
    const lossText = isTodaySoFar ? 'Currently in the red' : 'Loss-making day';
    insights.push({ type: 'concern', text: `${lossText} with ${data.netMarginPct.toFixed(1)}% margin`, priority: 100 });
  }

  // === REVENUE TRENDS ===
  if (revenueChange !== null) {
    if (revenueChange >= 30) {
      insights.push({ type: 'win', text: `Revenue up ${revenueChange.toFixed(0)}% ${vsText} - strong ${isTodaySoFar ? 'pace' : 'growth'}`, priority: 88 });
    } else if (revenueChange <= -30) {
      insights.push({ type: 'concern', text: `Revenue down ${Math.abs(revenueChange).toFixed(0)}% ${vsText}${isTodaySoFar ? ' - still time to recover' : ''}`, priority: 82 });
    }
  }

  // === PROFIT TRENDS ===
  if (profitChange !== null && data.previousDay && data.previousDay.trueNetProfit !== 0) {
    if (profitChange >= 50 && data.trueNetProfit > 0) {
      insights.push({ type: 'win', text: `Profit ${isTodaySoFar ? 'tracking' : 'surged'} ${profitChange.toFixed(0)}% ${isTodaySoFar ? 'ahead of' : 'vs'} ${isTodaySoFar ? 'yesterday' : 'day before'}`, priority: 90 });
    } else if (profitChange <= -50 && data.previousDay.trueNetProfit > 0) {
      insights.push({ type: 'concern', text: `Profit ${isTodaySoFar ? 'tracking' : 'dropped'} ${Math.abs(profitChange).toFixed(0)}% ${isTodaySoFar ? 'behind yesterday' : vsText}`, priority: 85 });
    }
  }

  // === AD EFFICIENCY ===
  if (data.totalAdSpend > 0) {
    if (data.mer >= 5) {
      insights.push({ type: 'win', text: `MER at ${data.mer.toFixed(1)}x ${timeContext} - excellent ad efficiency`, priority: 80 });
    } else if (data.mer >= 3) {
      insights.push({ type: 'win', text: `Healthy ${data.mer.toFixed(1)}x MER on £${data.totalAdSpend.toFixed(0)} spend`, priority: 65 });
    } else if (data.mer < 2) {
      insights.push({ type: 'concern', text: `MER at ${data.mer.toFixed(1)}x - ads underperforming (target >3x)`, priority: 78 });
    }

    if (data.poas < 100) {
      const poasText = isTodaySoFar ? 'Currently losing money on ads' : 'Lost money on ads';
      insights.push({ type: 'concern', text: `${poasText} - POAS at ${data.poas.toFixed(0)}%`, priority: 88 });
    } else if (data.poas >= 200) {
      insights.push({ type: 'win', text: `Strong ${data.poas.toFixed(0)}% POAS - £${((data.poas / 100) - 1).toFixed(2)} profit per £1 ad spend`, priority: 75 });
    }
  }

  // === AOV ===
  if (aov >= 100) {
    insights.push({ type: 'win', text: `High AOV at ${formatCurrency(aov)} per order`, priority: 60 });
  } else if (aov < 50 && data.totalOrders >= 5) {
    insights.push({ type: 'concern', text: `Low AOV at ${formatCurrency(aov)} - consider upselling`, priority: 55 });
  }

  // === CHANNEL MIX ===
  if (shopifyPct > 90 && data.etsyRevenue > 0) {
    insights.push({ type: 'concern', text: `${shopifyPct.toFixed(0)}% revenue from Shopify - diversify channels`, priority: 45 });
  }
  if (etsyPct > 30) {
    insights.push({ type: 'win', text: `Etsy contributing ${etsyPct.toFixed(0)}% of revenue - good diversification`, priority: 50 });
  }
  if (b2bPct > 20) {
    insights.push({ type: 'win', text: `B2B at ${b2bPct.toFixed(0)}% of revenue - strong wholesale`, priority: 55 });
  }

  // === OPEX BURDEN ===
  if (data.gp3 > 0) {
    const opexBurden = (data.totalOpex / data.gp3) * 100;
    if (opexBurden > 80) {
      insights.push({ type: 'concern', text: `OPEX consuming ${opexBurden.toFixed(0)}% of GP3 - tight margins`, priority: 72 });
    }
  }

  // === BRAND PERFORMANCE ===
  if (data.brands && Object.keys(data.brands).length > 1) {
    const brandList = Object.values(data.brands);
    const profitable = brandList.filter(b => b.netProfit > 0);
    const unprofitable = brandList.filter(b => b.netProfit <= 0);

    if (profitable.length === brandList.length) {
      insights.push({ type: 'win', text: `All ${brandList.length} brands ${isTodaySoFar ? 'currently' : ''} profitable`, priority: 70 });
    } else if (unprofitable.length > 0) {
      const names = unprofitable.map(b => b.name).join(', ');
      insights.push({ type: 'concern', text: `${names} ${isTodaySoFar ? 'currently' : 'was'} in the red`, priority: 75 });
    }

    // Check for standout performer
    const topBrand = brandList.reduce((a, b) => a.netProfit > b.netProfit ? a : b);
    if (topBrand.netProfit > 0 && brandList.length > 1) {
      const share = (topBrand.revenue / data.totalRevenue) * 100;
      if (share >= 70) {
        insights.push({ type: 'win', text: `${topBrand.name} driving ${share.toFixed(0)}% of revenue ${timeContext}`, priority: 58 });
      }
    }
  }

  // === ORDER VOLUME ===
  if (ordersChange !== null) {
    if (ordersChange >= 50) {
      insights.push({ type: 'win', text: `Order volume up ${ordersChange.toFixed(0)}% ${vsText}${isTodaySoFar ? ' - strong pace' : ''}`, priority: 68 });
    } else if (ordersChange <= -40) {
      insights.push({ type: 'concern', text: `Orders down ${Math.abs(ordersChange).toFixed(0)}% ${vsText}${isTodaySoFar ? ' - quieter day' : ''}`, priority: 62 });
    }
  }

  // Sort by priority (highest first) and take top insights
  return insights.sort((a, b) => b.priority - a.priority);
}

// Get top N insights, balancing wins and concerns
function getTopInsights(data: DailySummaryData, maxInsights: number = 4): Insight[] {
  const all = generateInsights(data);
  const wins = all.filter(i => i.type === 'win');
  const concerns = all.filter(i => i.type === 'concern');

  // Prioritize showing at least one of each type if available
  const result: Insight[] = [];

  // Add top concern if any exist
  if (concerns.length > 0) {
    result.push(concerns[0]);
  }

  // Add top win if any exist
  if (wins.length > 0) {
    result.push(wins[0]);
  }

  // Fill remaining slots with highest priority items not yet added
  const remaining = all.filter(i => !result.includes(i));
  for (const insight of remaining) {
    if (result.length >= maxInsights) break;
    result.push(insight);
  }

  // Sort final list by priority
  return result.sort((a, b) => b.priority - a.priority);
}

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

  const headerTitle = isTodaySoFar ? 'Today So Far' : 'Yesterday\'s Results';
  const headerSubtitle = isTodaySoFar
    ? `${formattedDate} · Evening check-in`
    : `${formattedDate} · Final numbers`;
  const quote = getRandomQuote(isTodaySoFar);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>P&L ${headerTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 20px; background-color: ${COLORS.background}; color: ${COLORS.primary}; line-height: 1.5;">

  <!-- Daily Quote -->
  <div style="text-align: center; margin-bottom: 32px; padding: 0 16px;">
    <div style="font-size: 15px; font-style: italic; color: ${COLORS.secondary}; line-height: 1.5;">"${quote.text}"</div>
    <div style="font-size: 12px; color: ${COLORS.muted}; margin-top: 8px;">— ${quote.author}</div>
  </div>

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

  <!-- Quick Insights -->
  ${(() => {
    const insights = getTopInsights(data, 4);
    if (insights.length === 0) return '';

    const wins = insights.filter(i => i.type === 'win');
    const concerns = insights.filter(i => i.type === 'concern');

    return `
  <div style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.secondary}; margin-bottom: 16px;">Quick Insights</div>

    ${wins.length > 0 ? `
    <div style="margin-bottom: ${concerns.length > 0 ? '16px' : '0'};">
      ${wins.map(insight => `
      <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
        <span style="display: inline-block; width: 18px; height: 18px; min-width: 18px; background: #ecfdf5; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; color: ${COLORS.success}; margin-right: 10px;">+</span>
        <span style="font-size: 14px; color: ${COLORS.primary}; line-height: 1.4;">${insight.text}</span>
      </div>
      `).join('')}
    </div>
    ` : ''}

    ${concerns.length > 0 ? `
    <div>
      ${concerns.map(insight => `
      <div style="display: flex; align-items: flex-start; margin-bottom: 10px;">
        <span style="display: inline-block; width: 18px; height: 18px; min-width: 18px; background: #fef2f2; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; color: ${COLORS.danger}; margin-right: 10px;">!</span>
        <span style="font-size: 14px; color: ${COLORS.primary}; line-height: 1.4;">${insight.text}</span>
      </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
    `;
  })()}

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
    ${isTodaySoFar ? 'Evening check-in · How today is shaping up' : 'Morning recap · Yesterday\'s final numbers'}
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
