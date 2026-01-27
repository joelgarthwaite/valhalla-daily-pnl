import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeCodeForTokens, getXeroTenants } from '@/lib/xero/client';

/**
 * Xero OAuth 2.0 Callback
 *
 * Step 2: Exchange authorization code for access token
 * Stores tokens in database and associates with brand
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return new NextResponse(
      renderErrorPage(error, errorDescription || 'Unknown error'),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code || !state) {
    return new NextResponse(
      renderErrorPage('Missing parameters', 'No authorization code or state received'),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Decode state to get brand and code_verifier
  let stateData: { brand: string; codeVerifier: string };
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch {
    return new NextResponse(
      renderErrorPage('Invalid state', 'Could not decode state parameter'),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const { brand, codeVerifier } = stateData;

  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      renderErrorPage('Configuration error', 'Xero credentials not configured'),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Build redirect URI (must match exactly what was used in /auth)
  const origin = request.headers.get('host')?.includes('localhost')
    ? `http://${request.headers.get('host')}`
    : `https://${request.headers.get('host')}`;
  const redirectUri = `${origin}/api/xero/callback`;

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      code,
      redirectUri,
      clientId,
      clientSecret,
      codeVerifier
    );

    // Get connected tenants to find the tenant ID
    const tenants = await getXeroTenants(tokens.access_token);

    if (tenants.length === 0) {
      return new NextResponse(
        renderErrorPage('No organizations', 'No Xero organizations connected. Please authorize at least one organization.'),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Use the first tenant (or could allow selection)
    const tenant = tenants[0];
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store tokens in database using service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get brand ID from code
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('code', brand)
      .single();

    if (brandError || !brandData) {
      return new NextResponse(
        renderErrorPage('Brand not found', `Could not find brand with code: ${brand}`),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Upsert the connection (insert or update if exists)
    const { error: upsertError } = await supabase
      .from('xero_connections')
      .upsert(
        {
          brand_id: brandData.id,
          tenant_id: tenant.tenantId,
          tenant_name: tenant.tenantName,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokenExpiresAt.toISOString(),
          scopes: tokens.scope.split(' '),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'brand_id',
        }
      );

    if (upsertError) {
      console.error('Error saving Xero connection:', upsertError);
      return new NextResponse(
        renderErrorPage('Database error', `Failed to save connection: ${upsertError.message}`),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Return success page
    return new NextResponse(
      renderSuccessPage(brand, brandData.name, tenant.tenantName, tokenExpiresAt),
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    console.error('Xero OAuth error:', err);
    return new NextResponse(
      renderErrorPage('OAuth error', err instanceof Error ? err.message : 'Unknown error'),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

function renderSuccessPage(
  brandCode: string,
  brandName: string,
  tenantName: string,
  expiresAt: Date
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Xero Connected</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
    h1 { color: #13b5ea; }
    .success { background: #d4edda; border: 1px solid #28a745; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .info { background: #e8f4fd; border: 1px solid #13b5ea; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .details { margin-top: 15px; }
    .details dt { font-weight: bold; color: #666; margin-top: 10px; }
    .details dd { margin-left: 0; }
    a.button {
      display: inline-block;
      background: #13b5ea;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
    a.button:hover { background: #0f9bd8; }
  </style>
</head>
<body>
  <h1>Xero Connected Successfully!</h1>

  <div class="success">
    <strong>Connected:</strong> ${brandName} is now linked to Xero.
  </div>

  <div class="info">
    <dl class="details">
      <dt>Brand</dt>
      <dd>${brandName} (${brandCode})</dd>

      <dt>Xero Organization</dt>
      <dd>${tenantName}</dd>

      <dt>Token Expires</dt>
      <dd>${expiresAt.toLocaleString()} (auto-refresh enabled)</dd>
    </dl>
  </div>

  <p>Bank balances will now appear on your P&L dashboard. The connection will automatically refresh when tokens expire.</p>

  <a href="/admin/xero" class="button">Go to Xero Settings</a>
  <a href="/" class="button" style="background: #6c757d; margin-left: 10px;">Go to Dashboard</a>
</body>
</html>`;
}

function renderErrorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Xero Connection Error</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
    h1 { color: #dc3545; }
    .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    a.button {
      display: inline-block;
      background: #13b5ea;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <h1>Connection Failed</h1>

  <div class="error">
    <strong>${title}</strong>
    <p>${message}</p>
  </div>

  <p>Please try again or contact support if the problem persists.</p>

  <a href="/admin/xero" class="button">Back to Xero Settings</a>
</body>
</html>`;
}
