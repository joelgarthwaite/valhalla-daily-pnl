// P&L Export Utilities
// Functions for exporting P&L data to Excel and PDF

import type { AggregatedPnL } from '@/lib/pnl/aggregations';
import type { PnLSummary, DateRange } from '@/types';
import { format } from 'date-fns';

// ============================================
// Excel Export
// ============================================

export async function generatePnLExcel(
  data: AggregatedPnL[],
  summary: PnLSummary,
  dateRange: DateRange,
  brandName: string
): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const XLSX = await import('xlsx');

  const formatCurrency = (value: number) => value.toFixed(2);
  const formatPct = (value: number) => `${value.toFixed(1)}%`;

  // Summary sheet
  const summaryData = [
    ['Valhalla Daily P&L Report'],
    [`Date Range: ${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`],
    [`Brand: ${brandName}`],
    [`Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}`],
    [],
    ['SUMMARY'],
    ['Metric', 'Value'],
    ['Total Revenue', formatCurrency(summary.totalRevenue)],
    ['Shopify Revenue', formatCurrency(summary.shopifyRevenue)],
    ['Etsy Revenue', formatCurrency(summary.etsyRevenue)],
    ['B2B Revenue', formatCurrency(summary.b2bRevenue)],
    ['Total Refunds', formatCurrency(summary.totalRefunds)],
    ['Net Revenue', formatCurrency(summary.netRevenue)],
    [],
    ['PROFIT TIERS'],
    ['GP1 (Revenue - COGS)', formatCurrency(summary.gp1)],
    ['GP2 (GP1 - Operational Costs)', formatCurrency(summary.gp2)],
    ['GP3 (GP2 - Ad Spend)', formatCurrency(summary.gp3)],
    [],
    ['COSTS'],
    ['COGS', formatCurrency(summary.cogs)],
    ['Pick & Pack', formatCurrency(summary.pickPackCost)],
    ['Logistics', formatCurrency(summary.logisticsCost)],
    ['Shipping Cost', formatCurrency(summary.shippingCost)],
    ['Shipping Margin', formatCurrency(summary.shippingMargin)],
    ['Ad Spend', formatCurrency(summary.totalAdSpend)],
    ['Platform Fees', formatCurrency(summary.platformFees)],
    [],
    ['MARGINS'],
    ['Gross Profit (GP1)', formatCurrency(summary.grossProfit)],
    ['Gross Margin', formatPct(summary.grossMarginPct)],
    ['Net Profit (GP3)', formatCurrency(summary.netProfit)],
    ['Net Margin', formatPct(summary.netMarginPct)],
    [],
    ['ORDERS & AOV'],
    ['Total Orders', summary.totalOrders.toString()],
    ['Gross AOV', formatCurrency(summary.grossAOV)],
    ['Net AOV', formatCurrency(summary.netAOV)],
    [],
    ['AD METRICS'],
    ['Blended ROAS', `${summary.blendedRoas.toFixed(2)}x`],
    ['POAS', `${summary.poas.toFixed(0)}%`],
    ['MER', `${summary.mer.toFixed(2)}x`],
    ['Marketing Cost Ratio', formatPct(summary.marketingCostRatio)],
    ['CoP', summary.cop.toFixed(2)],
  ];

  // Daily/Period data sheet
  const periodHeaders = [
    'Period',
    'Revenue',
    'Shopify',
    'Etsy',
    'B2B',
    'COGS',
    'Gross Profit',
    'GM %',
    'Shipping Cost',
    'Ad Spend',
    'Platform Fees',
    'Net Profit',
    'NM %',
    'Orders',
    'AOV',
  ];

  const periodData = data.map((d) => [
    d.periodLabel,
    formatCurrency(d.totalRevenue),
    formatCurrency(d.shopifyRevenue),
    formatCurrency(d.etsyRevenue),
    formatCurrency(d.b2bRevenue),
    formatCurrency(d.cogsEstimated),
    formatCurrency(d.grossProfit),
    formatPct(d.grossMarginPct),
    formatCurrency(d.shippingCost),
    formatCurrency(d.totalAdSpend),
    formatCurrency(d.totalPlatformFees),
    formatCurrency(d.netProfit),
    formatPct(d.netMarginPct),
    d.totalOrders.toString(),
    formatCurrency(d.avgOrderValue),
  ]);

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Add summary sheet
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

  // Add period data sheet
  const periodWs = XLSX.utils.aoa_to_sheet([periodHeaders, ...periodData]);
  XLSX.utils.book_append_sheet(wb, periodWs, 'P&L Data');

  // Generate buffer
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ============================================
// PDF Export
// ============================================

