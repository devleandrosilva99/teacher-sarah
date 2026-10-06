import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Endereços do protótipo antigo.
  async redirects() {
    return [
      { source: "/login", destination: "/entrar", permanent: false },
      { source: "/professora/:path*", destination: "/professor", permanent: false },
    ];
  },
};

export default nextConfig;
