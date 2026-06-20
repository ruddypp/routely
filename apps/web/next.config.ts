import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: resolve(process.cwd(), "../..")
  }
};

export default nextConfig;
