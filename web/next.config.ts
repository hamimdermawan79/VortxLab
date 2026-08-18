import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['adm-zip'],
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb'
    }
  }
};

export default nextConfig;