export async function generatePnLPDF(
  data: AggregatedPnL[],
  summary: PnLSummary,
  dateRange: DateRange,
  brandName: string
): Promise<Blob> {
  // Dynamic import to avoid SSR issues
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.default;
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF();
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  const formatPct = (value: number) => `${value.toFixed(1)}%`;

  const dateRangeStr = `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;

  // Header
  doc.setFontSize(20);
  doc.text('P&L Report', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Brand: ${brandName}`, 14, 30);
  doc.text(`Date Range: ${dateRangeStr}`, 14, 36);
  doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}`, 14, 42);

  // Summary section
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Summary', 14, 56);

  autoTable(doc, {
    startY: 62,
    head: [['Metric', 'Value']],
    body: [
      ['Total Revenue', formatCurrency(summary.totalRevenue)],
      ['Net Revenue (After Refunds)', formatCurrency(summary.netRevenue)],
      ['GP1 (Revenue - COGS)', formatCurrency(summary.gp1)],
      ['GP2 (GP1 - Ops Costs)', formatCurrency(summary.gp2)],
      ['GP3 (True Profit)', formatCurrency(summary.gp3)],
      ['Gross Margin', formatPct(summary.grossMarginPct)],
      ['Net Margin', formatPct(summary.netMarginPct)],
      ['Total Orders', summary.totalOrders.toLocaleString()],
      ['Gross AOV', formatCurrency(summary.grossAOV)],
      ['POAS', `${summary.poas.toFixed(0)}%`],
      ['MER', `${summary.mer.toFixed(2)}x`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 50, halign: 'right' },
    },
  });

  // Period data section
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summaryTableEnd = (doc as any).lastAutoTable?.finalY || 130;

  doc.setFontSize(14);
  doc.text('P&L by Period', 14, summaryTableEnd + 15);

  const periodTableData = data.slice(0, 30).map((d) => [
    d.periodLabel,
    formatCurrency(d.totalRevenue),
    formatCurrency(d.grossProfit),
    formatPct(d.grossMarginPct),
    formatCurrency(d.netProfit),
    formatPct(d.netMarginPct),
    d.totalOrders.toString(),
  ]);

  autoTable(doc, {
    startY: summaryTableEnd + 20,
    head: [['Period', 'Revenue', 'Gross Profit', 'GM%', 'Net Profit', 'NM%', 'Orders']],
    body: periodTableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
  });

  if (data.length > 30) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableEndY = (doc as any).lastAutoTable?.finalY || 200;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Showing first 30 of ${data.length} periods. Export Excel for full data.`, 14, tableEndY + 10);
  }

  // Footer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} | Valhalla Daily P&L`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

// ============================================
// Download Helpers
// ============================================

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToExcel(
  data: AggregatedPnL[],
  summary: PnLSummary,
  dateRange: DateRange,
  brandName: string
): Promise<void> {
  const blob = await generatePnLExcel(data, summary, dateRange, brandName);
  const filename = `pnl-report-${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}.xlsx`;
  downloadBlob(blob, filename);
}

export async function exportToPDF(
  data: AggregatedPnL[],
  summary: PnLSummary,
  dateRange: DateRange,
  brandName: string
): Promise<void> {
  const blob = await generatePnLPDF(data, summary, dateRange, brandName);
  const filename = `pnl-report-${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
  downloadBlob(blob, filename);
}
