/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "googleapis",
      "google-auth-library",
      "docxtemplater",
      "pizzip",
      "mammoth",
      "pdf-parse",
    ],
  },
};

export default nextConfig;
