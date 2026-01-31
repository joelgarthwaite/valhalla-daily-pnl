/**
 * Microsoft Advertising OAuth Callback
 * GET /api/microsoft/callback - Handles OAuth callback and exchanges code for tokens
 */

import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/microsoft/client';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    return NextResponse.json(
      { error: `OAuth error: ${error}`, description: errorDescription },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code received' },
      { status: 400 }
    );
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Microsoft OAuth not configured' },
      { status: 500 }
    );
  }

  // Build the redirect URI (must match what was used in auth request)
  const isProduction = process.env.VERCEL_ENV === 'production';
  const baseUrl = isProduction
    ? 'https://pnl.displaychamp.com'
    : `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/microsoft/callback`;

  try {
    const tokens = await exchangeCodeForTokens(
      clientId,
      clientSecret,
      code,
      redirectUri
    );

    // Return the tokens for the user to save
    // In production, you'd store these securely in the database
    return NextResponse.json({
      success: true,
      message: 'Microsoft Advertising connected successfully!',
      instructions: 'Save the refresh token in your environment variables as MICROSOFT_REFRESH_TOKEN',
      tokens: {
        accessToken: tokens.accessToken.substring(0, 20) + '...',
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      },
    });
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to exchange code for tokens' },
      { status: 500 }
    );
  }
}
