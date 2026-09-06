import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  /* The badge sits exactly where the location readout does, and this is a
     full-viewport experience with nowhere else to put either. */
  devIndicators: false,
};

export default nextConfig;
