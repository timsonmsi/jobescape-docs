// TODO(auth): Add session check here

import { LegalReviewClient } from "@/components/legal/LegalReviewClient";
import { getSheetRows } from "@/lib/google/sheets";
import type { LegalReviewRow } from "@/types/legal";

export const dynamic = "force-dynamic";

export default async function LegalPage() {
  let history: LegalReviewRow[] = [];

  const logsSheetId = process.env.LOGS_SHEETS_ID!;

  try {
    history = await getSheetRows<LegalReviewRow>("LegalReviews", logsSheetId);
  } catch {
    // LegalReviews sheet may not exist yet
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Legal Document Review</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload a contract or legal document for AI-powered risk analysis.
        </p>
      </div>

      <LegalReviewClient initialHistory={history} />
    </div>
  );
}
