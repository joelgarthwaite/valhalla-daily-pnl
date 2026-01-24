import { NextRequest, NextResponse } from 'next/server';
import { getTokenExpiration, verifyMetaToken } from '@/lib/meta/client';

const META_API_VERSION = 'v21.0';

/**
 * GET - Check current token status
 */
export async function GET() {
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'META_ACCESS_TOKEN not set in environment',
    });
  }

  const expiration = await getTokenExpiration(accessToken);

  return NextResponse.json({
    status: expiration.isExpired ? 'expired' : 'valid',
    expiresAt: expiration.expiresAt?.toISOString() || null,
    daysRemaining: expiration.daysRemaining,
    warning: expiration.daysRemaining !== null && expiration.daysRemaining < 7
      ? 'Token expires soon! Generate a new long-lived token.'
      : null,
  });
}

/**
 * POST - Exchange short-lived token for long-lived token
 *
 * Body: { shortLivedToken: string }
 *
 * Requires: META_APP_ID and META_APP_SECRET in environment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shortLivedToken } = body;

    if (!shortLivedToken) {
      return NextResponse.json(
        { error: 'shortLivedToken is required' },
        { status: 400 }
      );
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json(
        {
          error: 'META_APP_ID and META_APP_SECRET must be configured to exchange tokens',
          instructions: [
            '1. Go to developers.facebook.com/apps/',
            '2. Select your app',
            '3. Go to App Settings > Basic',
            '4. Copy App ID and App Secret',
            '5. Add to .env.local:',
            '   META_APP_ID=your_app_id',
            '   META_APP_SECRET=your_app_secret',
          ]
        },
        { status: 500 }
      );
    }

    // Exchange for long-lived token
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    });

    const url = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?${params}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: `Meta API Error: ${data.error.message}` },
        { status: 400 }
      );
    }

    const longLivedToken = data.access_token;
    const expiresIn = data.expires_in; // Usually 5184000 seconds (60 days)

    // Verify the new token
    const verification = await verifyMetaToken(longLivedToken);

    return NextResponse.json({
      success: true,
      longLivedToken,
      expiresIn,
      expiresAt: verification.expiresAt?.toISOString(),
      message: 'Token exchanged successfully! Update META_ACCESS_TOKEN in .env.local with the new token.',
      nextSteps: [
        '1. Copy the longLivedToken above',
        '2. Update .env.local: META_ACCESS_TOKEN=<new_token>',
        '3. Restart your development server',
        '4. Token is valid for 60 days',
      ],
    });
  } catch (error) {
    console.error('Error exchanging token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
