// next.config.js

/** @type {import('next').NextConfig} */ // Optional: JSDoc for type hints
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // ... other configurations you had
  // For example, if you had images:
  // images: {
  //   domains: ['example.com'],
  // },
};

module.exports = nextConfig; // <--- This is the crucial part for .js files