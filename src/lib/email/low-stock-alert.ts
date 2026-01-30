// Low Stock Alert Email Template
// Sends notifications when stock levels hit warning or critical thresholds

import { Resend } from 'resend';

// Resend client is initialized lazily to avoid build-time errors
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export type StockStatus = 'critical' | 'warning' | 'out_of_stock';

export interface LowStockItem {
  componentId: string;
  sku: string;
  name: string;
  category: string;
  status: StockStatus;
  onHand: number;
  available: number;
  onOrder: number;
  velocity: number;
  daysRemaining: number | null;
  reorderPoint: number;
  leadTime: number;
  safetyDays: number;
}

export interface LowStockAlertData {
  date: string;
  criticalItems: LowStockItem[];
  warningItems: LowStockItem[];
  outOfStockItems: LowStockItem[];
  totalLowStockItems: number;
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-GB');
}

// Color palette matching daily-summary
const COLORS = {
  primary: '#18181b',
  secondary: '#71717a',
  muted: '#a1a1aa',
  border: '#e4e4e7',
  background: '#fafafa',
  white: '#ffffff',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  accent: '#2563eb',
};

function getStatusColor(status: StockStatus): string {
  switch (status) {
    case 'out_of_stock':
      return COLORS.danger;
    case 'critical':
      return COLORS.danger;
    case 'warning':
      return COLORS.warning;
    default:
      return COLORS.secondary;
  }
}

function getStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'out_of_stock':
      return 'OUT OF STOCK';
    case 'critical':
      return 'CRITICAL';
    case 'warning':
      return 'WARNING';
  }
}

function getStatusBgColor(status: StockStatus): string {
  switch (status) {
    case 'out_of_stock':
      return '#fef2f2';
    case 'critical':
      return '#fef2f2';
    case 'warning':
      return '#fffbeb';
  }
}

function renderItemRow(item: LowStockItem): string {
  const statusColor = getStatusColor(item.status);
  const statusBg = getStatusBgColor(item.status);
  const daysText = item.daysRemaining !== null
    ? `${item.daysRemaining} days`
    : 'N/A';

  return `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid ${COLORS.border};">
        <div style="font-weight: 500; font-family: monospace; font-size: 13px;">${item.sku}</div>
        <div style="font-size: 12px; color: ${COLORS.secondary}; margin-top: 2px;">${item.name}</div>
        <div style="font-size: 11px; color: ${COLORS.muted}; margin-top: 2px;">${item.category}</div>
      </td>
      <td style="padding: 12px; text-align: center; border-bottom: 1px solid ${COLORS.border};">
        <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; background: ${statusBg}; color: ${statusColor}; font-size: 11px; font-weight: 600;">${getStatusLabel(item.status)}</span>
      </td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid ${COLORS.border}; font-variant-numeric: tabular-nums;">
        <div style="font-weight: 500; color: ${item.available <= 0 ? COLORS.danger : COLORS.primary};">${formatNumber(item.available)}</div>
        <div style="font-size: 11px; color: ${COLORS.muted};">${formatNumber(item.onOrder)} on order</div>
      </td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid ${COLORS.border}; font-variant-numeric: tabular-nums;">
        <div style="font-weight: 500; color: ${item.daysRemaining !== null && item.daysRemaining <= 7 ? COLORS.danger : COLORS.primary};">${daysText}</div>
        <div style="font-size: 11px; color: ${COLORS.muted};">${item.velocity.toFixed(1)}/day</div>
      </td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid ${COLORS.border}; font-variant-numeric: tabular-nums;">
        <div style="font-size: 13px; color: ${COLORS.secondary};">${formatNumber(item.reorderPoint)}</div>
        <div style="font-size: 11px; color: ${COLORS.muted};">${item.leadTime}d lead</div>
      </td>
    </tr>
  `;
}

