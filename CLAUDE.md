# Valhalla Daily P&L

## Project Overview

A Lifetimely-style Daily P&L Dashboard for **Display Champ** and **Bright Ivy** brands. This is a standalone Next.js project deployed on Vercel, connecting to the existing Supabase database used by the Valhalla Dashboard.

**Project Location:** `/valhalla-daily-pnl/`

---

## Developer Documentation

For comprehensive technical documentation, see:

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Complete systems architecture, data flows, and consolidation roadmap
- **[docs/API.md](docs/API.md)** - Full API endpoint reference with request/response examples
- **[docs/diagrams/](docs/diagrams/)** - Mermaid diagrams for data flow, shipping flow, database schema, and P&L waterfall
- **[docs/PRODUCTS.md](docs/PRODUCTS.md)** - Technical reference for product structure and inventory system
- **[docs/PRODUCT-GUIDE.pdf](docs/PRODUCT-GUIDE.pdf)** - Team-facing product guide (SKU logic, components, assembly)

### Related Projects (Valhalla Hub)

| Project | Location | Purpose |
|---------|----------|---------|
| **P&L Dashboard** | This repo | Daily P&L analysis (GP1→GP2→GP3→Net) |
| **Shipping Dashboard** | `/Bright Ivy Postage Project (Claude)/` | Carrier costs & shipping margins |
| **EOS Framework** | `/Valhalla Holdings EOS Framework/` | Rocks, Scorecard, L10 meetings |

All projects share the same Supabase database and are planned for consolidation into a unified **Valhalla Hub** at `valhalla.displaychamp.com`.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 + React 19 |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| Database | Supabase (shared with Valhalla Dashboard) |
| Auth | Supabase Auth |
| Deployment | Vercel |

---

## Supabase Database

**Project URL:** `https://pbfaoshmaogrsgatfojs.supabase.co`

### Existing Tables (from Valhalla)
- `brands` - Brand definitions (Display Champ, Bright Ivy)
- `stores` - Connected store configurations
- `orders` - Order data from Shopify/Etsy
- `shipments` - Shipping records with costs and tracking
- `carrier_accounts` - Carrier API configurations

### P&L Tables
- `ad_spend` - Ad spend tracking (auto-synced from Meta/Google + manual entry)
- `b2b_revenue` - B2B sales records
- `quarterly_goals` - Revenue and margin targets
- `promotions` - Discount and promotion tracking
- `calendar_events` - Important dates calendar (with standard eCommerce events)
- `pnl_notes` - Daily notes and annotations
- `user_roles` - Role-based access control
- `daily_pnl` - Pre-aggregated P&L data for performance
- `cost_config` - Configurable cost percentages (COGS, pick/pack, logistics)
- `operating_expenses` - OPEX tracking (staff, premises, software, overheads)
- `etsy_fees` - Actual Etsy fees from Payment Ledger API
- `xero_connections` - Xero OAuth tokens for bank balance fetching
- `xero_invoices` - Synced Xero invoices for B2B order approval workflow
- `country_ad_spend` - Ad spend by country from Meta API (for GP3 in Country Analysis)
- `excluded_orders` - Permanently excluded orders (prevents re-sync)
- `sku_mapping` - SKU mappings for inventory forecasting (old_sku → current_sku)

### Inventory Tables
- `component_categories` - Categories lookup (cases, bases, accessories, packaging, display_accessories)
- `components` - Component master data (SKU, name, material, category, safety_days)
- `suppliers` - Supplier info (name, contact, lead_time, MOQ, payment_terms)
- `component_suppliers` - Many-to-many with supplier-specific pricing
- `bom` - Bill of Materials (product_sku → component_id + quantity)
- `stock_levels` - Current inventory (on_hand, reserved, on_order, available)
- `stock_transactions` - Audit trail of all stock movements
- `purchase_orders` - PO header (status, dates, totals)
- `purchase_order_items` - PO line items
- `inventory_notification_prefs` - Per-user email settings

**Migrations:**
- `supabase/migrations/002_pnl_schema.sql` - Core P&L tables
- `supabase/migrations/003_enhanced_metrics.sql` - GP1/GP2/GP3, refunds, enhanced metrics
- `supabase/migrations/004_add_user_roles_index.sql` - Index for faster RLS policy checks
- `supabase/migrations/005_etsy_fees.sql` - Actual Etsy fees from Payment Ledger
- `supabase/migrations/006_fix_quarterly_goals_rls.sql` - RLS policy fixes
- `supabase/migrations/007_operating_expenses.sql` - Operating expenses (OPEX) table
- `supabase/migrations/008_xero_integration.sql` - Xero integration for bank balances
- `supabase/migrations/009_b2b_order_tagging.sql` - B2B tagging on orders (is_b2b, b2b_customer_name)
- `supabase/migrations/010_country_ad_spend.sql` - Country-level ad spend from Meta API
- `supabase/migrations/011_order_exclusions.sql` - Order exclusion system (excluded_at, excluded_orders table)
- `supabase/migrations/012_unmatched_invoices.sql` - Unmatched invoice records for reconciliation
- `supabase/migrations/013_add_deutschepost_carrier.sql` - Deutsche Post carrier support
- `supabase/migrations/014_sku_mapping.sql` - SKU mapping table for inventory forecasting
- `supabase/migrations/015_inventory_schema.sql` - Full inventory management schema (Phase A)
- `supabase/migrations/018_b2b_orders_platform.sql` - Allow 'b2b' as platform type for orders
- `supabase/migrations/019_xero_invoices.sql` - Xero invoice sync for B2B orders

---

## Brands

| Brand | Code | Description | Status |
|-------|------|-------------|--------|
| Display Champ | DC | Sports memorabilia display cases (all sports) | Active, stores connected |
| Bright Ivy | BI | Display cases for special memories & keepsakes | In database (Google Ads suspended) |

**Note:** Both brands share the same physical component parts (bases, domes, etc.) - they are marketed to different audiences but use common inventory.

---

## Ad Platform Integrations

### Meta (Facebook/Instagram) - ACTIVE
- **Status:** Connected and syncing
- **Token Expires:** ~60 days from generation
- **Ad Accounts:**
  - Display Champ: `act_892968716290721`
  - Bright Ivy: `act_3210136152487456`
- **Data Synced:** Daily spend, impressions, clicks, conversions, purchase value (revenue attributed)
- **Country Breakdown:** Ad spend by country (where ad was shown) synced for Country Analysis GP3

### Google Ads - PENDING APPROVAL
- **Status:** Awaiting Basic Access approval (Explorer mode)
- **Manager Account:** `154-614-8084`
- **Customer IDs:**
  - Display Champ: `281-641-2476`
- **Data to Sync:** Daily spend, impressions, clicks, conversions, conversion value

---

## Etsy Integration

**Full guide:** See `docs/ETSY_INTEGRATION_GUIDE.md`

### Connected Shops

| Brand | Shop Name | Shop ID | Status | Orders |
|-------|-----------|---------|--------|--------|
| Bright Ivy | BrightIvyUK | 48268436 | ✅ Active | 412+ |
| Display Champ | DisplayChampUK | 54850131 | ⚠️ Needs token refresh | - |

### OAuth Flow

1. `GET /api/etsy/auth?brand=BI` - Get authorization URL
2. Open URL, authorize in Etsy
3. Callback returns access + refresh tokens
4. Tokens stored in `stores` table, auto-refresh enabled

### API Limits
- **Rate:** 5 queries/second
- **Daily:** 5,000 queries/day
- **Scopes:** `transactions_r`, `shops_r`

### Token Refresh
- Access tokens expire in 1 hour
- **Auto-refresh is enabled** - sync code refreshes tokens automatically
- Refresh tokens are long-lived (until user revokes app)

---

## Xero Integration

Real-time bank balances displayed on the dashboard from Xero accounting software.

### Account Structure

| Account | Brand | Xero Tenant | Type |
|---------|-------|-------------|------|
| Monzo DC | Display Champ | DC Xero | Bank Account |
| Monzo BI | Bright Ivy | BI Xero | Bank Account |
| Amex Gold | Shared | Both Xero accounts | Credit Card |

### OAuth Flow

1. `GET /api/xero/auth?brand=DC` - Redirects to Xero OAuth
2. User authorizes in Xero
3. Callback exchanges code for tokens, stores in `xero_connections` table
4. Tokens auto-refresh when fetching balances

### Token Management
- Access tokens expire in **30 minutes**
- Refresh tokens last **60 days**
- **Auto-refresh is enabled** - balance fetches automatically refresh tokens
- No manual intervention needed unless user revokes access

### Features
- Balances displayed on main dashboard (Cash Position card)
- Admin page to connect/disconnect Xero accounts (`/admin/xero`)
- Shared credit cards deduplicated automatically (shown once as "Shared")
- 5-minute auto-refresh on dashboard

### API Endpoints
- `GET /api/xero/auth?brand=DC|BI` - Start OAuth flow
- `GET /api/xero/callback` - OAuth callback (stores tokens)
- `GET /api/xero/balances?brand=all|DC|BI` - Fetch bank balances

### Xero Invoice Sync

Sync PAID invoices from Xero and approve them to create B2B orders.

