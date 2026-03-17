import { ExternalLink } from "lucide-react";
import type { AgreementRow } from "@/types/nda";

interface NdaRecentTableProps {
  agreements: AgreementRow[];
}

export function NdaRecentTable({ agreements }: NdaRecentTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">
          Recent NDAs
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {agreements.length} agreement{agreements.length !== 1 ? "s" : ""}
        </p>
      </div>

      {agreements.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-gray-400">
            No NDAs generated yet. Use the form to create the first one.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
          {[...agreements]
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .map((ag) => (
              <div
                key={ag.agreement_id}
                className="px-5 py-3 hover:bg-blue-50/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {ag.receiving_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {ag.disclosure_party} · {ag.receiving_type} ·{" "}
                      {ag.effective_date}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {ag.purpose}
                    </p>
                  </div>
                  {ag.drive_link && (
                    <a
                      href={ag.drive_link}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-blue-500 hover:text-blue-700"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
