import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Etsy OAuth 2.0 Authorization
 *
 * Step 1: Redirect user to Etsy to authorize the app
 *
 * Etsy OAuth uses PKCE (Proof Key for Code Exchange)
 */

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export async function GET(request: NextRequest) {
  // Get the brand from query params (default to DC)
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get('brand') || 'DC';

  // Get the correct API key for the brand
  const apiKey = brand === 'BI'
    ? process.env.ETSY_BI_API_KEY
    : process.env.ETSY_DC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: `ETSY_${brand}_API_KEY not configured`,
        instructions: [
          '1. Go to https://www.etsy.com/developers/your-apps',
          '2. Select or create your app',
          '3. Copy the Keystring (API Key)',
          `4. Add to .env.local: ETSY_${brand}_API_KEY=your_keystring`,
        ],
      },
      { status: 500 }
    );
  }

  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Build redirect URI
  const origin = request.headers.get('host')?.includes('localhost')
    ? `http://${request.headers.get('host')}`
    : `https://${request.headers.get('host')}`;
  const redirectUri = `${origin}/api/etsy/callback`;

  // State includes brand and code_verifier for the callback
  const state = Buffer.from(
    JSON.stringify({ brand, codeVerifier })
  ).toString('base64url');

  // Etsy OAuth authorization URL
  const authUrl = new URL('https://www.etsy.com/oauth/connect');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', apiKey);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'transactions_r shops_r');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return NextResponse.json({
    message: 'Redirect to this URL to authorize Etsy access',
    authUrl: authUrl.toString(),
    instructions: [
      '1. Open the authUrl in your browser',
      '2. Log in to Etsy and authorize the app',
      '3. You will be redirected back with the tokens',
      '4. Copy the tokens to your .env.local file',
    ],
    redirectUri,
    brand,
  });
}
