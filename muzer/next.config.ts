
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http', // or 'https' depending on your image source
        hostname: 'example.com',
        // port: '', // Optional: if your images are served on a specific port
        // pathname: '/path/to/images/**', // Optional: if you want to restrict to certain paths
      },
      {
        protocol: 'https',
        hostname: 'another-cdn.com',
      },
      {
        protocol: 'https',
        hostname: 'third-party-image-provider.net',
      },
      // Add patterns for other domains or subdomains as needed
    ],
  },
  // ...other configurations
};

module.exports = nextConfig;