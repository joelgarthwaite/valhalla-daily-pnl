# Valhalla Daily P&L Dashboard

A Lifetimely-style Daily P&L Dashboard for Display Champ and Bright Ivy, built on the existing Valhalla Dashboard infrastructure.

## Tech Stack

- **Frontend:** Next.js 16 + React 19
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Database:** Supabase (shared with Valhalla Dashboard)
- **Auth:** Supabase Auth
- **Deployment:** Vercel (separate project from Valhalla)

## Features

### Dashboard
- KPI cards with change tracking (Revenue, Orders, Margins, Profit)
- Revenue trend chart with optional YoY comparison
- P&L waterfall chart
- ROAS by channel chart
- Quarterly target gauge with progress tracking
- Detailed P&L table with expandable rows
- Filter by brand, date range, and period type (daily/weekly/monthly/quarterly/yearly)

### Admin Pages
- **Ad Spend:** Manual entry for Meta, Google, Microsoft, and Etsy Ads
- **B2B Revenue:** Track direct sales and bank transfers
- **Quarterly Goals:** Set revenue and margin targets
- **Promotions:** Manage discounts and promotional campaigns
- **Calendar Events:** Track holidays, golf tournaments, and key dates

### Export
- Excel export with summary and detailed P&L data
- PDF export with formatted report

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase project (uses existing Valhalla database)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://pbfaoshmaogrsgatfojs.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

4. Run the database migration:
   ```bash
   # Apply the migration to your Supabase database
   # See supabase/migrations/002_pnl_schema.sql
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

The P&L dashboard adds these tables to the existing Valhalla database:

- `ad_spend` - Manual ad spend tracking
- `b2b_revenue` - B2B sales records
- `quarterly_goals` - Revenue and margin targets
- `promotions` - Discount and promotion tracking
- `calendar_events` - Important dates calendar
- `pnl_notes` - Daily notes and annotations
- `user_roles` - Role-based access control
- `daily_pnl` - Pre-aggregated P&L data for performance

## P&L Calculations

### Revenue
```
Gross Revenue = Shopify + Etsy + B2B
```

### COGS (Blended)
```
COGS = Gross Revenue × 0.30 (for 70% gross margin target)
```

### Margins
```
Gross Profit = Gross Revenue - COGS
Gross Margin = Gross Profit / Gross Revenue × 100

Net Profit = Gross Profit - (Shipping Cost + Ad Spend + Platform Fees)
Net Margin = Net Profit / Gross Revenue × 100
```

### ROAS
```
Channel ROAS = Revenue Attributed / Ad Spend
Blended ROAS = Total Revenue / Total Ad Spend
```

## Deployment

Deploy to Vercel:

```bash
npm run build
vercel deploy
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Project Structure

```
valhalla-daily-pnl/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Main dashboard
│   │   ├── login/page.tsx            # Login page
│   │   └── admin/                    # Admin pages
│   ├── components/
│   │   ├── ui/                       # shadcn/ui
│   │   ├── dashboard/                # Dashboard components
│   │   ├── charts/                   # Recharts components
│   │   └── forms/                    # Form components
│   ├── hooks/
│   │   └── usePnLData.ts             # P&L data hook
│   ├── lib/
│   │   ├── supabase/                 # Supabase clients
│   │   ├── pnl/                      # P&L calculation engine
│   │   └── utils/                    # Utilities
│   └── types/
│       └── index.ts                  # TypeScript types
└── supabase/
    └── migrations/
        └── 002_pnl_schema.sql        # Database schema
```

## License

Proprietary - Display Champ / Bright Ivy
