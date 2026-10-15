import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Node-only drivers (MongoDB, SMTP) out of client/edge bundles.
  serverExternalPackages: ["mongodb", "nodemailer"],
};

export default nextConfig;
