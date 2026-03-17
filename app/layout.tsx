import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/auth/SessionProvider";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DocEscape Ops",
  description: "Internal document operations suite for DocEscape",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <NextTopLoader color="#2B45F5" height={3} showSpinner={false} />
        <SessionProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-slate-50 p-6 pt-20 md:pt-6">
              {children}
            </main>
          </div>
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
