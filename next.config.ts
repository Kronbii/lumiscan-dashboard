import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // sharp is loaded at runtime by the scan-image fallback route; keep it as a
  // native external instead of bundling it.
  serverExternalPackages: ["sharp"],
  images: {
    // Scan images are proxied same-origin (/api/scan-images) and re-encoded to
    // WebP. Keys are content-addressed and immutable, so cache the optimized
    // output for a month.
    formats: ["image/webp"],
    minimumCacheTTL: 2592000,
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-src 'self'",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ]
      .filter(Boolean)
      .join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
