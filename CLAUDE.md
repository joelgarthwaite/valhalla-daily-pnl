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
- `operating_expenses` - OPEX tracking (staff, premises, software, overheads)
- `etsy_fees` - Actual Etsy fees from Payment Ledger API
- `xero_connections` - Xero OAuth tokens for bank balance fetching
- `country_ad_spend` - Ad spend by country from Meta API (for GP3 in Country Analysis)
- `excluded_orders` - Permanently excluded orders (prevents re-sync)

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

Vercel cron jobs run twice daily at **5:00 AM** and **6:00 PM UTC** to automatically sync all data:

1. Syncs Shopify orders (last 7 days)
2. Syncs Etsy orders (last 7 days)
3. Syncs Meta ad spend (last 7 days)
4. Refreshes P&L calculations
5. **Sends daily P&L summary email** (6pm sync only)

**Schedule:**
| Time (UTC) | Time (UK) | Email |
|------------|-----------|-------|
| 05:00 | 5:00 AM | No |
| 18:00 | 6:00 PM | Yes |

**Configuration:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 18 * * *"
    }
  ]
}
```

**Manual Trigger:**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://pnl.displaychamp.com/api/cron/daily-sync
```

**Environment Variable:** `CRON_SECRET` - Required for manual triggering (Vercel cron calls are authenticated automatically)

### Daily P&L Summary Email

At 6pm each day, an automated email is sent to key stakeholders with:

**Email Contents:**
- Profitability status (profitable or not)
- True Net Profit amount and comparison vs yesterday
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
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://pnl.displaychamp.com/api/email/daily-summary

# Test mode (doesn't send, just returns data)
curl "https://pnl.displaychamp.com/api/email/daily-summary?test=true"
```

---

## API Endpoints

### Cron / Scheduled Tasks
- `GET /api/cron/daily-sync` - Automated daily sync (Shopify, Etsy, Meta, Meta Country, P&L refresh)
  - Runs automatically at 5:00 AM and 6:00 PM UTC via Vercel Cron
  - Syncs: Orders (Shopify/Etsy), Ad Spend (Meta), Country Ad Spend (Meta), P&L refresh
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
  - Triggered automatically by 6pm cron job
  - Query params: `date` (YYYY-MM-DD), `test` (if "true", logs only)
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
- **Hosting:** Vercel (auto-deploys on push to `main`)
- **URL:** https://pnl.displaychamp.com

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

## Related Projects

- **Valhalla Dashboard** - Order management and shipping analytics (separate deployment)
