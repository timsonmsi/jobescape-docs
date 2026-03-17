"use client";

import { useSession } from "next-auth/react";
import { FileText, FileSignature, Scale } from "lucide-react";
import { ModuleTile } from "@/components/dashboard/ModuleTile";

export default function DashboardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          DocEscape Ops Dashboard
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Generate invoices, NDAs, and review legal documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isAdmin && (
          <ModuleTile
            title="Invoices"
            description="Generate PDF invoices from Google Sheets data and DOCX templates. Upload to Drive and track status."
            href="/invoices"
            icon={FileText}
          />
        )}
        <ModuleTile
          title="NDA Generator"
          description="Create Non-Disclosure Agreements from templates. Choose disclosure party and receiving type."
          href="/nda"
          icon={FileSignature}
        />
        <ModuleTile
          title="Legal Review"
          description="Upload contracts for AI-powered risk analysis. Get risk scores, red flags, and recommendations."
          href="/legal"
          icon={Scale}
        />
      </div>
    </div>
  );
}
