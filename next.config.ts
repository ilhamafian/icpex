import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the MongoDB Node driver out of client/edge bundles.
  serverExternalPackages: ["mongodb"],
};

export default nextConfig;
