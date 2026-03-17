import { NdaForm } from "@/components/nda/NdaForm";
import { NdaRecentTable } from "@/components/nda/NdaRecentTable";
import { NdaReviewPanel } from "@/components/nda/NdaReviewPanel";
import { getSheetRows } from "@/lib/google/sheets";
import type { AgreementRow } from "@/types/nda";

// TODO(auth): Add session check here

export const dynamic = "force-dynamic";

export default async function NdaPage() {
  let agreements: AgreementRow[] = [];

  const logsSheetId = process.env.LOGS_SHEETS_ID!;

  await Promise.allSettled([
    getSheetRows<AgreementRow>("NDAs", logsSheetId).then((r) => { agreements = r; }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">NDA</h1>
        <p className="text-gray-500 text-sm mt-1">
          Generate NDAs from Drive templates and review counterparty NDAs with AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NdaForm />
        <NdaRecentTable agreements={agreements} />
      </div>

      {/* AI-powered review for counterparty NDAs */}
      <NdaReviewPanel />
    </div>
  );
}