export function generateLowStockAlertHTML(data: LowStockAlertData): string {
  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const hasCritical = data.criticalItems.length > 0 || data.outOfStockItems.length > 0;
  const headerColor = hasCritical ? COLORS.danger : COLORS.warning;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Low Stock Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; background-color: ${COLORS.background}; color: ${COLORS.primary}; line-height: 1.5;">

  <!-- Header -->
  <table style="width: 100%; margin-bottom: 32px;">
    <tr>
      <td>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: ${COLORS.muted}; margin-bottom: 4px;">Valhalla Inventory</div>
        <div style="font-size: 24px; font-weight: 600; color: ${COLORS.primary};">Low Stock Alert</div>
        <div style="font-size: 14px; color: ${COLORS.secondary}; margin-top: 4px;">${formattedDate}</div>
      </td>
      <td style="text-align: right; vertical-align: top;">
        <div style="display: inline-block; padding: 8px 16px; border-radius: 20px; background-color: ${hasCritical ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${hasCritical ? '#fecaca' : '#fde68a'};">
          <span style="font-size: 13px; font-weight: 600; color: ${headerColor};">${data.totalLowStockItems} Items Need Attention</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- Summary Cards -->
  <table style="width: 100%; margin-bottom: 24px; border-collapse: separate; border-spacing: 12px 0;">
    <tr>
      <td style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 20px; text-align: center; width: 33%;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.muted}; margin-bottom: 6px;">Out of Stock</div>
        <div style="font-size: 28px; font-weight: 600; color: ${data.outOfStockItems.length > 0 ? COLORS.danger : COLORS.success};">${data.outOfStockItems.length}</div>
      </td>
      <td style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 20px; text-align: center; width: 33%;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.muted}; margin-bottom: 6px;">Critical</div>
        <div style="font-size: 28px; font-weight: 600; color: ${data.criticalItems.length > 0 ? COLORS.danger : COLORS.success};">${data.criticalItems.length}</div>
      </td>
      <td style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 10px; padding: 20px; text-align: center; width: 33%;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.muted}; margin-bottom: 6px;">Warning</div>
        <div style="font-size: 28px; font-weight: 600; color: ${data.warningItems.length > 0 ? COLORS.warning : COLORS.success};">${data.warningItems.length}</div>
      </td>
    </tr>
  </table>

  ${data.outOfStockItems.length > 0 ? `
  <!-- Out of Stock Items -->
  <div style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.danger}; margin-bottom: 16px; display: flex; align-items: center;">
      <span style="display: inline-block; width: 8px; height: 8px; background: ${COLORS.danger}; border-radius: 50%; margin-right: 8px;"></span>
      Out of Stock (${data.outOfStockItems.length})
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 2px solid ${COLORS.border};">
          <th style="padding: 8px 12px; text-align: left; color: ${COLORS.muted}; font-weight: 500;">Component</th>
          <th style="padding: 8px 12px; text-align: center; color: ${COLORS.muted}; font-weight: 500;">Status</th>
          <th style="padding: 8px 12px; text-align: right; color: ${COLORS.muted}; font-weight: 500;">Available</th>
          <th style="padding: 8px 12px; text-align: right; color: ${COLORS.muted}; font-weight: 500;">Days Left</th>
          <th style="padding: 8px 12px; text-align: right; color: ${COLORS.muted}; font-weight: 500;">Reorder Pt</th>
        </tr>
      </thead>
      <tbody>
        ${data.outOfStockItems.map(renderItemRow).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${data.criticalItems.length > 0 ? `
  <!-- Critical Items -->
  <div style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.danger}; margin-bottom: 16px; display: flex; align-items: center;">
      <span style="display: inline-block; width: 8px; height: 8px; background: ${COLORS.danger}; border-radius: 50%; margin-right: 8px;"></span>
      Critical - Order Immediately (${data.criticalItems.length})
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 2px solid ${COLORS.border};">
          <th style="padding: 8px 12px; text-align: left; color: ${COLORS.muted}; font-weight: 500;">Component</th>
          <th style="padding: 8px 12px; text-align: center; color: ${COLORS.muted}; font-weight: 500;">Status</th>
          <th style="padding: 8px 12px; text-align: right; color: ${COLORS.muted}; font-weight: 500;">Available</th>
          <th style="padding: 8px 12px; text-align: right; color: ${COLORS.muted}; font-weight: 500;">Days Left</th>
          <th style="padding: 8px 12px; text-align: right; color: ${COLORS.muted}; font-weight: 500;">Reorder Pt</th>
        </tr>
      </thead>
      <tbody>
        ${data.criticalItems.map(renderItemRow).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${data.warningItems.length > 0 ? `
  <!-- Warning Items -->
  <div style="background: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <div style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${COLORS.warning}; margin-bottom: 16px; display: flex; align-items: center;">
      <span style="display: inline-block; width: 8px; height: 8px; background: ${COLORS.warning}; border-radius: 50%; margin-right: 8px;"></span>
      Warning - Plan to Reorder (${data.warningItems.length})
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 2px solid ${COLORS.border};">
          <th style="padding: 8px 12px; text-align: left; color: ${COLORS.muted}; font-weight: 500;">Component</th>
          <th style="padding: 8px 12px; text-align: center; color: ${COLORS.muted}; font-weight: 500;">Status</th>
          <th style="padding: 8px 12px; text-align: right; color: ${COLORS.muted}; font-weight: 500;">Available</th>
          <th style="padding: 8px 12px; text-align: right; color: ${COLORS.muted}; font-weight: 500;">Days Left</th>
          <th style="padding: 8px 12px; text-align: right; color: ${COLORS.muted}; font-weight: 500;">Reorder Pt</th>
        </tr>
      </thead>
      <tbody>
        ${data.warningItems.map(renderItemRow).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Actions -->
  <div style="text-align: center; padding: 24px 0;">
    <a href="https://pnl.displaychamp.com/inventory" style="display: inline-block; background: ${COLORS.primary}; color: ${COLORS.white}; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500; margin-right: 12px;">View Stock Levels</a>
    <a href="https://pnl.displaychamp.com/inventory/po/new" style="display: inline-block; background: ${COLORS.white}; color: ${COLORS.primary}; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500; border: 1px solid ${COLORS.border};">Create Purchase Order</a>
  </div>

  <div style="text-align: center; font-size: 11px; color: ${COLORS.muted}; padding-top: 16px; border-top: 1px solid ${COLORS.border};">
    Valhalla Holdings · Inventory Management<br>
    This is an automated alert based on current stock levels and velocity
  </div>

</body>
</html>
  `.trim();
}

export function generateLowStockAlertText(data: LowStockAlertData): string {
  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const renderTextItem = (item: LowStockItem): string => {
    const daysText = item.daysRemaining !== null ? `${item.daysRemaining} days remaining` : 'N/A';
    return `  ${item.sku} - ${item.name}
    Status: ${getStatusLabel(item.status)}
    Available: ${formatNumber(item.available)} (${formatNumber(item.onOrder)} on order)
    Days Remaining: ${daysText} (${item.velocity.toFixed(1)}/day velocity)
    Reorder Point: ${formatNumber(item.reorderPoint)} (${item.leadTime}d lead time)`;
  };

  return `
VALHALLA HOLDINGS
LOW STOCK ALERT - ${formattedDate}
${'─'.repeat(50)}

${data.totalLowStockItems} ITEMS NEED ATTENTION

Summary:
  Out of Stock: ${data.outOfStockItems.length}
  Critical: ${data.criticalItems.length}
  Warning: ${data.warningItems.length}

${data.outOfStockItems.length > 0 ? `
OUT OF STOCK (${data.outOfStockItems.length})
${'─'.repeat(30)}
${data.outOfStockItems.map(renderTextItem).join('\n\n')}
` : ''}

${data.criticalItems.length > 0 ? `
CRITICAL - ORDER IMMEDIATELY (${data.criticalItems.length})
${'─'.repeat(30)}
${data.criticalItems.map(renderTextItem).join('\n\n')}
` : ''}

${data.warningItems.length > 0 ? `
WARNING - PLAN TO REORDER (${data.warningItems.length})
${'─'.repeat(30)}
${data.warningItems.map(renderTextItem).join('\n\n')}
` : ''}

───
View Stock Levels: https://pnl.displaychamp.com/inventory
Create Purchase Order: https://pnl.displaychamp.com/inventory/po/new
  `.trim();
}

export async function sendLowStockAlertEmail(
  data: LowStockAlertData,
  recipients: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const hasCritical = data.criticalItems.length > 0 || data.outOfStockItems.length > 0;
  const formattedDate = new Date(data.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  // Subject line indicates severity
  const urgencyIndicator = data.outOfStockItems.length > 0
    ? '🔴'
    : data.criticalItems.length > 0
      ? '🟠'
      : '🟡';

  const subjectItems = [];
  if (data.outOfStockItems.length > 0) {
    subjectItems.push(`${data.outOfStockItems.length} out of stock`);
  }
  if (data.criticalItems.length > 0) {
    subjectItems.push(`${data.criticalItems.length} critical`);
  }
  if (data.warningItems.length > 0) {
    subjectItems.push(`${data.warningItems.length} warning`);
  }

  try {
    const client = getResendClient();
    const { error } = await client.emails.send({
      from: 'Valhalla Inventory <inventory@displaychamp.com>',
      to: recipients,
      subject: `${urgencyIndicator} Low Stock: ${subjectItems.join(', ')} · ${formattedDate}`,
      html: generateLowStockAlertHTML(data),
      text: generateLowStockAlertText(data),
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
