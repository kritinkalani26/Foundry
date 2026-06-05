/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    // Enable async WebAssembly for occt-import-js (STEP file parser)
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
