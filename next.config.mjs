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
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
