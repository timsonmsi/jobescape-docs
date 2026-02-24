import { FileText, FileSignature, Scale } from "lucide-react";
import { ModuleTile } from "@/components/dashboard/ModuleTile";

// TODO(auth): Add session check here

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          JobEscape Ops Dashboard
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Generate invoices, NDAs, and review legal documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ModuleTile
          title="Invoices"
          description="Generate PDF invoices from Google Sheets data and DOCX templates. Upload to Drive and track status."
          href="/invoices"
          icon={FileText}
        />
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
