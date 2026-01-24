# Valhalla Daily P&L

## Project Overview

A Lifetimely-style Daily P&L Dashboard for **Display Champ** and **Bright Ivy** brands. This is a standalone Next.js project deployed on Vercel, connecting to the existing Supabase database used by the Valhalla Dashboard.

**Project Location:** `/valhalla-daily-pnl/`

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

**Migrations:**
- `supabase/migrations/002_pnl_schema.sql` - Core P&L tables
- `supabase/migrations/003_enhanced_metrics.sql` - GP1/GP2/GP3, refunds, enhanced metrics

---

## Brands

| Brand | Code | Status |
|-------|------|--------|
| Display Champ | DC | Active, stores connected |
| Bright Ivy | BI | In database (Google Ads suspended) |

---

## Ad Platform Integrations

### Meta (Facebook/Instagram) - ACTIVE
- **Status:** Connected and syncing
- **Token Expires:** ~60 days from generation
- **Ad Accounts:**
  - Display Champ: `act_892968716290721`
  - Bright Ivy: `act_3210136152487456`
- **Data Synced:** Daily spend, impressions, clicks, conversions, purchase value (revenue attributed)

### Google Ads - PENDING APPROVAL
- **Status:** Awaiting Basic Access approval (Explorer mode)
- **Manager Account:** `154-614-8084`
- **Customer IDs:**
  - Display Champ: `281-641-2476`
- **Data to Sync:** Daily spend, impressions, clicks, conversions, conversion value

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

### Profit Tiers (GP1 → GP2 → GP3)

```
GP1 = Net Revenue - COGS
      (Gross profit after cost of goods)

GP2 = GP1 - Pick&Pack - Payment Fees - Logistics
      (Operating profit after fulfillment costs)

GP3 = GP2 - Ad Spend
      (True Profit / Marketing Contribution - THE BOTTOM LINE)
```

### Key Metrics

| Metric | Formula | Notes |
|--------|---------|-------|
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

---

## Project Structure

```
valhalla-daily-pnl/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main dashboard
│   │   ├── detailed/page.tsx           # Detailed P&L view
│   │   ├── login/page.tsx              # Login page
│   │   ├── admin/                      # Admin pages
│   │   │   ├── sync/page.tsx           # Order sync from Shopify/Etsy
│   │   │   ├── ad-spend/page.tsx       # Ad spend with Meta/Google sync
│   │   │   ├── b2b-revenue/page.tsx    # B2B revenue entry
│   │   │   ├── events/page.tsx         # Calendar events
│   │   │   ├── goals/page.tsx          # Quarterly goals
│   │   │   ├── promotions/page.tsx     # Promotions
│   │   │   └── reconciliation/page.tsx # Revenue reconciliation vs spreadsheet
│   │   ├── api/
│   │   │   ├── pnl/refresh/route.ts    # Refresh P&L calculations
│   │   │   ├── calendar/seed/route.ts  # Import standard events
│   │   │   ├── b2b/import/route.ts     # Bulk import B2B revenue
│   │   │   ├── meta/                   # Meta API integration
│   │   │   │   ├── sync/route.ts       # Sync ad spend from Meta
│   │   │   │   └── token/route.ts      # Token status & exchange
│   │   │   ├── google/                 # Google Ads integration
│   │   │   │   ├── auth/route.ts       # OAuth initiation
│   │   │   │   ├── callback/route.ts   # OAuth callback
│   │   │   │   └── sync/route.ts       # Sync ad spend from Google
│   │   │   ├── shopify/                # Shopify order sync
│   │   │   │   └── sync/route.ts       # Sync orders from Shopify
│   │   │   ├── etsy/                   # Etsy order sync
│   │   │   │   └── sync/route.ts       # Sync orders from Etsy
│   │   │   └── orders/                 # Combined order sync
│   │   │       └── sync/route.ts       # Sync from all platforms
│   │   └── layout.tsx                  # Root layout
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components
│   │   ├── dashboard/                  # Dashboard components
│   │   │   ├── DashboardFilters.tsx    # Date/brand filters with mode toggle
│   │   │   ├── WeekPicker.tsx          # ISO week selection component
│   │   │   ├── KPIGrid.tsx             # KPI cards with tooltips
│   │   │   ├── HeroKPIGrid.tsx         # Hero metrics display
│   │   │   ├── PnLTable.tsx            # P&L data table
│   │   │   └── AlertBanner.tsx         # Status alerts
│   │   ├── charts/                     # Recharts components
│   │   └── forms/                      # Form components
│   ├── hooks/
│   │   └── usePnLData.ts               # P&L data fetching hook
│   ├── lib/
│   │   ├── supabase/                   # Supabase client config
│   │   ├── pnl/                        # P&L calculation engine
│   │   │   ├── calculations.ts         # GP1/GP2/GP3, POAS, MER, AOV
│   │   │   ├── aggregations.ts         # Time period rollups
│   │   │   ├── targets.ts              # Target calculations
│   │   │   └── reconciliation.ts       # Expected vs actual comparison
│   │   ├── meta/                       # Meta Marketing API
│   │   │   └── client.ts               # Fetch ad spend, token management
│   │   ├── google/                     # Google Ads API
│   │   │   └── client.ts               # OAuth, fetch ad spend
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
│       └── 003_enhanced_metrics.sql    # Enhanced metrics columns
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

## API Endpoints

### P&L
- `POST /api/pnl/refresh` - Recalculate all daily P&L records

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

---

## Database Migration

Run migrations in order via Supabase SQL editor:
1. `supabase/migrations/002_pnl_schema.sql` - Core tables
2. `supabase/migrations/003_enhanced_metrics.sql` - Enhanced metrics (optional)

---

## Deployment

Deploy to Vercel as a separate project from Valhalla Dashboard. Set all environment variables in Vercel dashboard.

**Important:** Meta and Google tokens need periodic refresh:
- Meta: ~60 days (exchange via `/api/meta/token`)
- Google: Refresh token is long-lived, but monitor for revocation

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

## Related Projects

- **Valhalla Dashboard** - Order management and shipping analytics (separate deployment)
