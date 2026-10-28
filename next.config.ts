import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La app es mayormente autenticada y dinámica (sesión Supabase en cookies),
  // por eso usamos el modelo de renderizado dinámico clásico en lugar de Cache Components.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
