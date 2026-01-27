# Valhalla Hub - API Reference

> Complete reference for all API endpoints across the Valhalla Hub platform.

---

## Table of Contents

1. [Authentication](#authentication)
2. [P&L Data Endpoints](#pnl-data-endpoints)
3. [Order Sync Endpoints](#order-sync-endpoints)
4. [Ad Spend Endpoints](#ad-spend-endpoints)
5. [Operating Expenses](#operating-expenses)
6. [B2B Revenue](#b2b-revenue)
7. [Xero Integration](#xero-integration)
8. [Cron Jobs](#cron-jobs)
9. [Email Notifications](#email-notifications)
10. [Error Handling](#error-handling)

---

## Authentication

All API endpoints require authentication via Supabase Auth.

### Headers

```http
Authorization: Bearer <supabase-access-token>
```

### Service Role Endpoints

Some endpoints use the service role key for bypassing RLS:
- `/api/pnl/data` - Fast P&L queries
- `/api/pnl/refresh` - P&L calculations
- `/api/orders/sync` - Order sync operations

---

## P&L Data Endpoints

### GET `/api/pnl/data`

Fetch P&L data for the dashboard. Uses service role for fast queries.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Start date (YYYY-MM-DD) |
| `to` | string | Yes | End date (YYYY-MM-DD) |
| `brand` | string | No | 'all', 'DC', or 'BI' (default: 'all') |

**Example Request:**

```bash
curl -H "Authorization: Bearer <token>" \
  "https://pnl.displaychamp.com/api/pnl/data?from=2025-01-01&to=2025-01-31&brand=all"
```

**Response:**

```json
{
  "brands": [
    { "id": "uuid", "name": "Display Champ", "code": "DC" },
    { "id": "uuid", "name": "Bright Ivy", "code": "BI" }
  ],
  "dailyPnl": [
    {
      "date": "2025-01-27",
      "brand_id": "uuid",
      "total_revenue": 5000.00,
      "net_revenue": 4800.00,
      "shopify_revenue": 3500.00,
      "etsy_revenue": 1300.00,
      "b2b_revenue": 0,
      "total_refunds": 200.00,
      "cogs": 1440.00,
      "gp1": 3360.00,
      "shopify_fees": 105.30,
      "etsy_fees": 84.50,
      "pick_pack": 240.00,
      "logistics": 144.00,
      "gp2": 2786.20,
      "total_ad_spend": 800.00,
      "gp3": 1986.20,
      "total_opex": 150.00,
      "true_net_profit": 1836.20,
      "order_count": 45
    }
  ],
  "adSpend": [
    {
      "date": "2025-01-27",
      "brand_id": "uuid",
      "platform": "meta",
      "spend": 650.00,
      "impressions": 45000,
      "clicks": 1200,
      "conversions": 15,
      "revenue_attributed": 2100.00
    }
  ],
  "quarterlyGoals": [
    {
      "year": 2025,
      "quarter": 1,
      "brand_id": "uuid",
      "revenue_target": 150000.00,
      "gross_margin_target": 65.00
    }
  ],
  "opex": {
    "summary": {
      "totalMonthly": 4500.00,
      "byCategory": {
        "staff": 2500.00,
        "premises": 800.00,
        "software": 350.00,
        "professional": 200.00,
        "other": 650.00
      }
    },
    "periodTotal": 4500.00,
    "expenseCount": 15
  }
}
```

---

### POST `/api/pnl/refresh`

Recalculate and store daily P&L records.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

**Alternative (days-based):**

```json
{
  "days": 90
}
```

**Response:**

```json
{
  "success": true,
  "message": "P&L refreshed for 31 days",
  "recordsUpdated": 62
}
```

---

### GET `/api/pnl/country`

Fetch P&L breakdown by customer shipping destination.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Start date (YYYY-MM-DD) |
| `to` | string | Yes | End date (YYYY-MM-DD) |
| `brand` | string | No | 'all', 'DC', or 'BI' (default: 'all') |

**Response:**

```json
{
  "countries": [
    {
      "country_code": "GB",
      "country_name": "United Kingdom",
      "revenue": 50000.00,
      "orders": 1200,
      "aov": 41.67,
      "cogs": 15000.00,
      "gp1": 35000.00,
      "platform_fees": 1500.00,
      "pick_pack": 2500.00,
      "logistics": 1500.00,
      "gp2": 29500.00,
      "gp2_margin": 59.00,
      "ad_spend": 5000.00,
      "gp3": 24500.00,
      "gp3_margin": 49.00,
      "platforms": {
        "shopify": { "revenue": 35000, "orders": 800 },
        "etsy": { "revenue": 15000, "orders": 400 }
      }
    }
  ],
  "summary": {
    "totalCountries": 45,
    "totalRevenue": 120000.00,
    "totalOrders": 3200,
    "domesticPct": 60,
    "internationalPct": 40,
    "topCountry": "GB",
    "topGp2Margin": "DE"
  },
  "hasAdSpendData": true
}
```

---

## Order Sync Endpoints

### POST `/api/orders/sync`

Sync orders from all connected platforms.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "all",
  "platforms": ["shopify", "etsy"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | No | Defaults to 30 days ago |
| `endDate` | string | No | Defaults to today |
| `brandCode` | string | No | 'all', 'DC', or 'BI' |
| `platforms` | array | No | ['shopify', 'etsy'] (default: all) |

**Response:**

```json
{
  "success": true,
  "results": {
    "shopify": {
      "DC": { "ordersCreated": 45, "ordersUpdated": 12 },
      "BI": { "ordersCreated": 8, "ordersUpdated": 2 }
    },
    "etsy": {
      "DC": { "ordersCreated": 22, "ordersUpdated": 5 },
      "BI": { "ordersCreated": 15, "ordersUpdated": 3 }
    }
  },
  "totalCreated": 90,
  "totalUpdated": 22,
  "exclusions": 3
}
```

---

### POST `/api/shopify/sync`

Sync orders from Shopify only.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "DC"
}
```

---

### POST `/api/etsy/sync`

Sync orders from Etsy only.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "BI"
}
```

---

### GET `/api/shopify/sync`

Check Shopify connection status.

**Response:**

```json
{
  "connected": true,
  "stores": [
    {
      "brand": "DC",
      "domain": "display-champ.myshopify.com",
      "lastSync": "2025-01-27T05:00:00Z"
    },
    {
      "brand": "BI",
      "domain": "brightivy.myshopify.com",
      "lastSync": "2025-01-27T05:00:00Z"
    }
  ]
}
```

---

### POST `/api/orders/exclude`

Exclude an order from P&L calculations.

**Request Body:**

```json
{
  "orderId": "uuid",
  "reason": "Test order"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Order excluded successfully"
}
```

---

### DELETE `/api/orders/exclude`

Restore an excluded order.

**Request Body:**

```json
{
  "platform": "shopify",
  "platformOrderId": "5123456789"
}
```

---

## Ad Spend Endpoints

### POST `/api/meta/sync`

Sync ad spend from Meta Marketing API.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "DC"
}
```

**Response:**

```json
{
  "success": true,
  "recordsSynced": 31,
  "totalSpend": 15000.00,
  "breakdown": {
    "impressions": 450000,
    "clicks": 12000,
    "conversions": 350,
    "revenueAttributed": 52000.00
  }
}
```

---

### POST `/api/meta/country-sync`

Sync country-level ad spend breakdown from Meta.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "all"
}
```

---

### GET `/api/meta/token`

Check Meta access token status.

**Response:**

```json
{
  "valid": true,
  "expiresAt": "2025-03-27T00:00:00Z",
  "daysRemaining": 59,
  "needsRefresh": false
}
```

---

### POST `/api/meta/token`

Exchange short-lived token for long-lived token.

**Request Body:**

```json
{
  "shortLivedToken": "<facebook-short-token>"
}
```

---

### POST `/api/google/sync`

Sync ad spend from Google Ads API.

**Request Body:**

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "brandCode": "DC"
}
```

**Note:** Currently pending Google Ads Basic Access approval.

---

### GET `/api/google/auth`

Initiate Google Ads OAuth flow.

**Response:** Redirects to Google OAuth consent screen.

---

## Operating Expenses

### GET `/api/opex`

Fetch OPEX summary for a period.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | string | Yes | Start date (YYYY-MM-DD) |
| `to` | string | Yes | End date (YYYY-MM-DD) |
| `brand` | string | No | 'all', 'DC', or 'BI' |

**Response:**

```json
{
  "summary": {
    "totalMonthly": 4500.00,
    "byCategory": {
      "staff": 2500.00,
      "premises": 800.00,
      "software": 350.00,
      "professional": 200.00,
      "insurance": 100.00,
      "equipment": 150.00,
      "travel": 100.00,
      "banking": 50.00,
      "marketing_other": 100.00,
      "other": 150.00
    }
  },
  "periodTotal": 4500.00,
  "expenseCount": 15,
  "expenses": [
    {
      "id": "uuid",
      "name": "Joel Salary",
      "category": "staff",
      "amount": 2500.00,
      "frequency": "monthly",
      "start_date": "2024-01-01",
      "end_date": null,
      "is_active": true
    }
  ]
}
```

---

## B2B Revenue

### POST `/api/b2b/import`

Bulk import B2B revenue by week.

**Request Body:**

```json
{
  "brand_code": "DC",
  "customer_name": "Weekly B2B Sales",
  "entries": [
    {
      "year": 2025,
      "week": 1,
      "subtotal": 630.00,
      "shipping_charged": 0,
      "notes": "Week 1 wholesale"
    },
    {
      "year": 2025,
      "week": 2,
      "subtotal": 450.00,
      "notes": "Week 2 wholesale"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "imported": 2,
  "totalValue": 1080.00
}
```

---

### GET `/api/b2b/import`

Get B2B import format documentation.

**Response:**

```json
{
  "format": {
    "brand_code": "DC | BI",
    "customer_name": "string",
    "entries": [
      {
        "year": "number (2024-2026)",
        "week": "number (1-52)",
        "subtotal": "number (required)",
        "shipping_charged": "number (optional)",
        "notes": "string (optional)"
      }
    ]
  },
  "example": "..."
}
```

---

## Xero Integration

### GET `/api/xero/auth`

Initiate Xero OAuth PKCE flow.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand` | string | Yes | 'DC' or 'BI' |

**Response:** Redirects to Xero OAuth consent screen.

---

### GET `/api/xero/balances`

Fetch current bank balances from Xero.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `brand` | string | No | 'all', 'DC', or 'BI' |

**Response:**

```json
{
  "balances": [
    {
      "brand": "DC",
      "accountName": "Monzo Business",
      "accountType": "BANK",
      "balance": 15234.56,
      "currency": "GBP",
      "updatedAt": "2025-01-27T12:00:00Z"
    },
    {
      "brand": "DC",
      "accountName": "Amex",
      "accountType": "CREDITCARD",
      "balance": -2500.00,
      "currency": "GBP",
      "updatedAt": "2025-01-27T12:00:00Z"
    }
  ],
  "totals": {
    "totalCash": 15234.56,
    "totalCredit": -2500.00,
    "netPosition": 12734.56
  }
}
```

---

## Cron Jobs

### GET `/api/cron/daily-sync`

Automated daily sync endpoint (called by Vercel cron).

**Authentication:**

```http
Authorization: Bearer <CRON_SECRET>
```

**Schedule:**
- 5:00 AM UTC - Full sync
- 6:00 PM UTC - Full sync + email

**Actions Performed:**
1. Sync Shopify orders (7 days)
2. Sync Etsy orders (7 days)
3. Sync Meta ad spend (7 days)
4. Sync Meta country breakdown
5. Refresh P&L calculations
6. Send daily summary email (6pm only)

**Response:**

```json
{
  "success": true,
  "timestamp": "2025-01-27T05:00:00Z",
  "actions": {
    "shopifySync": { "success": true, "orders": 45 },
    "etsySync": { "success": true, "orders": 22 },
    "metaSync": { "success": true, "spend": 650.00 },
    "pnlRefresh": { "success": true, "days": 7 },
    "emailSent": false
  }
}
```

**Manual Trigger:**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://pnl.displaychamp.com/api/cron/daily-sync
```

---

## Email Notifications

### POST `/api/email/daily-summary`

Send daily P&L summary email.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | No | Date for summary (default: yesterday) |
| `test` | string | No | If 'true', logs only (no send) |

**Request:**

```bash
# Send for specific date
curl -X POST "https://pnl.displaychamp.com/api/email/daily-summary?date=2025-01-26"

# Test mode (no send)
curl -X POST "https://pnl.displaychamp.com/api/email/daily-summary?test=true"
```

**Response:**

```json
{
  "success": true,
  "recipients": ["joel@displaychamp.com", "lee@displaychamp.com"],
  "date": "2025-01-26",
  "metrics": {
    "revenue": 5000.00,
    "orders": 45,
    "trueNetProfit": 1836.20,
    "netMargin": 36.7,
    "isProfitable": true
  }
}
```

---

## Error Handling

### Error Response Format

All API errors return a consistent format:

```json
{
  "error": true,
  "message": "Description of the error",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | User lacks required permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RATE_LIMITED` | 429 | Too many requests |
| `EXTERNAL_API_ERROR` | 502 | External API (Shopify/Etsy/Meta) failed |
| `DATABASE_ERROR` | 500 | Supabase query failed |
| `TOKEN_EXPIRED` | 401 | OAuth token needs refresh |

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| Meta API | 5 queries/second |
| Etsy API | 5 queries/second, 5000/day |
| Shopify API | Based on plan |
| P&L endpoints | No limit (internal) |

---

## Webhook Endpoints (Future)

Reserved for future webhook integrations:

- `/api/webhooks/shopify` - Shopify order webhooks
- `/api/webhooks/etsy` - Etsy receipt webhooks
- `/api/webhooks/stripe` - Payment webhooks

---

*API documentation maintained by the Valhalla development team.*
