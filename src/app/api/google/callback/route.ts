import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { error: `OAuth error: ${error}` },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: 'No authorization code received' },
      { status: 400 }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Google OAuth credentials not configured' },
      { status: 500 }
    );
  }

  const redirectUri = process.env.NODE_ENV === 'production'
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`
    : 'http://localhost:3000/api/google/callback';

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      return NextResponse.json(
        { error: `Token error: ${tokens.error_description || tokens.error}` },
        { status: 400 }
      );
    }

    // Return the refresh token to be saved
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Ads Authorization Complete</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .success { color: #16a34a; }
            .token { background: #f3f4f6; padding: 16px; border-radius: 8px; word-break: break-all; margin: 16px 0; }
            code { font-size: 14px; }
            .instructions { background: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <h1 class="success">Google Ads Authorization Complete!</h1>
          <p>Your refresh token has been generated. Copy it and add it to your environment variables.</p>

          <h3>Refresh Token:</h3>
          <div class="token">
            <code>${tokens.refresh_token || 'No refresh token received - you may have already authorized this app. Try revoking access at myaccount.google.com/permissions and try again.'}</code>
          </div>

          <div class="instructions">
            <h3>Next Steps:</h3>
            <ol>
              <li>Copy the refresh token above</li>
              <li>Add it to your <code>.env.local</code> file:</li>
              <li><code>GOOGLE_REFRESH_TOKEN=${tokens.refresh_token || 'your_token_here'}</code></li>
              <li>Restart your development server</li>
            </ol>
          </div>

          <p style="margin-top: 24px;">
            <a href="/admin/ad-spend">← Back to Ad Spend</a>
          </p>
        </body>
      </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
