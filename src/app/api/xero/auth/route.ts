import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Xero OAuth 2.0 Authorization
 *
 * Step 1: Redirect user to Xero to authorize the app
 * Uses PKCE (Proof Key for Code Exchange) for security
 */

const XERO_AUTH_URL = 'https://login.xero.com/identity/connect/authorize';
const SCOPES = [
  'openid',
  'profile',
  'email',
  'accounting.reports.read',
  'accounting.settings.read',
  'accounting.transactions.read',  // For invoices
  'offline_access', // Required for refresh tokens
];

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get('brand') || 'DC';

  const clientId = process.env.XERO_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        error: 'XERO_CLIENT_ID not configured',
        instructions: [
          '1. Go to https://developer.xero.com/app/manage',
          '2. Create a new app or select existing',
          '3. Copy the Client ID',
          '4. Add to .env.local: XERO_CLIENT_ID=your_client_id',
          '5. Also add: XERO_CLIENT_SECRET=your_client_secret',
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
  const redirectUri = `${origin}/api/xero/callback`;

  // State includes brand and code_verifier for the callback
  const state = Buffer.from(
    JSON.stringify({ brand, codeVerifier })
  ).toString('base64url');

  // Xero OAuth authorization URL
  const authUrl = new URL(XERO_AUTH_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', SCOPES.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  // Redirect directly to Xero
  return NextResponse.redirect(authUrl.toString());
}
