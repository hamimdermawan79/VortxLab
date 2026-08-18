import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['adm-zip'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
    proxyClientMaxBodySize: '50mb',
    middlewareClientMaxBodySize: '50mb',
  } as any
};

export default nextConfig;
