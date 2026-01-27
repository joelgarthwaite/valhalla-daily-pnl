# Etsy API Integration Guide

Complete guide for connecting Etsy shops to Valhalla applications.

---

## Overview

This guide covers:
1. Etsy Developer App Setup
2. OAuth 2.0 Authentication Flow
3. Environment Variables
4. Database Schema
5. Auto Token Refresh
6. API Endpoints

---

## 1. Etsy Developer App Setup

### Create an Etsy App

1. Go to [Etsy Developer Portal](https://www.etsy.com/developers/your-apps)
2. Click "Create a New App"
3. Fill in app details:
   - **App Name:** Your app name
   - **Description:** Brief description
   - **Type:** Web Application
4. Once created, note your **Keystring** (this is your API Key)

### Configure Callback URL

In your Etsy app settings, add the callback URL:
- **Production:** `https://your-domain.com/api/etsy/callback`
- **Development:** `http://localhost:3000/api/etsy/callback`

### API Access Levels

- **Rate Limit:** 5 queries per second (QPS)
- **Daily Limit:** 5,000 queries per day (QPD)
- **Scopes needed:** `transactions_r`, `shops_r`

---

## 2. OAuth 2.0 Authentication Flow

Etsy uses OAuth 2.0 with PKCE (Proof Key for Code Exchange).

### Step 1: Get Authorization URL

```bash
GET /api/etsy/auth?brand=DC
```

Response:
```json
{
  "message": "Redirect to this URL to authorize Etsy access",
  "authUrl": "https://www.etsy.com/oauth/connect?...",
  "redirectUri": "https://your-domain.com/api/etsy/callback",
  "brand": "DC"
}
```

### Step 2: User Authorization

1. Open the `authUrl` in a browser
2. User logs into Etsy
3. User clicks "Grant access"
4. Etsy redirects to callback URL with authorization code

### Step 3: Token Exchange

The callback endpoint automatically:
1. Exchanges the authorization code for tokens
2. Returns access_token and refresh_token
3. Displays them on a success page

### Token Lifespan

| Token Type | Lifespan | Refresh |
|------------|----------|---------|
| Access Token | 1 hour | Automatic via refresh token |
| Refresh Token | Long-lived | Until revoked |

---

## 3. Environment Variables

### Per-Brand Configuration

```bash
# Display Champ
ETSY_DC_API_KEY=your_api_keystring
ETSY_DC_SHOP_ID=12345678
ETSY_DC_ACCESS_TOKEN=user_id.token_string
ETSY_DC_REFRESH_TOKEN=user_id.refresh_token_string

# Bright Ivy
ETSY_BI_API_KEY=your_api_keystring
ETSY_BI_SHOP_ID=48268436
ETSY_BI_ACCESS_TOKEN=user_id.token_string
ETSY_BI_REFRESH_TOKEN=user_id.refresh_token_string
```

### Finding Your Shop ID

**Option 1: API Lookup**
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://openapi.etsy.com/v3/application/shops?shop_name=YourShopName"
```

**Option 2: Online Tool**
Visit https://app.cartrover.com/get_etsy_shop_id.php

---

## 4. Database Schema

### Stores Table

Etsy credentials are stored in the `stores` table:

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id),
  platform TEXT NOT NULL,  -- 'etsy'
  store_name TEXT,
  api_credentials JSONB,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### api_credentials JSON Structure

```json
{
  "api_key": "your_api_keystring",
  "shop_id": "12345678",
  "access_token": "user_id.access_token_string",
  "refresh_token": "user_id.refresh_token_string",
  "expires_at": "2026-01-27T08:41:38.148Z"
}
```

### Insert a Store

```sql
INSERT INTO stores (brand_id, platform, store_name, api_credentials)
VALUES (
  'brand-uuid-here',
  'etsy',
  'YourShopName',
  '{
    "api_key": "your_api_key",
    "shop_id": "12345678",
    "access_token": "token_here",
    "refresh_token": "refresh_here",
    "expires_at": "2026-01-27T08:41:38.148Z"
  }'::jsonb
);
```

---

## 5. Auto Token Refresh

The sync code automatically refreshes expired tokens:

### How It Works

1. Before syncing, checks `expires_at` timestamp
2. If expired, calls Etsy's token refresh endpoint
3. Updates `api_credentials` in database with new tokens
4. Continues with sync

### Refresh Endpoint

```bash
POST https://api.etsy.com/v3/public/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
client_id=YOUR_API_KEY
refresh_token=YOUR_REFRESH_TOKEN
```

Response:
```json
{
  "access_token": "new_access_token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "new_refresh_token"
}
```

### When Manual Re-auth is Needed

- User revokes app access in Etsy settings
- Etsy invalidates refresh token (rare)
- App permissions change

---

## 6. API Endpoints

### OAuth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/etsy/auth` | GET | Get OAuth authorization URL |
| `/api/etsy/callback` | GET | OAuth callback (token exchange) |

