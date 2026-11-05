import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The store is opened at 127.0.0.1. Without this, Next blocks CSS and JS and the page looks blank.
  allowedDevOrigins: ["127.0.0.1", "10.211.55.2"],
  // Commerce pages must show live price and stock. The starter cache-component
  // mode prerenders a static shell and is the wrong default for checkout.
  serverExternalPackages: ["postgres", "embedded-postgres", "bcryptjs"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
