# Valhalla Hub - Systems Architecture Documentation

> **Developer Reference Document**
> Last Updated: January 2026
> Version: 1.0

This document provides comprehensive technical documentation for the Valhalla Hub platform, covering the P&L Dashboard, Shipping Dashboard, and EOS Framework. It serves as the authoritative reference for developers working on or integrating with these systems.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Inventory](#3-project-inventory)
4. [Database Architecture](#4-database-architecture)
5. [Data Flow Architecture](#5-data-flow-architecture)
6. [P&L Calculation Engine](#6-pnl-calculation-engine)
7. [External Integrations](#7-external-integrations)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [API Reference](#9-api-reference)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Cron Jobs & Automation](#11-cron-jobs--automation)
12. [Environment Variables](#12-environment-variables)
13. [Deployment & DevOps](#13-deployment--devops)
14. [Consolidation Roadmap](#14-consolidation-roadmap)

---

## 1. Platform Overview

### Vision

**Valhalla Hub** is a unified business intelligence platform for Display Champ and Bright Ivy e-commerce brands. It consolidates financial analytics, shipping operations, and strategic planning into a single dashboard at `valhalla.displaychamp.com`.

### Current State

The platform currently consists of three separate projects that share a common Supabase database:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VALHALLA HUB ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │   P&L DASHBOARD  │  │ SHIPPING DASHBOARD│  │  EOS FRAMEWORK   │      │
│  │                  │  │                  │  │                  │      │
│  │  Next.js 16      │  │  Next.js 16      │  │  Vanilla JS      │      │
│  │  pnl.display     │  │  valhalla-       │  │  GitHub Pages    │      │
│  │  champ.com       │  │  shipping-       │  │                  │      │
│  │                  │  │  report.vercel   │  │                  │      │
│  │  GP1→GP2→GP3     │  │  .app            │  │  Rocks, L10,     │      │
│  │  True Net Profit │  │                  │  │  Scorecard       │      │
│  │  OPEX, MER, POAS │  │  Carrier costs   │  │                  │      │
│  │                  │  │  Invoice upload  │  │                  │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│           │                     │                     │                │
│           └─────────────────────┼─────────────────────┘                │
│                                 │                                       │
│                    ┌────────────▼────────────┐                         │
│                    │   SHARED SUPABASE DB    │                         │
│                    │                         │                         │
│                    │  brands, stores, orders │                         │
│                    │  shipments, ad_spend    │                         │
│                    │  daily_pnl, opex, etc.  │                         │
│                    └─────────────────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Brands Supported

| Brand | Code | Shopify | Etsy | Status |
|-------|------|---------|------|--------|
| Display Champ | DC | display-champ.myshopify.com | DisplayChampUK | Active |
| Bright Ivy | BI | brightivy.myshopify.com | BrightIvyUK | Active |

---

## 2. Technology Stack

### Core Technologies

| Layer | P&L Dashboard | Shipping Dashboard | EOS Framework |
|-------|--------------|-------------------|---------------|
| **Framework** | Next.js 16 | Next.js 16 | Vanilla HTML/JS |
| **UI Library** | React 19 | React 19 | Native DOM |
| **Styling** | Tailwind 4 + shadcn/ui | Tailwind 4 + shadcn/ui | CSS Variables |
| **Charts** | Recharts 3.7 | Recharts 3.7 | - |
| **Database** | Supabase | Supabase | Supabase (optional) |
| **Auth** | Supabase Auth | Supabase Auth | Supabase Auth |
| **Deployment** | Vercel | Vercel | GitHub Pages |
| **Email** | Resend | - | - |

### Shared Dependencies

```json
{
  "@supabase/supabase-js": "^2.91",
  "@supabase/ssr": "^0.8",
  "recharts": "^3.7",
  "date-fns": "^4.1",
  "jspdf": "^2.x",
  "jspdf-autotable": "^3.x",
  "xlsx": "^0.18",
  "zod": "^4.3"
}
```

---

## 3. Project Inventory

### 3.1 P&L Dashboard (Primary)

**Location:** `/valhalla-daily-pnl/`
**Production URL:** https://pnl.displaychamp.com
**Repository:** github.com/joelgarthwaite/valhalla-daily-pnl

**Purpose:** Real-time Profit & Loss analysis with GP1→GP2→GP3→True Net Profit waterfall.

**Key Features:**
- Revenue tracking (Shopify, Etsy, B2B)
- Ad spend sync (Meta, Google)
- OPEX management with pro-rating
- Quarterly goals and targets
- Country P&L analysis
- Daily summary emails
- Cash position (Xero integration)

**Data Sources:**
- Shopify GraphQL API (orders)
- Etsy REST API v3 (receipts)
- Meta Marketing API (ad spend)
- Google Ads API (ad spend - pending)
- Xero API (bank balances)

### 3.2 Shipping Dashboard

**Location:** `/Bright Ivy Postage Project (Claude)/valhalla-dashboard/`
**Production URL:** https://valhalla-shipping-report.vercel.app
**Repository:** github.com/joelgarthwaite/valhalla-shipping-report

**Purpose:** Shipping cost analysis and carrier profitability tracking.

**Key Features:**
- Shipping revenue vs expenditure
- Carrier breakdown (DHL, Royal Mail)
- Multi-format invoice upload (CSV, Excel, PDF)
- Country/region analytics
- Order-level cost tracking
- Estimated vs actual cost confidence

**Data Sources:**
- Same Shopify/Etsy orders (shared DB)
- DHL invoices (uploaded)
- Royal Mail invoices (uploaded)
- Country average estimates

**Current Metrics:**
- 5,914 total orders
- £45,929 shipping charged
- £30,144 shipping costs
- 34.4% shipping margin

### 3.3 EOS Framework

**Location:** `/Valhalla Holdings EOS Framework/`
**Production URL:** https://joelgarthwaite.github.io/Valhalla-EOS-/
**Repository:** github.com/joelgarthwaite/Valhalla-EOS-

**Purpose:** Entrepreneurial Operating System (EOS) implementation for strategic planning.

**Key Features:**
- Quarterly Rocks tracking
- Weekly Scorecard metrics
- Level 10 meeting workflow
- Issues (IDS) list management
- To-do tracking
- Vision/Traction organizer
- Offline-first with optional Supabase sync

**Components:**
| Component | Purpose |
|-----------|---------|
| Dashboard | Overview stats, quick actions |
| Scorecard | 10 weekly KPIs with sparklines |
| Rocks | Quarterly goals with milestones |
| Issues | Prioritized IDS list (drag-and-drop) |
| To-Dos | Weekly commitments |
| Vision | 10-year, 3-year, 1-year plans |
| Meeting | Full L10 workflow with timer |

---

## 4. Database Architecture

### Supabase Instance

**Project URL:** `https://pbfaoshmaogrsgatfojs.supabase.co`

All three projects share this database instance, enabling unified data access.

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE SCHEMA                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐      ┌──────────┐      ┌──────────────┐                      │
│  │  brands  │──────│  stores  │──────│    orders    │                      │
│  │          │      │          │      │              │                      │
│  │ id       │      │ id       │      │ id           │                      │
│  │ name     │      │ brand_id │      │ store_id     │                      │
│  │ code     │      │ platform │      │ platform     │                      │
│  └────┬─────┘      │ oauth    │      │ subtotal     │                      │
│       │            │ last_sync│      │ shipping     │                      │
│       │            └──────────┘      │ refund_amt   │                      │
│       │                              │ is_b2b       │                      │
│       │                              │ excluded_at  │                      │
│       │                              └──────┬───────┘                      │
│       │                                     │                              │
│       │            ┌────────────────────────┼────────────────────┐         │
│       │            │                        │                    │         │
│       │            ▼                        ▼                    ▼         │
│       │     ┌──────────────┐        ┌─────────────┐      ┌────────────┐   │
│       │     │  shipments   │        │  daily_pnl  │      │ b2b_revenue│   │
│       │     │              │        │             │      │            │   │
│       │     │ order_id     │        │ date        │      │ date       │   │
│       │     │ carrier      │        │ brand_id    │      │ brand_id   │   │
│       │     │ shipping_cost│        │ gp1,gp2,gp3 │      │ subtotal   │   │
│       │     │ cost_type    │        │ revenue     │      │ customer   │   │
│       │     │ tracking_num │        │ ad_spend    │      └────────────┘   │
│       │     └──────────────┘        │ opex        │                       │
│       │                             └─────────────┘                       │
│       │                                                                    │
│       ├──────────────────────────────────────────────────────────────┐    │
│       │                                                              │    │
│       ▼                        ▼                        ▼            ▼    │
│  ┌──────────────┐      ┌─────────────────┐      ┌─────────────┐  ┌──────┐│
│  │   ad_spend   │      │operating_expenses│      │quarterly    │  │cost_ ││
│  │              │      │                 │      │_goals       │  │config││
│  │ date         │      │ brand_id        │      │             │  │      ││
│  │ platform     │      │ category        │      │ year        │  │cogs% ││
│  │ spend        │      │ amount          │      │ quarter     │  │p&p%  ││
│  │ revenue_attr │      │ frequency       │      │ target      │  │log%  ││
│  └──────────────┘      │ start_date      │      └─────────────┘  └──────┘│
│                        │ end_date        │                               │
│  ┌──────────────┐      └─────────────────┘      ┌─────────────────────┐  │
│  │country_ad_   │                               │   excluded_orders   │  │
│  │spend         │      ┌─────────────────┐      │                     │  │
│  │              │      │  user_roles     │      │ platform            │  │
│  │ date         │      │                 │      │ platform_order_id   │  │
│  │ country_code │      │ user_id         │      │ exclusion_reason    │  │
│  │ platform     │      │ role            │      └─────────────────────┘  │
│  │ spend        │      │ brand_access    │                               │
│  └──────────────┘      └─────────────────┘                               │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    ADDITIONAL P&L TABLES                             │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │ promotions, calendar_events, pnl_notes, etsy_fees, xero_connections │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    SHIPPING TABLES                                   │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │ carrier_accounts, upload_history, daily_metrics                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    EOS TABLES (PROPOSED)                             │ │
│  ├─────────────────────────────────────────────────────────────────────┤ │
│  │ eos_rocks, eos_scorecard, eos_scorecard_entries, eos_meetings,       │ │
│  │ eos_issues, eos_todos, eos_vision                                    │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Tables Reference

#### `orders` (Shared between P&L and Shipping)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `store_id` | UUID | FK to stores |
| `platform` | TEXT | 'shopify' or 'etsy' |
| `platform_order_id` | TEXT | Platform's order ID |
| `order_number` | TEXT | Display order number |
| `order_date` | DATE | Order creation date |
| `subtotal` | DECIMAL | **Product revenue only** (critical) |
| `shipping_charged` | DECIMAL | Customer shipping charge |
| `tax` | DECIMAL | Tax amount |
| `total` | DECIMAL | Full order total |
| `refund_amount` | DECIMAL | Refund value |
| `refund_status` | TEXT | 'none', 'partial', 'full' |
| `is_b2b` | BOOLEAN | B2B order flag |
| `b2b_customer_name` | TEXT | B2B customer |
| `excluded_at` | TIMESTAMP | Exclusion timestamp |
| `shipping_address` | JSONB | Address with `country_code` |
| `raw_data` | JSONB | Full API response |

**Critical:** `subtotal` must contain **product revenue only** (no shipping/tax) for accurate P&L calculations.

#### `daily_pnl` (Pre-aggregated P&L)

| Column | Type | Description |
|--------|------|-------------|
| `date` | DATE | P&L date |
| `brand_id` | UUID | FK to brands |
| `total_revenue` | DECIMAL | Product revenue |
| `net_revenue` | DECIMAL | Revenue - refunds |
| `shopify_revenue` | DECIMAL | Shopify component |
| `etsy_revenue` | DECIMAL | Etsy component |
| `b2b_revenue` | DECIMAL | B2B component |
| `total_refunds` | DECIMAL | Refund total |
| `cogs` | DECIMAL | Cost of goods sold |
| `gp1` | DECIMAL | Gross Profit 1 |
| `shopify_fees` | DECIMAL | Shopify platform fees |
| `etsy_fees` | DECIMAL | Etsy platform fees |
| `pick_pack` | DECIMAL | Pick & pack costs |
| `logistics` | DECIMAL | Logistics costs |
| `gp2` | DECIMAL | Gross Profit 2 |
| `total_ad_spend` | DECIMAL | All ad spend |
| `gp3` | DECIMAL | Gross Profit 3 |
| `total_opex` | DECIMAL | Operating expenses |
| `true_net_profit` | DECIMAL | **Bottom line** |
| `order_count` | INTEGER | Number of orders |

### Migrations Reference

| Migration | Purpose |
|-----------|---------|
| `002_pnl_schema.sql` | Core P&L tables |
| `003_enhanced_metrics.sql` | GP1/GP2/GP3 columns |
| `004_add_user_roles_index.sql` | Performance index |
| `005_etsy_fees.sql` | Etsy fee tracking |
| `006_fix_quarterly_goals_rls.sql` | RLS policy fixes |
| `007_operating_expenses.sql` | OPEX table |
| `008_xero_integration.sql` | Bank balance storage |
| `009_b2b_order_tagging.sql` | B2B order flags |
| `010_country_ad_spend.sql` | Country ad breakdown |
| `011_order_exclusions.sql` | Order exclusion system |

---

## 5. Data Flow Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL DATA SOURCES                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│   │ Shopify │  │  Etsy   │  │  Meta   │  │ Google  │  │  Xero   │     │
│   │ GraphQL │  │ REST v3 │  │ Mktg API│  │ Ads API │  │  API    │     │
│   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘     │
│        │            │            │            │            │           │
└────────┼────────────┼────────────┼────────────┼────────────┼───────────┘
         │            │            │            │            │
         ▼            ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SYNC LAYER (API Routes)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  /api/shopify/sync     /api/etsy/sync      /api/meta/sync              │
│  /api/google/sync      /api/xero/balances  /api/orders/sync            │
│                                                                         │
│  • Transform API responses to DB schema                                 │
│  • Upsert with UNIQUE constraints                                       │
│  • Skip excluded orders                                                 │
│  • Auto-refresh OAuth tokens                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE DATABASE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │   orders   │  │  ad_spend  │  │ shipments  │  │ b2b_revenue│        │
│  └─────┬──────┘  └─────┬──────┘  └────────────┘  └─────┬──────┘        │
│        │               │                               │               │
│        └───────────────┼───────────────────────────────┘               │
│                        ▼                                                │
│               ┌────────────────┐                                        │
│               │  P&L REFRESH   │   /api/pnl/refresh                    │
│               │                │                                        │
│               │ Aggregate by:  │                                        │
│               │ • Date         │                                        │
│               │ • Brand        │                                        │
│               │ • Platform     │                                        │
│               └───────┬────────┘                                        │
│                       │                                                 │
│                       ▼                                                 │
│               ┌────────────────┐                                        │
│               │   daily_pnl    │  Pre-aggregated metrics               │
│               └────────────────┘                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  /api/pnl/data ─────────────────▶ Dashboard (Hero KPIs, Charts, Table) │
│                                                                         │
│  /api/pnl/country ──────────────▶ Country Analysis (GP2 by destination)│
│                                                                         │
│  /api/opex ─────────────────────▶ OPEX Summary (monthly/category)      │
│                                                                         │
│  • Fast queries using service role (bypasses RLS)                       │
│  • Date-range filtering                                                 │
│  • Brand filtering                                                      │
│  • Period aggregation (daily/weekly/monthly)                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Order Sync Flow (Detailed)

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ORDER SYNC FLOW                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. TRIGGER                                                          │
│     ├── Manual: Admin clicks "Sync" on /admin/sync                   │
│     ├── Cron: 5:00 AM & 6:00 PM UTC via Vercel                       │
│     └── API: POST /api/orders/sync                                   │
│                                                                      │
│  2. SHOPIFY SYNC                                                     │
│     │                                                                │
│     ├── Query: GraphQL Admin API                                     │
│     │   query {                                                      │
│     │     orders(first: 50, query: "created_at:>2025-01-01") {       │
│     │       edges { node {                                           │
│     │         id, name, createdAt,                                   │
│     │         subtotalPriceSet { shopMoney { amount } },             │
│     │         totalShippingPriceSet { shopMoney { amount } },        │
│     │         totalTaxSet { shopMoney { amount } },                  │
│     │         refunds { totalRefundedSet { shopMoney { amount } } }, │
│     │         shippingAddress { countryCode }                        │
│     │       }}                                                       │
│     │     }                                                          │
│     │   }                                                            │
│     │                                                                │
│     ├── Transform:                                                   │
│     │   {                                                            │
│     │     subtotal: subtotalPriceSet.shopMoney.amount,  // CRITICAL  │
│     │     shipping_charged: totalShippingPriceSet...,                │
│     │     tax: totalTaxSet...,                                       │
│     │     refund_amount: sum(refunds.totalRefundedSet...)            │
│     │   }                                                            │
│     │                                                                │
│     └── Upsert: ON CONFLICT (platform, platform_order_id)            │
│                                                                      │
│  3. ETSY SYNC                                                        │
│     │                                                                │
│     ├── Query: GET /v3/application/shops/{shop_id}/receipts          │
│     │                                                                │
│     ├── Transform:                                                   │
│     │   {                                                            │
│     │     subtotal: receipt.subtotal OR receipt.total_price, //CRITICAL│
│     │     shipping_charged: receipt.total_shipping_cost,             │
│     │     tax: receipt.total_tax_cost,                               │
│     │     // Note: NOT grandtotal (includes shipping+tax)            │
│     │   }                                                            │
│     │                                                                │
│     └── Auto-refresh token if expires < 5 minutes                    │
│                                                                      │
│  4. EXCLUSION CHECK                                                  │
│     │                                                                │
│     └── Skip if (platform, platform_order_id) IN excluded_orders     │
│                                                                      │
│  5. P&L REFRESH                                                      │
│     │                                                                │
│     └── POST /api/pnl/refresh triggers aggregation                   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Ad Spend Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AD SPEND SYNC FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  META MARKETING API                                             │
│  ─────────────────                                              │
│  Endpoint: GET /v21.0/{ad_account_id}/insights                  │
│                                                                 │
│  Fields:                                                        │
│    • spend (daily ad spend)                                     │
│    • impressions                                                │
│    • clicks                                                     │
│    • actions (conversions by type)                              │
│    • action_values (revenue by conversion type)                 │
│                                                                 │
│  Breakdown:                                                     │
│    • date_start (for daily aggregation)                         │
│    • country (for country_ad_spend table)                       │
│                                                                 │
│  Transform:                                                     │
│    {                                                            │
│      date: insights.date_start,                                 │
│      platform: 'meta',                                          │
│      spend: insights.spend,                                     │
│      impressions: insights.impressions,                         │
│      clicks: insights.clicks,                                   │
│      conversions: actions.find(a => a.type === 'purchase'),     │
│      revenue_attributed: action_values.find(...).value          │
│    }                                                            │
│                                                                 │
│  GOOGLE ADS API (Pending Approval)                              │
│  ─────────────────────────────────                              │
│  Query Language: GAQL                                           │
│                                                                 │
│  SELECT                                                         │
│    segments.date,                                               │
│    metrics.cost_micros,                                         │
│    metrics.impressions,                                         │
│    metrics.clicks,                                              │
│    metrics.conversions,                                         │
│    metrics.conversions_value                                    │
│  FROM customer                                                  │
│  WHERE segments.date BETWEEN '2025-01-01' AND '2025-01-31'      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. P&L Calculation Engine

### Revenue Definition (Critical)

To ensure accurate cross-platform comparison:

| Metric | Definition | Source |
|--------|------------|--------|
| **Product Revenue** | Order subtotals (no shipping/tax) | Shopify `subtotal_price`, Etsy `subtotal` |
| **Shipping Charged** | Customer shipping fees | Separate field |
| **Gross Revenue** | Product + Shipping | Calculated |
| **Net Revenue** | Product - Refunds | Used for margins |

### Profit Waterfall

```
┌─────────────────────────────────────────────────────────────────┐
│                    P&L WATERFALL                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   NET REVENUE (£10,000)                                         │
│   │                                                             │
│   │  - COGS (30% = £3,000)                                      │
│   │    └── Configurable per brand via cost_config               │
│   │                                                             │
│   ▼                                                             │
│   GP1: GROSS PROFIT 1 (£7,000)                                  │
│   │    "Gross profit after cost of goods"                       │
│   │                                                             │
│   │  - Pick & Pack (5% = £500)                                  │
│   │  - Platform Fees                                            │
│   │    ├── Shopify: 2.9% + £0.30/txn                            │
│   │    └── Etsy: 6.5%                                           │
│   │  - Logistics (3% = £300)                                    │
│   │                                                             │
│   ▼                                                             │
│   GP2: GROSS PROFIT 2 (£5,500)                                  │
│   │    "Operating profit after fulfillment"                     │
│   │                                                             │
│   │  - Ad Spend (Meta + Google + Etsy Ads = £2,000)             │
│   │                                                             │
│   ▼                                                             │
│   GP3: CONTRIBUTION MARGIN (£3,500)                             │
│   │    "Profit after advertising"                               │
│   │                                                             │
│   │  - OPEX (Operating Expenses = £800)                         │
│   │    ├── Staff, Premises, Software                            │
│   │    ├── Professional, Insurance, Equipment                   │
│   │    └── Travel, Banking, Marketing Other                     │
│   │                                                             │
│   ▼                                                             │
│   TRUE NET PROFIT (£2,700)                                      │
│        "THE BOTTOM LINE"                                        │
│                                                                 │
│   Net Margin = £2,700 / £10,000 = 27%                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Formulas

**Location:** `src/lib/pnl/calculations.ts`

```typescript
// GP1 = Net Revenue - COGS
const gp1 = netRevenue - (netRevenue * cogsPercent);

// GP2 = GP1 - Pick&Pack - Fees - Logistics
const gp2 = gp1 - pickPack - platformFees - logistics;

// GP3 = GP2 - Ad Spend
const gp3 = gp2 - totalAdSpend;

// True Net Profit = GP3 - OPEX
const trueNetProfit = gp3 - totalOpex;

// Key Metrics
const netMargin = (trueNetProfit / netRevenue) * 100;
const poas = (gp3 / totalAdSpend) * 100;  // Profit on Ad Spend
const mer = netRevenue / totalAdSpend;     // Marketing Efficiency Ratio
const grossAOV = (productRevenue + shippingCharged) / orderCount;
const netAOV = (productRevenue - discounts) / orderCount;
```

### OPEX Pro-Rating

**Location:** `src/lib/pnl/opex.ts`

Operating expenses are allocated daily based on frequency:

```typescript
function calculateDailyOpex(expense: OperatingExpense, date: Date): number {
  // Check if expense is active for this date
  if (date < expense.start_date ||
      (expense.end_date && date > expense.end_date)) {
    return 0;
  }

  switch (expense.frequency) {
    case 'monthly':
      return expense.amount / daysInMonth(date);
    case 'quarterly':
      return expense.amount / 91;  // ~3 months
    case 'annual':
      return expense.amount / 365;
    case 'one_time':
      return isSameDay(date, expense.expense_date) ? expense.amount : 0;
  }
}
```

### Platform Fee Calculations

```typescript
// Shopify Fees
const shopifyFees = (shopifyRevenue * 0.029) + (shopifyOrders * 0.30);

// Etsy Fees (simplified - actual from Payment Ledger when available)
const etsyFees = etsyRevenue * 0.065;
```

### Cost Configuration

Per-brand configurable via `cost_config` table:

| Setting | Default | Description |
|---------|---------|-------------|
| `cogs_pct` | 30% | Cost of Goods Sold |
| `pick_pack_pct` | 5% | Pick & Pack handling |
| `logistics_pct` | 3% | Logistics/warehouse |

---

## 7. External Integrations

### 7.1 Meta Marketing API

**Status:** Active
**API Version:** v21.0
**Base URL:** `https://graph.facebook.com/v21.0`

**Ad Accounts:**
- Display Champ: `act_892968716290721`
- Bright Ivy: `act_3210136152487456`

**Authentication:**
- Long-lived token (~60 days)
- Exchange via `/api/meta/token` before expiry
- Check status: `GET /api/meta/token`

**Data Retrieved:**
- Daily spend
- Impressions
- Clicks
- Conversions (purchases)
- Revenue attributed
- Country breakdown

**Rate Limits:** 5 queries/second

### 7.2 Google Ads API

**Status:** Pending Basic Access approval
**Manager Account:** `154-614-8084`
**Customer ID (DC):** `281-641-2476`

**Authentication:**
- OAuth with refresh token (long-lived)
- Developer token required

**Query Language:** GAQL (Google Ads Query Language)

### 7.3 Shopify GraphQL Admin API

**Status:** Connected (both brands)

**Stores:**
- `display-champ.myshopify.com`
- `brightivy.myshopify.com`

**Authentication:** Admin API access tokens (per store)

**Key Fields:**
| GraphQL Field | DB Column | Notes |
|--------------|-----------|-------|
| `subtotalPriceSet.shopMoney.amount` | `subtotal` | **Use this, not total** |
| `totalShippingPriceSet.shopMoney.amount` | `shipping_charged` | |
| `totalTaxSet.shopMoney.amount` | `tax` | |
| `refunds[].totalRefundedSet.shopMoney.amount` | `refund_amount` | Sum all |
| `shippingAddress.countryCode` | `shipping_address.country_code` | |

### 7.4 Etsy Open API v3

**Status:** Connected (BI active, DC needs token refresh)

**Shops:**
- BrightIvyUK: `48268436`
- DisplayChampUK: `54850131`

**Authentication:**
- OAuth PKCE flow
- Auto-refresh enabled (1-hour token expiry)
- Refresh tokens stored in `stores.api_credentials`

**Key Fields:**
| Etsy Field | DB Column | Notes |
|-----------|-----------|-------|
| `subtotal` or `total_price` | `subtotal` | **Not grandtotal** |
| `total_shipping_cost` | `shipping_charged` | |
| `total_tax_cost` | `tax` | |
| `adjustments` | → `refund_status` | Detect refunds |
| `country_iso` | `shipping_address.country_code` | |

**Rate Limits:** 5 queries/second, 5,000/day

### 7.5 Xero API

**Status:** Connected
**Purpose:** Bank balance visibility

**Authentication:**
- OAuth PKCE flow
- 30-minute token expiry
- 60-day refresh token
- Auto-refresh on balance fetch

**Data Retrieved:**
- Bank accounts (Monzo, Amex)
- Real-time balances
- Currency

### 7.6 Resend Email API

**Status:** Active
**Purpose:** Daily P&L summary emails

**Trigger:** 6pm UTC cron job
**Recipients:** joel@displaychamp.com, lee@displaychamp.com

**Email Contents:**
- Profitability status
- True Net Profit (vs yesterday)
- Key metrics (Revenue, Orders, Net Margin, MER)
- Profit waterfall
- Channel breakdown

### 7.7 ShipStation Integration

**Status:** Active
**Purpose:** Sync shipment tracking numbers and link to orders

**Authentication:**
- API Key + Secret (Basic Auth)
- Stored in `SHIPSTATION_API_KEY` and `SHIPSTATION_API_SECRET` env vars

**Carrier Mapping:**

| ShipStation Carrier | Database Carrier |
|--------------------|------------------|
| `royal_mail` | `royalmail` |
| `dhl_express_uk` | `dhl` |
| `deutsche_post_cross_border` | `deutschepost` |

**Sync Process:**
1. Fetch shipments by date range from ShipStation API
2. Match to orders using `orderNumber` → Shopify order ID
3. Create/update `shipments` table records
4. Link shipments to orders via `order_id`

**Key Fields:**

| ShipStation Field | Database Column |
|-------------------|-----------------|
| `orderNumber` | → lookup `orders.order_number` |
| `trackingNumber` | `tracking_number` |
| `carrierCode` | → map to `carrier` |
| `shipDate` | `shipping_date` |
| `weight.value` | `weight_kg` |

---

## 7.8 Invoice Processing System

### Overview

Carrier invoices (DHL, Royal Mail) are processed to allocate actual shipping costs to orders:

```
┌────────────────────────────────────────────────────────────────────┐
│                   INVOICE PROCESSING FLOW                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   ┌─────────────┐    ┌──────────────┐    ┌───────────────┐       │
│   │ DHL Invoice │    │ Royal Mail   │    │ ShipStation   │       │
│   │ (CSV)       │    │ Invoice (CSV)│    │ (API)         │       │
│   └──────┬──────┘    └──────┬───────┘    └───────┬───────┘       │
│          │                  │                    │                │
│          ▼                  ▼                    ▼                │
│   ┌─────────────┐    ┌──────────────┐    ┌───────────────┐       │
│   │ /api/       │    │ /api/        │    │ /api/         │       │
│   │ invoices/   │    │ invoices/    │    │ shipstation/  │       │
│   │ analyze     │    │ royalmail    │    │ sync          │       │
│   └──────┬──────┘    └──────┬───────┘    └───────┬───────┘       │
│          │                  │                    │                │
│          └──────────────────┼────────────────────┘                │
│                             │                                      │
│                             ▼                                      │
│                    ┌────────────────┐                             │
│                    │   shipments    │  ← order_id (may be null)   │
│                    │   table        │                             │
│                    └───────┬────────┘                             │
│                            │                                       │
│            ┌───────────────┼───────────────┐                      │
│            │ Matched       │ Unmatched     │                      │
│            ▼               ▼               │                      │
│     ┌─────────────┐  ┌─────────────────┐  │                      │
│     │ Linked to   │  │ unmatched_      │  │                      │
│     │ orders      │  │ invoice_records │  │                      │
│     │ (P&L calc)  │  │ (for review)    │  │                      │
│     └─────────────┘  └─────────────────┘  │                      │
│                                            │                      │
└────────────────────────────────────────────────────────────────────┘
```

### DHL Invoice Processing

1. **Upload CSV** → `/api/invoices/analyze`
2. **Review** analysis (records, costs, tracking numbers)
3. **Process** → `/api/invoices/process`
4. Creates/updates shipments with `cost_confidence: 'actual'`
5. Unmatched records go to `unmatched_invoice_records` table

### Royal Mail Invoice Processing

Royal Mail invoices contain **aggregated costs** by date/product, not individual tracking numbers:

1. **Upload CSV** → `/api/invoices/royalmail`
2. Parse daily costs by product code (TPS, TPM, MPR, etc.)
3. Match shipments by `shipping_date` + `service_type`
4. Apply average cost per item for that date/product
5. Old unmatched shipments (>14 days) can use service-type averages

### Unmatched Records Workflow

```
[Invoice Upload] → [Unmatched if no order found] → [Manual Review]
                                                          │
                    ┌─────────────────────────────────────┼──────────┐
                    │                                     │          │
                    ▼                                     ▼          ▼
              [Match to Order]                    [Mark Voided]  [Resolve]
              (creates shipment)                  (wasted label) (with notes)
```

### Multiple Shipments Per Order

Orders can have **multiple shipments** (e.g., split shipments, different carriers):

```
Order #3126 (B2B Order to Golf Pro Shop)
├── Shipment 1: Royal Mail - £5.20 (Part A)
├── Shipment 2: DHL Express - £15.80 (Part B)
└── Total Shipping Cost: £21.00

P&L Calculation:
- Sums ALL shipments.shipping_cost for each order
- Displays total with count indicator: "£21.00 (2)"
```

**Technical Implementation:**
- `shipments.order_id` → FK to orders (many-to-one)
- P&L calculations group by `order_id` and sum `shipping_cost`
- UI shows `totalShippingCost` field with `shipment_count`

---

## 8. Authentication & Authorization

### Supabase Auth Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTH FLOW                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. LOGIN                                                    │
│     POST /auth/v1/token?grant_type=password                  │
│     Body: { email, password }                                │
│     Response: { access_token, refresh_token }                │
│                                                              │
│  2. SESSION MANAGEMENT                                       │
│     - Cookies store session                                  │
│     - Middleware refreshes on each request                   │
│     - src/middleware.ts handles session check                │
│                                                              │
│  3. AUTHORIZATION                                            │
│     - user_roles table stores role + brand_access            │
│     - Roles: admin, editor, viewer                           │
│     - brand_access: array of brand IDs                       │
│                                                              │
│  4. RLS POLICIES                                             │
│     - Most tables: authenticated users can read              │
│     - Service role: full access (for sync APIs)              │
│     - idx_user_roles_user_id: fast policy checks             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### User Accounts

| Email | Role | Brands |
|-------|------|--------|
| joel@displaychamp.com | Admin | All |
| lee@brightivy.com | Editor | BI |

### Service Role Usage

The service role key is used in API routes to bypass RLS for:
- Order sync (writing to `orders` table)
- Ad spend sync (writing to `ad_spend` table)
- P&L refresh (writing to `daily_pnl` table)
- Fast dashboard queries (100x faster than RLS)

**Never expose service role key to client-side code.**

---

## 9. API Reference

### P&L Data Endpoints

#### `GET /api/pnl/data`

Fast P&L data fetch (bypasses RLS for performance).

**Query Parameters:**
- `from` (required): Start date (YYYY-MM-DD)
- `to` (required): End date (YYYY-MM-DD)
- `brand` (optional): 'all' | 'DC' | 'BI'

**Response:**
```json
{
  "brands": [...],
  "dailyPnl": [...],
  "adSpend": [...],
  "quarterlyGoals": [...],
  "opex": {
    "summary": { "totalMonthly": 1200, "byCategory": {...} },
    "periodTotal": 800,
    "expenseCount": 15
  }
}
```

#### `POST /api/pnl/refresh`

Recalculate daily_pnl records.

**Request Body:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
// OR
{
  "days": 90  // Last 90 days
}
```

#### `GET /api/pnl/country`

Country P&L breakdown (GP2 by shipping destination).

**Query Parameters:** Same as `/api/pnl/data`

**Response:**
```json
{
  "countries": [
    {
      "country_code": "GB",
      "country_name": "United Kingdom",
      "revenue": 50000,
      "orders": 1200,
      "aov": 41.67,
      "cogs": 15000,
      "gp1": 35000,
      "platform_fees": 1500,
      "pick_pack": 2500,
      "logistics": 1500,
      "gp2": 29500,
      "gp2_margin": 59,
      "ad_spend": 5000,
      "gp3": 24500,
      "gp3_margin": 49
    }
  ],
  "summary": {
    "totalCountries": 45,
    "domesticPct": 60,
    "topCountry": "GB",
    "topGp2Margin": "DE"
  },
  "hasAdSpendData": true
}
```

### Sync Endpoints

#### `POST /api/orders/sync`

Sync orders from all platforms.

**Request Body:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "all",
  "platforms": ["shopify", "etsy"]
}
```

#### `POST /api/meta/sync`

Sync ad spend from Meta.

**Request Body:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "DC"
}
```

### Cron Endpoints

#### `GET /api/cron/daily-sync`

Automated daily sync (called by Vercel cron).

**Authentication:** `Authorization: Bearer $CRON_SECRET`

**Actions:**
1. Sync Shopify orders (7 days)
2. Sync Etsy orders (7 days)
3. Sync Meta ad spend (7 days)
4. Sync Meta country breakdown
5. Refresh P&L
6. Send daily email (6pm only)

---

## 10. Frontend Architecture

### Directory Structure

```
src/
├── app/
│   ├── page.tsx                    # Main dashboard
│   ├── country/page.tsx            # Country analysis
│   ├── detailed/page.tsx           # Detailed view
│   ├── help/page.tsx               # Help guide
│   ├── login/page.tsx              # Auth
│   └── admin/                      # Admin pages
├── components/
│   ├── ui/                         # shadcn/ui (30+ components)
│   ├── dashboard/                  # Dashboard components
│   ├── charts/                     # Recharts wrappers
│   ├── country/                    # Country analysis
│   ├── help/                       # Help guide sections
│   └── forms/                      # Form components
├── hooks/
│   ├── usePnLData.ts               # Main data hook
│   └── useFilterParams.ts          # URL filter persistence
├── lib/
│   ├── supabase/                   # DB clients
│   ├── pnl/                        # Calculation engine
│   ├── meta/                       # Meta API client
│   ├── google/                     # Google Ads client
│   ├── shopify/                    # Shopify client
│   ├── etsy/                       # Etsy client
│   └── xero/                       # Xero client
└── types/
    └── index.ts                    # TypeScript definitions
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DashboardFilters` | dashboard/ | Date/brand/period selection |
| `HeroKPIGrid` | dashboard/ | Top 4 metrics |
| `WaterfallChart` | charts/ | GP1→GP2→GP3→Net flow |
| `PnLTable` | dashboard/ | Daily breakdown |
| `CountryTable` | country/ | Country P&L |
| `CashPositionCard` | dashboard/ | Xero balances |

### State Management

- **URL Parameters:** Persistent filters via `useFilterParams`
- **React Hooks:** `usePnLData` for data fetching
- **No Redux/Zustand:** Simple enough for React state

### Data Flow Pattern

```typescript
// Filter selection
const { from, to, brand, period } = useFilterParams();

// Data fetching
const { data, loading, error } = usePnLData({ from, to, brand });

// Aggregation
const aggregated = aggregatePnLByPeriod(data.dailyPnl, period);

// Render
return <PnLTable data={aggregated} />;
```

---

## 11. Cron Jobs & Automation

### Vercel Cron Configuration

**File:** `vercel.json`

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

### Schedule

| Time (UTC) | Time (UK) | Actions |
|------------|-----------|---------|
| 05:00 | 5:00 AM | Sync all data |
| 18:00 | 6:00 PM | Sync all data + send email |

### Daily Sync Actions

1. Sync Shopify orders (last 7 days)
2. Sync Etsy orders (last 7 days)
3. Sync Meta ad spend (last 7 days)
4. Sync Meta country breakdown
5. Refresh P&L calculations
6. Send daily summary email (6pm only)

### Manual Trigger

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://pnl.displaychamp.com/api/cron/daily-sync
```

---

## 12. Environment Variables

### Required Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://pbfaoshmaogrsgatfojs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Cron
CRON_SECRET=<random-secret>

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

# Shopify
SHOPIFY_DC_STORE_DOMAIN=display-champ.myshopify.com
SHOPIFY_DC_ACCESS_TOKEN=<admin-api-access-token>
SHOPIFY_BI_STORE_DOMAIN=brightivy.myshopify.com
SHOPIFY_BI_ACCESS_TOKEN=<admin-api-access-token>

# Etsy
ETSY_DC_API_KEY=<api-keystring>
ETSY_DC_SHOP_ID=<shop-id>
ETSY_DC_ACCESS_TOKEN=<oauth-access-token>
ETSY_DC_REFRESH_TOKEN=<oauth-refresh-token>
ETSY_BI_API_KEY=<api-keystring>
ETSY_BI_SHOP_ID=<shop-id>
ETSY_BI_ACCESS_TOKEN=<oauth-access-token>
ETSY_BI_REFRESH_TOKEN=<oauth-refresh-token>

# Xero
XERO_CLIENT_ID=<client-id>
XERO_CLIENT_SECRET=<client-secret>

# Email
RESEND_API_KEY=<resend-api-key>
```

### Token Refresh Schedule

| Integration | Token Lifetime | Refresh Method |
|-------------|---------------|----------------|
| Meta | ~60 days | Exchange via `/api/meta/token` |
| Google | Long-lived refresh | Monitor for revocation |
| Xero | 30 min (auto-refresh) | Automatic on use |
| Etsy | 1 hour (auto-refresh) | Automatic during sync |

---

## 13. Deployment & DevOps

### Production URLs

| Project | URL | Platform |
|---------|-----|----------|
| P&L Dashboard | https://pnl.displaychamp.com | Vercel |
| Shipping Dashboard | https://valhalla-shipping-report.vercel.app | Vercel |
| EOS Framework | https://joelgarthwaite.github.io/Valhalla-EOS-/ | GitHub Pages |

### Deployment Workflow

```bash
# P&L Dashboard
cd valhalla-daily-pnl
git add .
git commit -m "Description"
git push  # Auto-deploys to Vercel

# Shipping Dashboard
cd valhalla-dashboard
git add .
git commit -m "Description"
git push  # Auto-deploys to Vercel

# EOS Framework
cd "Valhalla Holdings EOS Framework"
git add .
git commit -m "Description"
git push  # Auto-deploys to GitHub Pages
```

### Monitoring

- **Vercel Analytics:** Core Web Vitals
- **Supabase Dashboard:** Query stats, RLS policy performance
- **Manual checks:** Cron job logs via Vercel dashboard

---

## 14. Consolidation Roadmap

### Target Architecture

```
valhalla.displaychamp.com
├── /                    # Hub home (overview dashboard)
├── /pnl                 # P&L module (current P&L dashboard)
├── /shipping            # Shipping module (migrate from shipping dashboard)
├── /eos                 # EOS module (migrate from HTML)
├── /cashflow            # Cash flow projections (new)
├── /investor            # M&A metrics (new)
├── /country             # Country analysis (existing)
├── /detailed            # Detailed P&L (existing)
├── /admin               # Admin pages (existing + shipping upload)
└── /help                # Help guide (existing)
```

### Migration Phases

#### Phase 1: Documentation (Current)
- [x] Create ARCHITECTURE.md
- [x] Create Mermaid diagrams
- [x] Document all APIs
- [x] Document database schema

#### Phase 2: Hub Home Page
- [ ] Create unified navigation sidebar
- [ ] Build overview dashboard with cross-module KPIs
- [ ] Add quick stats from P&L, Shipping, EOS
- [ ] Implement alert system

#### Phase 3: Shipping Integration
- [ ] Review shipping dashboard codebase
- [ ] Create `/shipping` route in P&L repo
- [ ] Migrate components (CarrierBreakdown, InvoiceUpload)
- [ ] Consolidate order sync logic
- [ ] Deprecate standalone shipping dashboard

#### Phase 4: EOS Migration
- [ ] Create EOS database tables (migration 012)
- [ ] Build React components from HTML
- [ ] Implement L10 meeting workflow
- [ ] Connect to existing Supabase auth

#### Phase 5: New Features
- [ ] Cash flow projections module
- [ ] Investor/M&A metrics dashboard
- [ ] Export to PDF for data room

### New Database Tables (EOS)

```sql
-- Migration 012: EOS Tables
CREATE TABLE eos_rocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  quarter VARCHAR(10) NOT NULL,
  owner TEXT NOT NULL,
  title TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'on_track',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE eos_scorecard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  metric_name TEXT NOT NULL,
  owner TEXT,
  goal DECIMAL(12, 2),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE eos_scorecard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scorecard_id UUID REFERENCES eos_scorecard(id),
  week_start DATE NOT NULL,
  actual DECIMAL(12, 2),
  UNIQUE(scorecard_id, week_start)
);

CREATE TABLE eos_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  title TEXT NOT NULL,
  priority INTEGER DEFAULT 50,
  status VARCHAR(20) DEFAULT 'open',
  source VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE eos_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  issue_id UUID REFERENCES eos_issues(id),
  owner TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date DATE,
  status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE eos_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id),
  meeting_date DATE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  issues_solved INTEGER DEFAULT 0,
  todos_created INTEGER DEFAULT 0,
  notes JSONB
);
```

---

## Appendix: Code References

### Key Files

| Purpose | Path |
|---------|------|
| P&L Calculations | `src/lib/pnl/calculations.ts` |
| OPEX Pro-rating | `src/lib/pnl/opex.ts` |
| Country P&L | `src/lib/pnl/country-calculations.ts` |
| Meta API Client | `src/lib/meta/client.ts` |
| Shopify Client | `src/lib/shopify/client.ts` |
| Etsy Client | `src/lib/etsy/client.ts` |
| Xero Client | `src/lib/xero/client.ts` |
| Type Definitions | `src/types/index.ts` |
| P&L Data Hook | `src/hooks/usePnLData.ts` |
| Dashboard Page | `src/app/page.tsx` |
| Country Page | `src/app/country/page.tsx` |
| Daily Sync Cron | `src/app/api/cron/daily-sync/route.ts` |

### Database Migrations

| Migration | Path |
|-----------|------|
| Core P&L | `supabase/migrations/002_pnl_schema.sql` |
| Enhanced Metrics | `supabase/migrations/003_enhanced_metrics.sql` |
| OPEX Table | `supabase/migrations/007_operating_expenses.sql` |
| Xero Integration | `supabase/migrations/008_xero_integration.sql` |
| Country Ad Spend | `supabase/migrations/010_country_ad_spend.sql` |
| Order Exclusions | `supabase/migrations/011_order_exclusions.sql` |

---

*Document maintained by the Valhalla development team. For questions, contact joel@displaychamp.com.*
