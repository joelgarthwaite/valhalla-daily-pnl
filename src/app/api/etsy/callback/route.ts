import { NextRequest, NextResponse } from 'next/server';

/**
 * Etsy OAuth 2.0 Callback
 *
 * Step 2: Exchange authorization code for access token
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return NextResponse.json(
      { error, description: errorDescription },
      { status: 400 }
    );
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state parameter' },
      { status: 400 }
    );
  }

  // Decode state to get brand and code_verifier
  let stateData: { brand: string; codeVerifier: string };
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch {
    return NextResponse.json(
      { error: 'Invalid state parameter' },
      { status: 400 }
    );
  }

  const { brand, codeVerifier } = stateData;

  // Get API key based on brand
  const apiKey = brand === 'BI'
    ? process.env.ETSY_BI_API_KEY
    : process.env.ETSY_DC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: `ETSY_${brand}_API_KEY not configured` },
      { status: 500 }
    );
  }

  // Build redirect URI (must match exactly what was used in /auth)
  const origin = request.headers.get('host')?.includes('localhost')
    ? `http://${request.headers.get('host')}`
    : `https://${request.headers.get('host')}`;
  const redirectUri = `${origin}/api/etsy/callback`;

  // Exchange code for tokens
  try {
    const tokenResponse = await fetch('https://api.etsy.com/v3/public/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: apiKey,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      return NextResponse.json(
        { error: 'Token exchange failed', details: errorText },
        { status: 400 }
      );
    }

    const tokens = await tokenResponse.json();

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    // Return tokens for user to save
    return new NextResponse(
      `<!DOCTYPE html>
<html>
<head>
  <title>Etsy OAuth Success</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #f56400; }
    .token-box { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; overflow-x: auto; }
    code { font-family: monospace; font-size: 14px; }
    .env-var { color: #0066cc; font-weight: bold; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .success { background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>✅ Etsy OAuth Successful!</h1>

  <div class="success">
    <strong>Brand:</strong> ${brand}<br>
    <strong>Token expires:</strong> ${expiresAt}
  </div>

  <h2>Add these to your .env.local file:</h2>

  <div class="token-box">
    <code>
      <span class="env-var">ETSY_${brand}_ACCESS_TOKEN</span>="${tokens.access_token}"<br><br>
      <span class="env-var">ETSY_${brand}_REFRESH_TOKEN</span>="${tokens.refresh_token}"
    </code>
  </div>

  <h2>Also add to Vercel Environment Variables:</h2>

  <div class="token-box">
    <code>
      ETSY_${brand}_ACCESS_TOKEN = ${tokens.access_token}<br><br>
      ETSY_${brand}_REFRESH_TOKEN = ${tokens.refresh_token}
    </code>
  </div>

  <div class="warning">
    <strong>⚠️ Important:</strong>
    <ul>
      <li>Access token expires in ${Math.round(tokens.expires_in / 3600)} hours</li>
      <li>The refresh token will be used to automatically get new access tokens</li>
      <li>Store these securely - they grant access to your Etsy shop data</li>
    </ul>
  </div>

  <h2>Raw Token Response:</h2>
  <div class="token-box">
    <pre>${JSON.stringify(tokens, null, 2)}</pre>
  </div>
</body>
</html>`,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Token exchange error', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
