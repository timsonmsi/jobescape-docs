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
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