**Location:** Admin > Xero Invoices (`/admin/xero/invoices`)

**OAuth Scope Required:** `accounting.transactions.read` (added Jan 2026)
- Existing connections need to re-authenticate to get the new scope
- Click "Connect Xero" again for any brand to upgrade permissions

**Two Tabs:**
1. **Invoice Approval** - Approve new Xero invoices to create B2B orders
2. **Reconcile B2B Orders** - Match existing B2B orders with Xero invoices

#### Invoice Approval Workflow
1. **Sync** - Click "Sync Invoices" to fetch PAID invoices from Xero
2. **Review** - See pending invoices in approval queue
3. **Approve** - Creates B2B order with Xero invoice number
4. **Ignore** - Dismisses invoice with reason

**Features:**
- Fetches sales invoices (Type=ACCREC) with configurable status (PAID, AUTHORISED, or ALL)
- De-duplicates on sync (won't create duplicates)
- Invoice number used as order_number for easy reference
- **Tracking number picker** - Select from unmatched invoice records (DHL) OR unlinked shipments (Royal Mail, etc.), or enter manually
- Status tracking: pending → approved/ignored

**Required Migration:** `018_b2b_orders_platform.sql` - Drops the platform check constraint to allow `b2b` as a platform type. Run in Supabase SQL Editor if you get "orders_platform_check" constraint errors.

#### B2B Order Reconciliation

Match existing B2B orders in the system with Xero invoices using intelligent confidence scoring.

**Matching Algorithm:**
- **Amount Match (60 pts max)**: Exact match = 60pts, within 1% = 50pts, within 5% = 30pts
- **Date Proximity (25 pts max)**: Same day = 25pts, within 3 days = 20pts, within 7 days = 15pts
- **Customer Name (15 pts max)**: Exact match = 15pts, partial match = 10pts, word overlap = 5pts

**Confidence Levels:**
- **High (≥80%)**: Strong match - likely correct
- **Medium (50-79%)**: Probable match - review recommended
- **Low (<50%)**: Weak match - careful review needed

**Workflow:**
1. View match suggestions sorted by confidence
2. Click "Link" to review details
3. Confirm to link order with invoice
4. Order's `raw_data.xero_invoice_id` is updated, invoice marked as approved

**Important:** B2B orders are created with the **invoice date** from Xero, not the approval date. Adjust date filters in the Orders page accordingly.

**API Endpoints:**
- `GET /api/xero/invoices` - List synced invoices (with filters)
- `POST /api/xero/invoices` - Sync invoices from Xero
  ```json
  {
    "brandCode": "DC",
    "fromDate": "2025-01-01",
    "toDate": "2025-01-31",
    "status": "ALL",
    "skipDateFilter": false
  }
  ```
  - `status`: "PAID" | "AUTHORISED" | "ALL" (default: "ALL")
  - `skipDateFilter`: true to fetch all invoices ignoring date range
- `GET /api/xero/invoices/[id]` - Get single invoice details
- `PATCH /api/xero/invoices/[id]` - Approve or ignore invoice
  ```json
  {
    "action": "approve",
    "tracking_number": "optional",
    "notes": "optional"
  }
  ```
- `DELETE /api/xero/invoices/[id]` - Delete pending invoice
- `GET /api/xero/invoices/reconcile` - Get unreconciled B2B orders with match suggestions
  ```
  Query params: brand (all|DC|BI), minConfidence (0-100, default 40)
  ```
- `POST /api/xero/invoices/reconcile` - Link a B2B order to a Xero invoice
  ```json
  {
    "orderId": "uuid",
    "invoiceId": "uuid"
  }
  ```
- `DELETE /api/xero/invoices/reconcile?orderId=uuid` - Unlink an order from its invoice

**Database Table:** `xero_invoices`
- `approval_status`: pending | approved | ignored
- `matched_order_id`: Links to created B2B order
- `line_items`: JSONB with invoice line items

**Order `raw_data` Fields (after reconciliation):**
- `xero_invoice_id`: The Xero invoice ID
- `xero_invoice_number`: The invoice number
- `reconciled_at`: Timestamp when reconciled

---

## ShipStation Integration

Syncs shipment data from ShipStation to link tracking numbers with orders and enable shipping cost allocation.

### Supported Carriers

| Carrier | ShipStation Code | Database Code |
|---------|------------------|---------------|
| Royal Mail | `royal_mail` | `royalmail` |
| DHL Express | `dhl_express_uk` | `dhl` |
| Deutsche Post Cross-Border | `deutsche_post_cross_border` | `deutschepost` |

### How It Works

1. ShipStation stores all shipments with tracking numbers and order references
2. Sync API fetches shipments and matches to orders by `orderNumber` (Shopify order ID)
3. Creates/updates `shipments` table with tracking numbers linked to orders
4. Carrier invoice costs can then be matched to shipments by tracking number

### API Endpoints
- `GET /api/shipstation/sync` - Check connection status
- `POST /api/shipstation/sync` - Sync shipments from ShipStation
  ```json
  {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "carrierCode": "deutsche_post_cross_border",  // optional filter
    "updateExisting": true  // default: true
  }
  ```

### GlobalMail / Batch Shipments

DHL GlobalMail invoices contain batch costs (not individual tracking numbers). These are handled by:
1. Syncing individual shipments from ShipStation (with `LY...DE` tracking numbers)
2. Allocating batch invoice costs proportionally across shipments by ship date
3. Marking batch records as "Resolved" in unmatched invoices queue

### Environment Variables
```bash
SHIPSTATION_API_KEY=<api-key>
SHIPSTATION_API_SECRET=<api-secret>
```

---

## Royal Mail CSV Processor

Allocates shipping costs from Royal Mail invoice CSVs to shipments by matching date and product type.

### How It Works

Royal Mail invoices contain aggregated costs per manifest/date (not individual tracking numbers). The processor:

1. Parses the CSV to extract daily costs by product type (TPS, TPM, MPR, MP7, SD1)
2. Matches shipments by shipping date + service type
3. Applies the average cost per item for that date/product combination
4. Falls back to ±1 day matching if exact date not found
5. Optionally applies service-type averages to old unmatched shipments (>14 days)

### Product Code Mapping

| CSV Code | Service Type | Description |
|----------|--------------|-------------|
| TPS | rm_tracked_48 | Royal Mail Tracked 48 (UK domestic) |
| TPM | rm_tracked_24 | Royal Mail Tracked 24 (UK domestic) |
| SD1 | special_delivery_1pm | Special Delivery Guaranteed by 1pm |
| MPR | intl_tracked_ddp | International Business Parcels Tracked DDP |
| MP7 | intl_tracked_packet | International Business NPC Tracked Packet |

### API Endpoint

```
POST /api/invoices/royalmail
```

**Parameters:**
```json
{
  "csvContent": "string (required) - Royal Mail CSV file content",
  "dryRun": "boolean (default: false) - Preview changes without applying",
  "startDate": "string (YYYY-MM-DD) - Filter shipments from this date",
  "endDate": "string (YYYY-MM-DD) - Filter shipments to this date",
  "batchSize": "number (default: 50) - Parallel updates per batch",
  "applyAverageToOld": "boolean (default: false) - Apply averages to old unmatched",
  "minDaysForAverage": "number (default: 14) - Minimum age for average fallback"
}
```

**Response includes:**
- `shipments.matched` - Shipments with costs allocated from CSV
- `shipments.unmatched` - Shipments with no matching CSV data
- `unmatchedBreakdown` - Split by age (older/newer than 14 days)
- `serviceTypeAverages` - Calculated averages by service type
- `averageUpdates` - Results of average fallback (if enabled)

### Cost Confidence Levels

| Level | Match Method | Description |
|-------|--------------|-------------|
| `estimated_date_country` | `royalmail_csv_date_average` | Matched from CSV by date + service type |
| `estimated_country_only` | `royalmail_service_average` | Applied service-type average (no exact match) |

### Weekly Workflow

1. Royal Mail invoices arrive weekly
2. Upload CSV via API or admin interface
3. Processor matches costs to shipments automatically
4. Unmatched shipments within 14 days wait for next invoice
5. After 14 days, optionally apply averages with `applyAverageToOld: true`

---

## P&L Data Sources

### Revenue
| Source | Method |
|--------|--------|
| Shopify | Automated sync via `/api/shopify/sync` or from `orders` table |
| Etsy | Automated sync via `/api/etsy/sync` or from `orders` table |
| B2B | Manual entry (via admin page) |

### Costs
| Cost Type | Method |
|-----------|--------|
| COGS | Configurable % of revenue (default 30%) |
| Pick & Pack | Configurable % of revenue (default 5%) |
| Logistics | Configurable % of revenue (default 3%) |
| Shipping | Automated from `shipments` table |
| Ad Spend | Auto-synced from Meta/Google + manual entry |
| Shopify Fees | Calculated (~2.9% + £0.30/txn) |
| Etsy Fees | Calculated (~6.5%) |
| Discounts | Manual tracking via promotions |

---

## Revenue Definition (CRITICAL)

### Apples-to-Apples Comparison

To ensure consistent P&L calculations across Shopify and Etsy, we use **product revenue (subtotals)** as the primary revenue metric. This excludes shipping and tax, which are tracked separately.

### Revenue Breakdown

| Metric | Definition | Use Case |
|--------|------------|----------|
| **Product Revenue** | Sum of order subtotals (product prices only) | Primary P&L metric, margin calculations |
| **Shipping Charged** | Shipping fees charged to customers | Tracked separately, shipping margin calc |
| **Gross Revenue** | Product Revenue + Shipping Charged | Total customer payments (excl. tax) |
| **Net Revenue** | Product Revenue - Refunds | Used for GP1/GP2/GP3 calculations |

### Why This Matters

- **Shopify `subtotal_price`** = line items after discounts, EXCLUDES shipping/tax
- **Etsy `subtotal`** = line items minus coupon discounts, EXCLUDES shipping/tax
- Using subtotals ensures both platforms are measured identically

---

## API Field Mappings (Shopify & Etsy)

### CRITICAL: Order Sync Requirements

The Valhalla Dashboard (separate project) syncs orders from Shopify and Etsy. The mapping MUST follow these rules:

### Shopify API → Orders Table

| Shopify REST/GraphQL Field | Orders Table Column | Notes |
|---------------------------|---------------------|-------|
| `subtotal_price` / `subtotalPriceSet` | `subtotal` | **MUST USE THIS** - Product revenue only |
| `total_shipping_price_set` | `shipping_charged` | Shipping charged to customer |
| `total_tax` | `tax` | Tax amount |
| `total_price` / `totalPriceSet` | `total` | Full amount (for refund calc only) |
| `financial_status` | `raw_data.financial_status` | For refund detection |
| `refunds` | `raw_data.refunds` | For partial refund amounts |

**Shopify Field Definitions:**
- `subtotal_price`: Line item prices after discounts, BEFORE shipping and tax
- `total_price`: Full order total including shipping, tax, minus discounts
- `total_shipping_price_set`: Total shipping charged

### Etsy API → Orders Table

| Etsy Receipt Field | Orders Table Column | Notes |
|-------------------|---------------------|-------|
| `subtotal` or `total_price` | `subtotal` | **MUST USE THIS** - Product revenue only |
| `total_shipping_cost` | `shipping_charged` | Shipping charged to customer |
| `total_tax_cost` | `tax` | Tax amount |
| `grandtotal` | `total` | Full amount (for reference) |
| `adjustments` | `raw_data.adjustments` | For refund detection |

**Etsy Field Definitions:**
- `total_price`: Sum of (listing price × quantity), EXCLUDES shipping/tax
- `subtotal`: `total_price` minus coupon discounts, EXCLUDES shipping/tax
- `grandtotal`: `total_price` - discount + shipping + tax (what customer paid)
- `total_shipping_cost`: Shipping charged to customer

### Verification Checklist

When syncing orders, verify:

1. **Shopify orders**: `orders.subtotal` = Shopify `subtotal_price` (NOT `total_price`)
2. **Etsy orders**: `orders.subtotal` = Etsy `subtotal` or `total_price` (NOT `grandtotal`)
3. **Shipping**: `orders.shipping_charged` matches platform shipping field
4. **Raw data**: Full API response stored in `raw_data` for refund extraction

### Common Mistakes to Avoid

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Using `total` instead of `subtotal` | Revenue includes shipping, overstated | Map `subtotal_price`/`subtotal` correctly |
| Etsy `grandtotal` as subtotal | Revenue includes shipping+tax | Use `total_price` or `subtotal` |
| Missing `shipping_charged` | Shipping revenue not tracked | Map shipping field separately |
| Not storing `raw_data` | Can't extract refunds later | Store full API response |

---

## VAT Treatment

**All figures in the P&L are NET of VAT.**

### Revenue (NET of VAT)
- **Shopify**: `subtotal_price` excludes VAT
- **Etsy**: `subtotal` excludes VAT
- **B2B**: Recorded NET of VAT

### Costs (NET of VAT)
- **Ad Spend**: Meta/Google are B2B services, invoiced NET (VAT reclaimed)
- **Platform Fees**: Calculated on NET revenue amounts
- **Shipping Costs**: Carrier invoices are NET (VAT reclaimed)
- **COGS/Pick&Pack/Logistics**: Calculated as % of NET revenue
- **OPEX**: All operating expenses recorded NET of VAT

VAT is treated as a pass-through: collected from customers and paid to HMRC. It does not appear in P&L calculations as it has no impact on profitability for VAT-registered businesses.

---

## P&L Calculations

### Revenue Flow

```
Product Revenue = Shopify subtotal + Etsy subtotal + B2B subtotal
                  (excludes shipping and tax - apples-to-apples comparison)

Shipping Charged = Shipping fees paid by customers
                   (tracked separately for shipping margin analysis)

Gross Revenue = Product Revenue + Shipping Charged
                (total customer payments, excluding tax)

Net Revenue = Product Revenue - Refunds
              (used for all margin calculations)
```

### Profit Tiers (GP1 → GP2 → GP3 → True Net)

```
GP1 = Net Revenue - COGS
      (Gross profit after cost of goods)

GP2 = GP1 - Pick&Pack - Payment Fees - Logistics
      (Operating profit after fulfillment costs)

GP3 = GP2 - Ad Spend
      (Contribution Margin after Ads)

True Net Profit = GP3 - OPEX
      (THE BOTTOM LINE - after all operating expenses)
```

### Operating Expenses (OPEX)

OPEX includes all overhead costs not captured in variable costs:

| Category | Examples |
|----------|----------|
| Staff | Salaries, wages, NI, pensions, benefits |
| Premises | Rent, rates, utilities, building insurance |
| Software | Shopify subscription, design tools, accounting |
| Professional | Accountant, legal, consultants |
| Insurance | Business insurance (not premises) |
| Equipment | Equipment, maintenance, repairs |
| Travel | Business travel, vehicle costs |
| Banking | Bank fees, interest (not payment processing) |
| Marketing Other | Non-ad marketing (PR, events, sponsorships) |
| Other | Miscellaneous overhead |

**Manage OPEX:** Admin > Operating Expenses (`/admin/opex`)

**OPEX Date Calculation:**
- Each expense has a `start_date` and optional `end_date`
- OPEX is only applied to P&L for dates where the expense overlaps
- For recurring expenses (monthly/quarterly/annual), the daily amount is calculated and pro-rated
- For historical P&L data, expenses must have `start_date` set to when they actually started
- Example: A salary starting Jan 1, 2025 will show £0 OPEX for Dec 2024

### Key Metrics

| Metric | Formula | Notes |
|--------|---------|-------|
| Net Margin | (True Net Profit / Net Revenue) × 100 | THE BOTTOM LINE %. Includes OPEX. Target: >15% |
| Gross AOV | (Product Revenue + Shipping) / Orders | What customer pays per order |
| Net AOV | (Product Revenue - Discounts) / Orders | Product value per order |
| POAS | (GP3 / Ad Spend) × 100 | 200% = £2 profit per £1 ad spend |
| MER | Product Revenue / Total Ad Spend | Marketing efficiency |
| CoP | Total Costs / GP3 | Cost to generate £1 profit |
| Blended ROAS | Product Revenue / Total Ad Spend | Same as MER |
| Marketing Cost % | (Ad Spend / Product Revenue) × 100 | Ad spend as % of revenue |
| Shipping Margin | Shipping Charged - Shipping Cost | Profit/loss on shipping |

### Shipping Margin (Tracked Separately)

Shipping profit/loss is tracked separately from the main P&L flow:

```
Shipping Margin = Shipping Charged - Shipping Cost

This is NOT included in GP1/GP2/GP3 calculations.
It's a separate line item for visibility.
```

### Multiple Shipments Per Order

Orders can have multiple shipments (e.g., split shipments, Royal Mail + DHL for different parts of an order). The system correctly aggregates:

- **Total Shipping Cost** = Sum of all `shipments.shipping_cost` for the order
- **P&L Calculations** - Uses aggregated shipping cost per order
- **Shipping Page** - Shows total cost with indicator when multiple shipments exist
- **UI Indicators**:
  - Carrier column: Shows primary carrier with `+N` badge if multiple carriers
  - Cost column: Shows `(N)` count when cost is summed from multiple shipments

**Example:**
| Order | Shipment 1 | Shipment 2 | Total Displayed |
|-------|-----------|-----------|-----------------|
| #3126 | £5.20 Royal Mail | £15.80 DHL | £21.00 (2) |

---

## Project Structure

```
valhalla-daily-pnl/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main dashboard
│   │   ├── country/page.tsx            # Country analysis (P&L by shipping destination)
│   │   ├── detailed/page.tsx           # Detailed P&L view
│   │   ├── help/page.tsx               # P&L Help Guide (CFO-grade documentation)
│   │   ├── login/page.tsx              # Login page
│   │   ├── admin/                      # Admin pages
│   │   │   ├── sync/page.tsx           # Order sync from Shopify/Etsy
│   │   │   ├── ad-spend/page.tsx       # Ad spend with Meta/Google sync + brand filter
│   │   │   ├── orders/page.tsx         # Order list with B2B tagging, exclusions, sorting
│   │   │   ├── b2b-revenue/page.tsx    # B2B revenue entry
│   │   │   ├── opex/page.tsx           # Operating expenses (OPEX)
│   │   │   ├── xero/page.tsx           # Xero integration settings
│   │   │   ├── events/page.tsx         # Calendar events
│   │   │   ├── goals/page.tsx          # Quarterly goals
│   │   │   ├── promotions/page.tsx     # Promotions
│   │   │   └── reconciliation/page.tsx # Revenue reconciliation vs spreadsheet
│   │   ├── api/
│   │   │   ├── pnl/
│   │   │   │   ├── data/route.ts       # Fast P&L data fetch (bypasses RLS)
│   │   │   │   ├── country/route.ts    # Country P&L data (GP2/GP3 by shipping destination)
│   │   │   │   └── refresh/route.ts    # Refresh P&L calculations
│   │   │   ├── calendar/seed/route.ts  # Import standard events
│   │   │   ├── b2b/import/route.ts     # Bulk import B2B revenue
│   │   │   ├── meta/                   # Meta API integration
│   │   │   │   ├── sync/route.ts       # Sync ad spend from Meta
│   │   │   │   ├── country-sync/route.ts # Sync country-level ad spend
│   │   │   │   └── token/route.ts      # Token status & exchange
│   │   │   ├── google/                 # Google Ads integration
│   │   │   │   ├── auth/route.ts       # OAuth initiation
│   │   │   │   ├── callback/route.ts   # OAuth callback
│   │   │   │   └── sync/route.ts       # Sync ad spend from Google
│   │   │   ├── shopify/                # Shopify order sync
│   │   │   │   └── sync/route.ts       # Sync orders from Shopify
│   │   │   ├── etsy/                   # Etsy order sync
│   │   │   │   └── sync/route.ts       # Sync orders from Etsy
│   │   │   ├── xero/                   # Xero integration
│   │   │   │   ├── auth/route.ts       # OAuth initiation
│   │   │   │   ├── callback/route.ts   # OAuth callback (stores tokens)
│   │   │   │   └── balances/route.ts   # Fetch bank balances
│   │   │   ├── orders/                 # Order management
│   │   │   │   ├── route.ts            # List/update orders (B2B tagging)
│   │   │   │   ├── exclude/route.ts    # Exclude/restore orders from P&L
│   │   │   │   └── sync/route.ts       # Sync from all platforms
│   │   │   └── investor/
│   │   │       └── metrics/route.ts    # Investor metrics API (M&A data room)
│   │   └── layout.tsx                  # Root layout
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   ├── dashboard/                  # Dashboard components
│   │   │   ├── DashboardFilters.tsx    # Date/brand filters with mode toggle
│   │   │   ├── WeekPicker.tsx          # ISO week selection component
│   │   │   ├── KPIGrid.tsx             # KPI cards with tooltips
│   │   │   ├── HeroKPIGrid.tsx         # Hero metrics display
│   │   │   ├── PnLTable.tsx            # P&L data table
│   │   │   ├── AlertBanner.tsx         # Status alerts
│   │   │   └── CashPositionCard.tsx    # Bank balances from Xero
│   │   ├── charts/                     # Recharts components
│   │   ├── country/                    # Country analysis components
│   │   │   ├── CountrySummaryCards.tsx # KPI cards (countries, top country, domestic %)
│   │   │   ├── CountryTable.tsx        # P&L breakdown table by country
│   │   │   ├── CountryRevenueChart.tsx # Revenue bar chart by country
│   │   │   └── index.ts                # Barrel export
│   │   ├── help/                       # Help guide components
│   │   │   ├── TableOfContents.tsx     # Sticky sidebar navigation
│   │   │   ├── HelpWaterfall.tsx       # Interactive P&L flow chart
│   │   │   ├── KPIDefinitionsTable.tsx # Metric definition tables
│   │   │   ├── WorkedExample.tsx       # Step-by-step calculation
│   │   │   ├── PlatformBreakdown.tsx   # Platform fees & sources
│   │   │   ├── AdminFunctionsGuide.tsx # Admin capabilities guide
│   │   │   ├── ShippingInvoicesGuide.tsx # Shipping analytics, invoice processing, unmatched records
│   │   │   ├── XeroOrdersGuide.tsx     # Xero integration, order management
│   │   │   ├── CountryAnalysisGuide.tsx # Country P&L breakdown guide
│   │   │   └── index.ts                # Barrel export
│   │   └── forms/                      # Form components
│   ├── hooks/
│   │   ├── usePnLData.ts               # P&L data fetching hook
│   │   └── useFilterParams.ts          # URL-based filter persistence (sticky filters)
│   ├── lib/
│   │   ├── supabase/                   # Supabase client config
│   │   ├── pnl/                        # P&L calculation engine
│   │   │   ├── calculations.ts         # GP1/GP2/GP3/True Net Profit, POAS, MER, AOV
│   │   │   ├── opex.ts                 # OPEX calculations (daily allocation, period totals)
│   │   │   ├── country-calculations.ts # Country P&L calculations (GP1/GP2/GP3)
│   │   │   ├── aggregations.ts         # Time period rollups
│   │   │   ├── targets.ts              # Target calculations
│   │   │   └── reconciliation.ts       # Expected vs actual comparison
│   │   ├── meta/                       # Meta Marketing API
│   │   │   └── client.ts               # Fetch ad spend, token management
│   │   ├── google/                     # Google Ads API
│   │   │   └── client.ts               # OAuth, fetch ad spend
│   │   ├── xero/                       # Xero Accounting API
│   │   │   └── client.ts               # OAuth, fetch bank balances
│   │   ├── shopify/                    # Shopify Order API
│   │   │   └── client.ts               # GraphQL API, order fetch/transform
│   │   ├── etsy/                       # Etsy Order API
│   │   │   └── client.ts               # REST API, receipt fetch/transform
│   │   ├── calendar/                   # Calendar utilities
│   │   │   └── standard-events.ts      # UK/US holidays, eCommerce dates
│   │   └── utils/
│   │       └── export.ts               # Excel/PDF export
│   └── types/
│       └── index.ts                    # TypeScript types
├── scripts/
│   ├── import-2025-b2b.ts              # Import 2025 historic B2B data
│   └── 2025-b2b-data.json              # 2025 B2B data (£10,901 total)
├── supabase/
│   └── migrations/
│       ├── 002_pnl_schema.sql          # Core P&L tables
│       ├── 003_enhanced_metrics.sql    # Enhanced metrics columns
│       ├── 004_add_user_roles_index.sql # Index for faster RLS
│       ├── 005_etsy_fees.sql           # Actual Etsy fees from Payment Ledger
│       ├── 006_fix_quarterly_goals_rls.sql # RLS policy fixes
│       └── 007_operating_expenses.sql  # Operating expenses (OPEX) table
├── .env.local                          # Environment variables (not committed)
└── package.json
```

---

## Environment Variables

Create `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://pbfaoshmaogrsgatfojs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Meta Marketing API
META_ACCESS_TOKEN=<long-lived-token>
META_APP_ID=<app-id>
META_APP_SECRET=<app-secret>
META_AD_ACCOUNT_DC=act_892968716290721
META_AD_ACCOUNT_BI=act_3210136152487456

# Google Ads API
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-client-secret>
GOOGLE_DEVELOPER_TOKEN=<developer-token>
GOOGLE_MANAGER_ID=<mcc-id-no-dashes>
GOOGLE_CUSTOMER_ID_DC=<customer-id-no-dashes>
GOOGLE_REFRESH_TOKEN=<oauth-refresh-token>

# Shopify - Display Champ
SHOPIFY_DC_STORE_DOMAIN=display-champ.myshopify.com
SHOPIFY_DC_ACCESS_TOKEN=<admin-api-access-token>

# Shopify - Bright Ivy
SHOPIFY_BI_STORE_DOMAIN=brightivy.myshopify.com
SHOPIFY_BI_ACCESS_TOKEN=<admin-api-access-token>

# Etsy - Display Champ
ETSY_DC_API_KEY=<etsy-api-keystring>
ETSY_DC_SHOP_ID=<etsy-shop-id>
ETSY_DC_ACCESS_TOKEN=<oauth-access-token>
ETSY_DC_REFRESH_TOKEN=<oauth-refresh-token>

# Etsy - Bright Ivy
ETSY_BI_API_KEY=<etsy-api-keystring>
ETSY_BI_SHOP_ID=<etsy-shop-id>
ETSY_BI_ACCESS_TOKEN=<oauth-access-token>
ETSY_BI_REFRESH_TOKEN=<oauth-refresh-token>

# Cron Job
CRON_SECRET=<random-secret-for-manual-trigger>

# Email Notifications (Resend)
RESEND_API_KEY=<resend-api-key>

# Xero Integration (Bank Balances)
XERO_CLIENT_ID=<from-xero-developer-portal>
XERO_CLIENT_SECRET=<from-xero-developer-portal>

# ShipStation API (Shipment Sync)
SHIPSTATION_API_KEY=<api-key>
SHIPSTATION_API_SECRET=<api-secret>
```

---

## Development

```bash
cd valhalla-daily-pnl
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Dev/Admin Credentials

| Field | Value |
|-------|-------|
| Email | joel@displaychamp.com |
| Password | Valhalla |
| Role | Admin |

---

## Data Flow & Sync Architecture

### How Data Flows

```
Shopify/Etsy APIs → orders table → daily_pnl table → Dashboard
                         ↑                ↑
                    Order Sync       P&L Refresh
```

1. **Order Sync**: Fetches orders from Shopify/Etsy and saves to `orders` table
2. **P&L Refresh**: Aggregates orders into `daily_pnl` table with calculated metrics
3. **Dashboard**: Reads from `daily_pnl` table for fast display

### Simplified Sync Workflow

The sync page (`/admin/sync`) has ONE primary button: **"Sync & Update Dashboard"**

This button automatically:
1. Syncs orders from all connected platforms (Shopify, Etsy)
2. Refreshes P&L calculations for the selected date range
3. Shows progress: "Syncing..." → "Updating..." → "Done!"

Advanced options (individual platform sync, P&L-only refresh) are available under a collapsed section.

### Performance Optimizations

- **API Route for Dashboard Data** (`/api/pnl/data`): Bypasses slow RLS policies using service role key
- **Date-Range Filtered P&L Refresh**: Only processes orders within specified date range (default: 90 days)
- **User Roles Index**: `idx_user_roles_user_id` for faster auth checks

### Automatic Daily Sync (Cron Job)

Vercel cron jobs run twice daily at **7:00 AM** and **7:00 PM UTC** to automatically sync all data:

1. Syncs Shopify orders (last 7 days)
2. Syncs Etsy orders (last 7 days)
3. Syncs Meta ad spend (last 7 days)
4. Syncs Meta country ad spend (last 7 days)
5. Refreshes P&L calculations
6. **Sends P&L summary email** (both syncs)

**Schedule:**
| Time (UTC) | Time (UK) | Email Content |
|------------|-----------|---------------|
| 07:00 | 7:00 AM | Yesterday's full results |
| 19:00 | 7:00 PM | Today's results so far |

**Configuration:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-sync?type=morning",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/daily-sync?type=evening",
      "schedule": "0 19 * * *"
    }
  ]
}
```

**Manual Trigger:**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://pnl.displaychamp.com/api/cron/daily-sync
```

**Environment Variable:** `CRON_SECRET` - Required for manual triggering (Vercel cron calls are authenticated automatically)

**Function Timeouts:** The cron and sync endpoints use `maxDuration = 120` seconds (Vercel Pro plan). The full sync takes ~30-40 seconds, so this provides adequate headroom. Key endpoints with extended timeouts:
- `/api/cron/daily-sync` - Main cron job
- `/api/shopify/sync` - Shopify order sync
- `/api/etsy/sync` - Etsy order sync
- `/api/pnl/refresh` - P&L calculations

**Vercel Plan:** Pro (required for reliable cron execution and 120s function timeouts)

### Cron Troubleshooting

If emails aren't arriving at 7am/7pm:

1. **Check Vercel Cron Logs:**
   - Vercel Dashboard → Project → Settings → Cron Jobs
   - Click "View Logs" next to the cron job
   - Look for 401 errors (auth issue) or 500 errors (code issue)

2. **Common Issues:**
   | Symptom | Cause | Fix |
   |---------|-------|-----|
   | 401 on cron endpoint | `x-vercel-cron` header check failing | Check header exists (not specific value) |
   | 401 on internal API calls | Using Vercel function URL (has Deployment Protection) | Use production URL `https://pnl.displaychamp.com` |
   | 500 Error | Code error in sync | Check function logs for stack trace |
   | No logs at all | Cron not triggering | Verify crons enabled in Settings → Cron Jobs |
   | Email not sent | No P&L data for date | Check `daily_pnl` table has data |
   | "Success: false" | One of the sync steps failed | Expand logs to see which step errored |

3. **Manual Test:**
   ```bash
   # Test email only (no auth required for test mode)
   curl "https://pnl.displaychamp.com/api/email/daily-summary?type=evening&test=true"

   # Actually send email (no auth required)
   curl -X POST "https://pnl.displaychamp.com/api/email/daily-summary?type=evening"

   # Full cron (requires CRON_SECRET)
   curl -H "Authorization: Bearer $CRON_SECRET" "https://pnl.displaychamp.com/api/cron/daily-sync?type=evening"
   ```

4. **Vercel Cron Auth:**
   - Vercel sends `Authorization: Bearer $CRON_SECRET` (if CRON_SECRET env var is set)
   - Vercel also sends `x-vercel-cron` header (but may be null)
   - Code checks for EITHER auth header OR x-vercel-cron header existence
   - Manual triggers require `Authorization: Bearer $CRON_SECRET` header
   - `CRON_SECRET` must be set in Vercel Environment Variables

5. **Internal API Calls from Cron:**
   - Cron makes fetch() calls to internal endpoints (/api/shopify/sync, etc.)
   - MUST use production URL `https://pnl.displaychamp.com` NOT `request.url.origin`
   - `request.url.origin` gives Vercel function URL which has Deployment Protection
   - Code uses `VERCEL_ENV === 'production'` to select correct base URL

6. **Email Safeguard:**
   - Email is ONLY sent if critical syncs succeed
   - Critical = P&L Refresh succeeded AND (Shopify OR Etsy sync succeeded)
   - Prevents sending emails with stale/incomplete data
   - If syncs fail, email step shows "Skipped - critical syncs failed"

5. **Run Manually from Vercel:**
   - Go to Settings → Cron Jobs
   - Click "Run" button next to the cron job to trigger immediately

### Daily P&L Summary Emails

Two automated emails are sent daily to key stakeholders:

| Time | Email Type | Content |
|------|------------|---------|
| 7:00 AM | **Daily P&L Summary** | Yesterday's complete results |
| 7:00 PM | **Today So Far** | Current day's progress |

**Email Contents:**
- Profitability status (profitable or not)
- True Net Profit amount and comparison vs previous day
- Key metrics: Revenue, Orders, Net Margin, MER
- Profit waterfall: GP1 → GP2 → GP3 → OPEX → True Net Profit
- Revenue breakdown by channel (Shopify, Etsy, B2B)
- Ad performance: Spend, POAS, MER

**Recipients:** joel@displaychamp.com, lee@displaychamp.com

**Email Service:** [Resend](https://resend.com) - Modern email API with good free tier

**Setup:**
1. Create account at resend.com
2. Add and verify your domain (displaychamp.com)
3. Create API key
4. Add `RESEND_API_KEY` to Vercel environment variables

**Manual Trigger:**
```bash
# Morning email (yesterday's results)
curl -X POST -H "Authorization: Bearer $CRON_SECRET" "https://pnl.displaychamp.com/api/email/daily-summary?type=morning"

# Evening email (today so far)
curl -X POST -H "Authorization: Bearer $CRON_SECRET" "https://pnl.displaychamp.com/api/email/daily-summary?type=evening"

# Test mode (doesn't send, just returns data)
curl "https://pnl.displaychamp.com/api/email/daily-summary?type=morning&test=true"
```

---

## API Endpoints

### Cron / Scheduled Tasks
- `GET /api/cron/daily-sync` - Automated daily sync (Shopify, Etsy, Meta, Meta Country, P&L refresh, Email)
  - Runs automatically at 7:00 AM and 7:00 PM UTC via Vercel Cron
  - Syncs: Orders (Shopify/Etsy), Ad Spend (Meta), Country Ad Spend (Meta), P&L refresh
  - Sends email: Morning = yesterday's results, Evening = today so far
  - Query params: `type=morning|evening` (auto-detected if not provided)
  - Manual trigger: `Authorization: Bearer $CRON_SECRET` header required

### P&L Data
- `GET /api/pnl/data` - Fast P&L data fetch (bypasses RLS)
  - Query params: `from`, `to`, `brand`
  - Includes OPEX calculations in response
- `GET /api/pnl/country` - Country P&L breakdown (GP2 by shipping destination)
  - Query params: `from`, `to`, `brand`
  - Returns: countries array + summary statistics
- `POST /api/pnl/refresh` - Recalculate daily P&L records
  - Body: `{ "days": 90 }` or `{ "startDate": "2025-01-01", "endDate": "2025-01-25" }`
  - Defaults to last 90 days if no params provided

### Operating Expenses (OPEX)
- `GET /api/opex` - Fetch OPEX data and calculate totals
  - Query params: `from`, `to`, `brand`
  - Returns: summary (monthly totals by category), periodTotal, expenseCount

### Daily Summary Email
- `POST /api/email/daily-summary` - Send daily P&L summary email
  - Triggered automatically by 7am and 7pm cron jobs
  - Query params:
    - `type`: "morning" (yesterday's results) or "evening" (today so far)
    - `date` (YYYY-MM-DD) - optional override
    - `test` (if "true", logs only without sending)
  - Recipients: joel@displaychamp.com, lee@displaychamp.com
  - Requires: `RESEND_API_KEY` environment variable

### B2B Revenue
- `GET /api/b2b/import` - Get import format documentation
- `POST /api/b2b/import` - Bulk import B2B revenue by week

```json
// POST /api/b2b/import
{
  "brand_code": "DC",
  "customer_name": "Weekly B2B Sales",
  "entries": [
    { "year": 2025, "week": 15, "subtotal": 630, "notes": "Week 15 B2B" }
  ]
}
```

### Meta Ads
- `GET /api/meta/token` - Check token status and expiration
- `POST /api/meta/sync` - Sync ad spend from Meta

### Google Ads
- `GET /api/google/auth` - Start OAuth flow
- `GET /api/google/callback` - OAuth callback (returns refresh token)
- `POST /api/google/sync` - Sync ad spend from Google

### Calendar
- `POST /api/calendar/seed` - Import standard eCommerce events for a year

### Etsy OAuth
- `GET /api/etsy/auth?brand=DC|BI` - Get OAuth authorization URL
- `GET /api/etsy/callback` - OAuth callback (returns access/refresh tokens)

### Xero (Bank Balances)
- `GET /api/xero/auth?brand=DC|BI` - Start Xero OAuth flow
- `GET /api/xero/callback` - OAuth callback (stores tokens in database)
- `GET /api/xero/balances?brand=all|DC|BI` - Fetch bank balances from Xero

```json
// Response from /api/xero/balances
{
  "success": true,
  "balances": [
    {
      "brand": "DC",
      "brandName": "Display Champ",
      "accountName": "Monzo Business",
      "accountType": "BANK",
      "balance": 12450.00,
      "currency": "GBP"
    },
    {
      "brand": "SHARED",
      "brandName": "Shared",
      "accountName": "Amex Gold",
      "accountType": "CREDITCARD",
      "balance": -2150.00,
      "currency": "GBP"
    }
  ],
  "totals": {
    "totalCash": 20770.00,
    "totalCredit": -2150.00,
    "netPosition": 18620.00
  },
  "lastUpdated": "2026-01-27T12:45:00Z"
}

### Order Sync (Shopify/Etsy)
- `GET /api/shopify/sync` - Check Shopify connection status
- `POST /api/shopify/sync` - Sync orders from Shopify
- `GET /api/etsy/sync` - Check Etsy connection status
- `POST /api/etsy/sync` - Sync orders from Etsy
- `GET /api/orders/sync` - Check all platform connection status
- `POST /api/orders/sync` - Sync orders from all platforms

```json
// POST /api/shopify/sync or /api/etsy/sync or /api/orders/sync
{
  "startDate": "2025-01-01",  // Optional, defaults to 30 days ago
  "endDate": "2025-01-24",    // Optional, defaults to today
  "brandCode": "DC | BI | all" // Optional, defaults to all
}

// Additional for /api/orders/sync
{
  "platforms": ["shopify", "etsy"] // Optional, defaults to all platforms
}
```

### ShipStation (Shipment Sync)
- `GET /api/shipstation/sync` - Check ShipStation connection status
- `POST /api/shipstation/sync` - Sync shipments from ShipStation

```json
// POST /api/shipstation/sync
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "carrierCode": "deutsche_post_cross_border",  // Optional
  "updateExisting": true
}

// Response
{
  "success": true,
  "message": "Synced 570 shipments (3 created, 466 updated)",
  "results": {
    "matched": 570,
    "created": 3,
    "updated": 466,
    "notFound": 3,
    "errors": 0,
    "carrierStats": { "royalmail": 466, "deutschepost": 103, "dhl": 4 }
  }
}
```

### Invoice Processing
- `POST /api/invoices/analyze` - Analyze carrier invoice CSV before processing
- `POST /api/invoices/process` - Process analyzed invoice records
- `GET /api/invoices/royalmail` - Get Royal Mail processor documentation
- `POST /api/invoices/royalmail` - Process Royal Mail CSV and allocate costs
  ```json
  {
    "csvContent": "...",
    "dryRun": false,
    "applyAverageToOld": true,
    "minDaysForAverage": 14
  }
  ```

### Unmatched Invoices
- `GET /api/invoices/unmatched` - List unmatched invoice records
  - Query: `status`, `carrier`, `limit`, `offset`
- `PATCH /api/invoices/unmatched` - Update record status (match, void, resolve)
  - When matching to order: checks if shipment exists, updates it or creates new one
  - Supports multiple shipments per order (split shipments, different carriers)
- `POST /api/invoices/unmatched` - Batch operations
  - `action: 'dedupe'` - Remove duplicate records (same tracking + invoice + cost)
  - `action: 'auto-resolve'` - Auto-resolve records where shipment already exists and is linked to an order
- `DELETE /api/invoices/unmatched?id=uuid` - Delete a record

### Shipments
- `GET /api/shipments` - List shipments with optional filters
  - Query params:
    - `unlinked=true` - Only return shipments without an order_id (for linking to B2B orders)
    - `carrier` - Filter by carrier (dhl, royalmail, deutschepost)
    - `search` - Search by tracking number
    - `limit`, `offset` - Pagination
  - Used by Xero invoice approval to find tracking numbers across all carriers

---

## Database Migration

Run migrations in order via Supabase SQL editor:
1. `supabase/migrations/002_pnl_schema.sql` - Core tables
2. `supabase/migrations/003_enhanced_metrics.sql` - Enhanced metrics (optional)
3. `supabase/migrations/004_add_user_roles_index.sql` - Performance index (recommended)

---

## Deployment

### Production
- **GitHub:** https://github.com/joelgarthwaite/valhalla-daily-pnl
- **Hosting:** Vercel Pro (auto-deploys on push to `main`)
- **URL:** https://pnl.displaychamp.com
- **Plan:** Pro (required for 120s function timeouts and reliable cron execution)

### Auto-Deploy Workflow
```bash
# Make changes, then:
git add .
git commit -m "Description of changes"
git push
# Vercel auto-builds and deploys within ~2 minutes
```

### User Accounts
| Email | Password | Role |
|-------|----------|------|
| joel@displaychamp.com | Valhalla | Admin |
| lee@brightivy.com | Valhalla | User |

### Supabase Auth Configuration
In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `https://pnl.displaychamp.com`
- **Redirect URLs:** `https://pnl.displaychamp.com/**`

This ensures password reset and auth emails redirect to production (not localhost).

### Environment Variables (Vercel)
All variables from `.env.local` must be added to Vercel Dashboard → Project Settings → Environment Variables.

**Important:** Token management:
- Meta: ~60 days (exchange via `/api/meta/token`)
- Google: Refresh token is long-lived, but monitor for revocation
- Xero: Tokens auto-refresh when fetching balances (stored in database)

---

## Date Selection Features

### Selection Modes
The dashboard supports three date selection modes:
- **Date** - Single date selection
- **Range** - Custom date range with calendar
- **Week** - ISO week picker (Week 1-52)

### Week Numbering
Uses ISO week numbering for consistency with spreadsheets:
- Week starts on Monday
- Week 1 = First week with Thursday in the new year
- Year boundaries handled correctly

### Quick Presets
- Today, Yesterday
- This Week, Last Week
- This Month, Last Month
- Last 30 Days, Last 90 Days
- Year to Date (YTD)
- **All Time** - From Jan 1, 2024 to today (full historical data)

### Year-over-Year (YoY) Comparison

Enable the "Compare YoY" toggle to see current period vs same period last year.

**How it works:**
- API fetches both current and previous year data in parallel
- Periods are aligned by week/month/day number (W5 2026 vs W5 2025)
- Charts show solid lines for current year, dashed lines for previous year

**Visual indicators:**
- Legend shows year labels (e.g., "2025 Total", "2024 Total")
- Subtitle explains comparison (e.g., "Comparing 2025 (solid) vs 2024 (dashed)")
- KPI cards show YoY percentage changes
- Tooltips display both years with change percentages

**Chart features with YoY:**
| Chart | Current Year | Previous Year |
|-------|--------------|---------------|
| Revenue by Channel | Solid lines/bars | Dashed gray line |
| Revenue vs Ad Spend | Solid blue line | Dashed gray line |
| Orders by Channel | Stacked bars | Dashed gray line |

**Trend Lines:**
Each chart has a "Trend Line" checkbox that adds a linear regression line showing the overall trend direction.

---

## Revenue Reconciliation

### Purpose
Compare P&L system data against external spreadsheet to identify discrepancies.

### Location
Admin > Reconciliation (`/admin/reconciliation`)

### Features
- Year selector (2024-2026)
- Discrepancy threshold filter (1%, 5%, 10%, 15%)
- Toggle to show discrepancies only
- Summary cards (Expected, Actual, Variance)
- Channel breakdowns (Shopify, Etsy, B2B)
- Week-by-week comparison table
- CSV export

### Expected Data
Update `EXPECTED_2025_DATA` in `src/lib/pnl/reconciliation.ts` with actual CSV values.

---

## Country Analysis

### Purpose
Analyze P&L metrics by customer shipping destination. Shows GP2 and GP3 (when ad spend data is available).

### Location
Dashboard header → Country Analysis button (`/country`)

### Features
- **Summary Cards**: Total countries, top country by revenue, domestic %, top GP2 margin
- **Revenue Chart**: Horizontal bar chart showing top 10 countries with "Others" aggregation
- **Country Table**: Full P&L breakdown with sortable columns and expandable platform details
- **GP3 with Ad Spend**: When Meta country ad spend data is synced, shows Ad Spend, GP3, and GP3% columns
- Filter by brand and date range with quick presets (URL-persisted)

### Metrics Shown (per country)
| Metric | Definition |
|--------|------------|
| Revenue | Product revenue (subtotals) from that country |
| Orders | Total order count |
| AOV | Average Order Value (Revenue / Orders) |
| COGS | Cost of Goods (30% of revenue) |
| GP1 | Gross Profit 1 (Revenue - COGS) |
| Platform Fees | Shopify (2.9% + 30p) + Etsy (6.5%) |
| Pick & Pack | 5% of revenue |
| Logistics | 3% of revenue |
| GP2 | Gross Profit 2 (GP1 - Fees - Pick/Pack - Logistics) |
| GP2 % | GP2 margin as percentage of revenue |
| Ad Spend | Meta ad spend by country (where ad was shown) |
| GP3 | Gross Profit 3 (GP2 - Ad Spend) |
| GP3 % | GP3 margin as percentage of revenue |

### Country Ad Spend Data
Meta's `breakdowns=country` parameter provides ad spend by country where the ad was **delivered** (shown to user). This may differ from shipping destination but provides useful market-level attribution.

**Sync**: Runs automatically in daily cron job, or manually via:
```
POST /api/meta/country-sync
Body: { "brandCode": "all", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }
```

**Check status**:
```
GET /api/meta/country-sync
```

### API Endpoint
```
GET /api/pnl/country?from=YYYY-MM-DD&to=YYYY-MM-DD&brand=all|DC|BI
```

Returns:
- `countries[]` - Array of country P&L data sorted by revenue (includes GP3 when ad data exists)
- `summary` - Aggregate statistics (total countries, domestic/international split, etc.)
- `hasAdSpendData` - Boolean indicating if country ad spend is available

### Data Sources
- **Orders**: `orders` table using `shipping_address.country_code`
- **Ad Spend**: `country_ad_spend` table (synced from Meta API)

---

## Investor Metrics

### Purpose
M&A data room dashboard with key metrics investors want during due diligence. Provides TTM (Trailing 12 Months) performance metrics and unit economics.

### Location
Finance > Investor Metrics (`/finance/investor`)

### Time Period Filters
| Filter | Description |
|--------|-------------|
| **All Time** | Data from first sale to present |
| **TTM** | Trailing 12 months (last 12 months) |
| **YTD** | Year to date (Jan 1 of current year to now) |
| **Year** | Specific year selection dropdown |

**Note:** Headline KPIs (TTM Revenue, Gross Margin, LTV:CAC, etc.) are ALWAYS calculated from TTM regardless of filter selection - this is the industry standard for M&A metrics. The filter only affects charts, tables, and cohort analysis.

### Headline Metrics (Always TTM)
| Metric | Definition |
|--------|------------|
| TTM Revenue | Total revenue over last 12 months |
| Annual Run Rate | Annualized revenue based on last 3 months |
| Gross Margin | GP1 / Revenue (target: >60%) |
| Net Margin | True Net Profit / Revenue (target: >10%) |

### Customer Metrics (All Time)
| Metric | Definition |
|--------|------------|
| Total Customers | Unique customers who have ordered |
| Repeat Rate | % of customers with 2+ orders |
| LTV | Average lifetime value per customer |
| CAC | Customer Acquisition Cost (Ad Spend / New Customers) |
| LTV:CAC | Ratio of LTV to CAC (target: >3x) |

### Marketing Efficiency (TTM)
| Metric | Definition |
|--------|------------|
| TTM Ad Spend | Total marketing investment over 12 months |
| MER | Marketing Efficiency Ratio (Revenue / Ad Spend) |
| CAC Payback | Months to recover acquisition cost |

### Charts & Tables
- **Revenue & Profit Trend**: Monthly bar/line chart showing Revenue, GP3, True Net Profit
- **Margin Trend**: Monthly line chart showing Gross Margin and Net Margin %
- **Customer Acquisition**: Stacked bar chart showing New vs Repeat customers per month
- **Monthly Performance Table**: Detailed breakdown with MoM/YoY growth, AOV, margins
- **Cohort Analysis**: Customer behavior by acquisition month (orders/customer, revenue/customer)

### Data Sources
- Revenue/Orders: `daily_pnl` table (excludes excluded orders)
- Customer data: `orders` table with customer email extraction
- Ad Spend: `daily_pnl.total_ad_spend`
- OPEX: `operating_expenses` table

### API Endpoint
```
GET /api/investor/metrics?brand=all|DC|BI&period=all|ttm|ytd|year&year=2025
```

Returns:
- Headline metrics (always TTM)
- `monthlyMetrics[]` - Filtered monthly P&L data
- `cohorts[]` - Customer cohort analysis
- `availableYears` - Years with data for dropdown
- `filterStartDate`, `filterEndDate`, `monthsInFilter` - Current filter info

### Order Exclusions
Excluded orders (test orders, etc.) are automatically filtered out from all investor metrics calculations via the `excluded_at IS NULL` filter.

---

## Order Exclusions

### Purpose
Permanently exclude test orders, duplicates, or internal orders from P&L calculations. Excluded orders are **100% removed from all calculations**.

### What Gets Excluded
Excluded orders are filtered out from:
| Location | What it affects |
|----------|-----------------|
| `/api/pnl/refresh` | Main P&L calculations (daily_pnl table) |
| `/api/pnl/country` | Country Analysis page |
| `/api/orders` | Orders list API |
| `/admin/reconciliation` | Reconciliation page |
| `/api/shopify/sync` | Skipped during re-sync |
| `/api/etsy/sync` | Skipped during re-sync |

**Important:** After excluding an order, run "Sync & Update" to refresh P&L calculations and remove the order's revenue from totals.

### How It Works
- Orders can be excluded via the Orders admin page (`/admin/orders`)
- Exclusions are stored in two places:
  - `orders.excluded_at` - Timestamp when order was excluded
  - `excluded_orders` table - Permanent record by `platform + platform_order_id`
- The sync process checks `excluded_orders` table and skips matching platform_order_ids
- Exclusions can be reversed via the "Restore" button

### Location
Admin > Orders (`/admin/orders`)

### Features
- **Sortable Columns**: Click column headers to sort (Date, Order #, Customer, Country, Brand, Platform, Amount, B2B)
- **Status Filter**: Toggle between "Active Only", "Excluded Only", or "All Orders"
- **Exclude Button**: Click to exclude an order with a reason
- **Restore Button**: Click to restore an excluded order
- **Reason Tracking**: Records why each order was excluded

### API Endpoints
- `POST /api/orders/exclude` - Exclude an order
  ```json
  { "orderId": "uuid", "reason": "Test order" }
  ```
- `DELETE /api/orders/exclude` - Restore an excluded order
  ```json
  { "platform": "shopify", "platformOrderId": "123456" }
  ```
- `GET /api/orders/exclude` - List all excluded orders

### Database Schema
```sql
-- Added to orders table
excluded_at TIMESTAMPTZ;
exclusion_reason TEXT;

-- Separate table for sync blocking
excluded_orders (
  platform VARCHAR(50),
  platform_order_id TEXT,
  exclusion_reason TEXT,
  excluded_at TIMESTAMPTZ,
  UNIQUE(platform, platform_order_id)
);
```

---

## Unmatched Invoice Records

When carrier invoices are uploaded, any line items that can't be matched to existing orders/shipments are captured in a reconciliation queue for manual review.

### Purpose
- Identify wasted/unused shipping labels
- Catch overpayments or billing errors
- Reconcile batch shipments (e.g., GlobalMail)
- Ensure all shipping costs are properly allocated

### Location
Shipping > Unmatched button (`/shipping/unmatched`)

### Status Workflow

| Status | Meaning |
|--------|---------|
| `pending` | Needs review - no matching order found |
| `matched` | Manually linked to an order (creates shipment) |
| `voided` | Wasted label / cancelled shipment |
| `resolved` | Investigated and closed (with notes) |

### Features
- **Summary Cards**: Count by status (Pending, Voided, Matched, Resolved)
- **Records Table**: All unmatched invoice line items with details
- **Actions**: Link to Order, Mark as Voided, Mark as Resolved, Delete
- **Badge on Shipping Page**: Shows pending count for visibility
- **Typeahead Order Search**: Link to Order dialog has typeahead search by customer name or order number

### Link to Order Dialog

The "Link to Order" action opens a dialog with typeahead search:

| Feature | Description |
|---------|-------------|
| **Debounced Search** | 300ms delay, triggers after 2+ characters |
| **Search Fields** | Order number, customer name, B2B customer name, email, address |
| **Results Dropdown** | Shows order #, amount, customer, platform, date |
| **Selection Display** | Green card showing selected order with "Change" button |
| **Confirm Button** | Only enabled when an order is selected |

### API Endpoints
- `GET /api/invoices/unmatched` - List unmatched records
  - Query params: `status` (pending/matched/voided/resolved/all), `carrier`, `limit`, `offset`
- `PATCH /api/invoices/unmatched` - Update record status
  ```json
  {
    "id": "uuid",
    "status": "voided",
    "resolution_notes": "Customer cancelled before shipping"
  }
  ```
- `DELETE /api/invoices/unmatched?id=uuid` - Delete a record

### Database Schema
```sql
unmatched_invoice_records (
  id UUID PRIMARY KEY,
  tracking_number TEXT NOT NULL,
  carrier VARCHAR(50) NOT NULL,
  shipping_cost DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  service_type TEXT,
  weight_kg DECIMAL(10, 3),
  shipping_date DATE,
  invoice_number TEXT,
  file_name TEXT,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, matched, voided, resolved
  resolution_notes TEXT,
  matched_order_id UUID,
  matched_shipment_id UUID,
  created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  raw_data JSONB,
  UNIQUE(tracking_number, invoice_number)
);
```

---

## SKU Mapping (Inventory)

### Purpose
Map legacy/old SKUs to current canonical SKUs for accurate inventory forecasting. When products are renamed, repackaged, or SKU codes change, historical sales data needs to be consolidated under the current SKU for demand forecasting.

### Location
Inventory > SKU Mapping (`/inventory/sku-mapping`)

### Features

| Feature | Description |
|---------|-------------|
| **SKU Discovery** | Automatically discovers all SKUs from order history across Shopify & Etsy |
| **Variant Grouping** | Groups P-suffix and -BALL variants with base SKUs (toggle "Hide variants") |
| **AI Suggestions** | Click "Get Suggestions" for AI-powered mapping recommendations |
| **Bulk Mapping** | Select multiple SKUs with checkboxes, choose target, create mappings in bulk |
| **Unmapped Filter** | Filter to show only unmapped SKUs for easy cleanup |
| **Platform/Brand Filters** | Filter by Shopify/Etsy and Display Champ/Bright Ivy |
| **Grouped Saved Mappings** | Saved mappings grouped by target SKU - shows when multiple SKUs map to same master |
| **Scroll Indicator** | Visual indicator when more mappings available to scroll |

### How Mapping Works

1. **Select SKUs** - Use checkboxes to select 2+ SKUs you want to consolidate
2. **Map Selected** - Click "Map Selected" button in the sticky toolbar
3. **Choose Target** - In the dialog, select which SKU is the canonical (current) one
4. **Create Mappings** - All other selected SKUs are mapped → target SKU

### Variant Handling

When "Hide variants" is enabled:
- SKUs are grouped by base name (removes P suffix and -BALL suffix)
- Order counts are aggregated across all variants
- Hover over "X grouped" badge to see individual variant SKUs
- Mapping checks all underlying variants (not just displayed base SKU)

### SKU Types

| Badge | Meaning |
|-------|---------|
| `P` | Has P suffix variant (e.g., GBCPRESTIGEOAKP) |
| `BALL` | Ball case variant (e.g., GBCPRESTIGEOAK-BALL) |
| `+variants` | Base SKU that has P or BALL variants |
| `X grouped` | Aggregated group when "Hide variants" is on |

### Saved Mappings Display

Saved mappings are grouped by their target (master) SKU to clearly show relationships:

```
Target: GBCHERITAGEMAH    [5 SKUs mapped here]
├─ GBCMWB →
├─ GBCMWBP →
├─ GBCHERITAGEAFZ →
├─ GBCHERITAGEMAHP →
└─ GBCHERITAGE →

Target: GBDSICON
└─ GBSICON →
```

- Groups sorted by size (largest first)
- Badge shows count when multiple SKUs map to same target
- Scroll indicator appears when more groups available
- Delete buttons appear on hover

### Exclusions

Non-display-case products are automatically excluded from SKU discovery:
- Keywords filtered to focus on display cases and relevant accessories
- Both DC (sports memorabilia) and BI (keepsakes) products are included

### API Endpoints

- `GET /api/inventory/sku-discovery` - Discover SKUs from order history
  - Query params: `brand` (all/DC/BI), `limit`
  - Returns: SKUs with order counts, platforms, brands, date ranges

- `GET /api/inventory/sku-mapping` - List all saved mappings
  - Query params: `platform` (all/shopify/etsy)

- `POST /api/inventory/sku-mapping` - Create a new mapping
  ```json
  {
    "oldSku": "LEGACYSKU123",
    "currentSku": "CURRENTSKU123",
    "platform": "shopify",  // optional
    "notes": "Renamed in 2024"
  }
  ```

- `DELETE /api/inventory/sku-mapping?id=uuid` - Delete a mapping

### Database Schema

```sql
sku_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_sku TEXT NOT NULL,           -- Legacy SKU to map FROM
  current_sku TEXT NOT NULL,       -- Current SKU to map TO
  brand_id UUID REFERENCES brands(id),  -- Optional brand filter
  platform TEXT,                   -- Optional: shopify, etsy, or NULL for all
  notes TEXT,                      -- Why this mapping exists
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sku_mapping_old_sku ON sku_mapping(old_sku);
CREATE INDEX idx_sku_mapping_current_sku ON sku_mapping(current_sku);
```

### RLS Policies
- **View**: All authenticated users can view mappings
- **Manage**: Only admins can create/update/delete mappings

### Files

| File | Purpose |
|------|---------|
| `src/app/(hub)/inventory/sku-mapping/page.tsx` | Main SKU mapping page |
| `src/app/api/inventory/sku-mapping/route.ts` | CRUD API for mappings |
| `src/app/api/inventory/sku-discovery/route.ts` | SKU discovery from orders |
| `src/app/api/inventory/sku-suggestions/route.ts` | AI-powered suggestions |
| `src/lib/inventory/sku-utils.ts` | SKU parsing utilities (getBaseSku, isVariantSku, etc.) |
| `supabase/migrations/014_sku_mapping.sql` | Database migration |

---

## Inventory Management (Phase A)

### Overview

A demand forecasting and inventory management system for tracking component stock levels, managing Bill of Materials (BOM), and triggering reorder alerts.

### Current Features (Phase A)

| Feature | Status | Description |
|---------|--------|-------------|
| **Components CRUD** | ✅ Complete | Create/edit/delete components with categories, materials, variants |
| **Stock Dashboard** | ✅ Complete | View stock levels with status badges (OK, Warning, Critical, Out of Stock) |
| **Stock Adjustments** | ✅ Complete | Manual stock count, add, and remove with audit trail |
| **Basic Forecasting** | ✅ Complete | Status calculation based on available stock (velocity TBD with BOM) |

### Future Phases

| Phase | Features |
|-------|----------|
| **Phase B** | Suppliers CRUD, BOM editor, velocity calculation from orders |
| **Phase C** | Purchase orders workflow, receiving stock |
| **Phase D** | Email alerts for low stock, reorder notifications |

### Navigation

| Page | Path | Description |
|------|------|-------------|
| Stock Levels | `/inventory` | Main dashboard showing all component stock status |
| Components | `/inventory/components` | CRUD for managing components |
| SKU Mapping | `/inventory/sku-mapping` | Map old SKUs to current SKUs |

### Stock Status Logic

```
days_remaining = available / daily_velocity

if available <= 0:
    status = OUT_OF_STOCK
elif days_remaining <= lead_time + safety_days:
    status = CRITICAL
elif days_remaining <= lead_time + safety_days + 7:
    status = WARNING
else:
    status = OK
```

### API Endpoints

**Components:**
- `GET /api/inventory/components` - List components with filtering
- `POST /api/inventory/components` - Create new component
- `GET /api/inventory/components/[id]` - Get single component
- `PATCH /api/inventory/components/[id]` - Update component
- `DELETE /api/inventory/components/[id]` - Delete component

**Stock:**
- `GET /api/inventory/stock` - List stock levels with status
- `POST /api/inventory/stock/adjust` - Adjust stock (count, add, remove)
- `GET /api/inventory/stock/adjust?component_id=uuid` - Transaction history

### Database Tables

```sql
-- Core tables created in 015_inventory_schema.sql
component_categories   -- cases, bases, accessories, packaging, display_accessories
components            -- Component master data
suppliers             -- Supplier info (future use)
component_suppliers   -- Component-supplier relationships (future use)
bom                   -- Bill of Materials (future use)
stock_levels          -- Current inventory levels
stock_transactions    -- Audit trail of movements
purchase_orders       -- PO headers (future use)
purchase_order_items  -- PO line items (future use)
inventory_notification_prefs  -- User alert settings (future use)
```

### Files

| File | Purpose |
|------|---------|
| `src/app/(hub)/inventory/page.tsx` | Stock levels dashboard |
| `src/app/(hub)/inventory/components/page.tsx` | Components CRUD page |
| `src/app/api/inventory/components/route.ts` | Components list/create API |
| `src/app/api/inventory/components/[id]/route.ts` | Component get/update/delete API |
| `src/app/api/inventory/stock/route.ts` | Stock levels API |
| `src/app/api/inventory/stock/adjust/route.ts` | Stock adjustment API |
| `src/lib/inventory/forecast.ts` | Velocity and status calculations |
| `supabase/migrations/015_inventory_schema.sql` | Database migration |

---

## Related Projects

- **Valhalla Dashboard** - Order management and shipping analytics (separate deployment)
