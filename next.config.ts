import type { NextConfig } from "next";

// Security headers configuration
const securityHeaders = [
  {
    // Prevent clickjacking by only allowing same-origin framing
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    // Prevent MIME type sniffing
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    // Control referrer information sent with requests
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    // Restrict browser features/APIs
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    // Content Security Policy
    // Note: Next.js requires 'unsafe-inline' for styles and 'unsafe-eval' for development
    // In production, you may want to use nonces for stricter CSP
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://graph.facebook.com https://googleads.googleapis.com https://oauth2.googleapis.com https://api.etsy.com https://openapi.etsy.com https://api.xero.com https://identity.xero.com https://ssapi.shipstation.com https://vercel.live wss://vercel.live",
      "frame-src 'self' https://vercel.live",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; '),
  },
  {
    // Additional XSS protection (legacy, but still useful)
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
