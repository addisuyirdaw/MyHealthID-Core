/** @type {import('next').NextConfig} */
const nextConfig = {
  // This is a pure App Router project (no Pages Router).
  // This config resolves the /_document PageNotFoundError during `next build`.
  images: {
    // Allow images from any hostname for flexibility during development.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