**Auth Parameters:**
- `brand` - Brand code (DC, BI, etc.)

### Sync Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/etsy/sync` | GET | Check connection status |
| `/api/etsy/sync` | POST | Sync orders from Etsy |

**Sync Request Body:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-27",
  "brandCode": "BI"
}
```

**Sync Response:**
```json
{
  "success": true,
  "message": "Etsy sync complete: 412 orders synced",
  "results": [
    {
      "brand": "Bright Ivy",
      "recordsSynced": 412,
      "errors": [],
      "dateRange": { "start": "2023-11-01", "end": "2026-01-27" }
    }
  ]
}
```

---

## 7. Order Data Mapping

### Etsy Receipt → Orders Table

| Etsy Field | Orders Column | Notes |
|------------|---------------|-------|
| `receipt_id` | `platform_order_id` | Unique identifier |
| `subtotal` | `subtotal` | **Product revenue only** |
| `total_shipping_cost` | `shipping_charged` | Shipping paid by customer |
| `total_tax_cost + total_vat_cost` | `tax` | Combined tax |
| `grandtotal` | `total` | Full amount |
| `country_iso` | `shipping_address.country_code` | For country analysis |
| `transactions` | `line_items` | Order items |
| `adjustments` | `raw_data.adjustments` | For refund detection |

### Critical: Revenue Definition

**Always use `subtotal` for revenue calculations, NOT `grandtotal`.**

- `subtotal` = Product prices only (excludes shipping/tax)
- `grandtotal` = Total customer payment (includes shipping/tax)

This ensures apples-to-apples comparison with Shopify.

---

## 8. Code Examples

### Etsy Client (TypeScript)

```typescript
// Fetch receipts from Etsy
export async function fetchEtsyReceipts(
  apiKey: string,
  shopId: string,
  accessToken: string,
  startDate?: Date,
  endDate?: Date
): Promise<EtsyReceipt[]> {
  const params = new URLSearchParams();
  params.set('limit', '100');

  if (startDate) {
    params.set('min_created', String(Math.floor(startDate.getTime() / 1000)));
  }
  if (endDate) {
    params.set('max_created', String(Math.floor(endDate.getTime() / 1000)));
  }

  const response = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${shopId}/receipts?${params}`,
    {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  const data = await response.json();
  return data.results;
}
```

### Verify Credentials

```typescript
export async function verifyEtsyCredentials(
  apiKey: string,
  shopId: string,
  accessToken: string
): Promise<{ valid: boolean; error?: string; shopName?: string }> {
  const response = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${shopId}`,
    {
      headers: {
        'x-api-key': apiKey,
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return { valid: false, error: `HTTP ${response.status}` };
  }

  const data = await response.json();
  return { valid: true, shopName: data.shop_name };
}
```

---

## 9. Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `invalid_token` | Access token expired | Auto-refresh will handle, or re-auth |
| `invalid_api_key` | Wrong API keystring | Check ETSY_*_API_KEY env var |
| `shop_id not found` | Wrong shop ID | Look up correct numeric shop ID |
| `insufficient_scope` | Missing permissions | Re-auth with correct scopes |

### Debug Token Status

```bash
curl https://your-domain.com/api/etsy/sync
```

Returns connection status for all configured stores.

---

## 10. Current Configuration

### Bright Ivy (BI)

| Setting | Value |
|---------|-------|
| Shop Name | BrightIvyUK |
| Shop ID | 48268436 |
| Shop URL | https://www.etsy.com/shop/BrightIvyUK |
| Total Sales | 439 |
| Rating | 4.98★ (61 reviews) |
| Store ID (DB) | 32cf8311-cfb0-430c-b9ea-7a1d2715cfcb |

### Display Champ (DC)

| Setting | Value |
|---------|-------|
| Shop ID | 54850131 |
| Store in DB | Yes (needs token refresh) |

---

## Quick Start Checklist

- [ ] Create Etsy Developer App
- [ ] Add callback URL to app settings
- [ ] Set environment variables (API_KEY, SHOP_ID)
- [ ] Run OAuth flow: `GET /api/etsy/auth?brand=XX`
- [ ] Open authUrl, authorize, get tokens
- [ ] Add tokens to env or database
- [ ] Test sync: `POST /api/etsy/sync`
- [ ] Verify in P&L dashboard
