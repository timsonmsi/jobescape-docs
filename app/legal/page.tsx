// TODO(auth): Add session check here

import { LegalReviewClient } from "@/components/legal/LegalReviewClient";

export const dynamic = "force-dynamic";

export default function LegalPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Legal Document Review</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload a contract or legal document for AI-powered risk analysis.
        </p>
      </div>

      <LegalReviewClient />
    </div>
  );
}
