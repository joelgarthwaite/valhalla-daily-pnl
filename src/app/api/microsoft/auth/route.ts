/**
 * Microsoft Advertising OAuth Initiation
 * GET /api/microsoft/auth - Redirects to Microsoft OAuth consent page
 */

import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/microsoft/client';

export async function GET(request: Request) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'Microsoft OAuth not configured. Set MICROSOFT_CLIENT_ID in environment.' },
      { status: 500 }
    );
  }

  // Build the redirect URI based on the request
  const url = new URL(request.url);
  const isProduction = process.env.VERCEL_ENV === 'production';
  const baseUrl = isProduction
    ? 'https://pnl.displaychamp.com'
    : `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/microsoft/callback`;

  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2);

  const authUrl = getAuthorizationUrl(clientId, redirectUri, state);

  return NextResponse.redirect(authUrl);
}
