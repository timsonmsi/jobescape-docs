"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LegalUpload } from "@/components/legal/LegalUpload";
import { RiskReport } from "@/components/legal/RiskReport";
import { FileText, Clock, ChevronRight } from "lucide-react";
import type { RiskReport as RiskReportType, LegalReviewRow } from "@/types/legal";

function scoreColor(score: number) {
  if (score >= 70) return "bg-red-100 text-red-700";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}

function rowToReport(row: LegalReviewRow): RiskReportType {
  return {
    risk_score: Number(row.risk_score),
    summary: row.summary || "No summary stored.",
    red_flags: row.red_flags ? JSON.parse(row.red_flags) : [],
    recommendations: row.recommendations ? JSON.parse(row.recommendations) : [],
  };
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

interface Props {
  initialHistory?: LegalReviewRow[];
}

export function LegalReviewClient({ initialHistory = [] }: Props) {
  const [report, setReport] = useState<RiskReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [history, setHistory] = useState<LegalReviewRow[]>([...initialHistory].reverse());
  const [selectedRow, setSelectedRow] = useState<LegalReviewRow | null>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setReport(null);
    setSelectedRow(null);
    setFilename(file.name);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/legal/review", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.message);

      setReport(json.data.report);
      setHistory((prev) => [json.data.row, ...prev]);
      toast.success("Legal review complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryClick = (row: LegalReviewRow) => {
    setSelectedRow(row);
    setReport(null);
  };

  const activeReport = report ?? (selectedRow ? rowToReport(selectedRow) : null);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left: upload */}
      <div className="w-full lg:w-96 shrink-0 space-y-4">
        <LegalUpload onUpload={handleUpload} loading={loading} />

        {loading && (
          <div className="text-center text-sm text-gray-500">
            Analyzing <strong>{filename}</strong>… this may take a moment.
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Clock size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Recent Reviews</span>
            </div>
            <div className="divide-y divide-gray-50">
              {history.slice(0, 15).map((row) => (
                <button
                  key={row.review_id}
                  onClick={() => handleHistoryClick(row)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selectedRow?.review_id === row.review_id
                      ? "bg-[#ECEFFE]"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <FileText size={14} className="shrink-0 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{row.filename}</p>
                    <p className="text-xs text-gray-400">{formatDate(row.created_at)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${scoreColor(Number(row.risk_score))}`}>
                    {row.risk_score}
                  </span>
                  <ChevronRight size={13} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: report */}
      <div className="flex-1 min-w-0 w-full overflow-hidden">
        {activeReport && (
          <>
            {selectedRow && (
              <div className="flex items-center gap-2 mb-3 text-sm text-gray-500 overflow-hidden">
                <FileText size={14} className="shrink-0 text-gray-400" />
                <span className="truncate flex-1 min-w-0">{selectedRow.filename}</span>
                <span className="ml-auto text-xs shrink-0">{formatDate(selectedRow.created_at)}</span>
              </div>
            )}
            <RiskReport report={activeReport} />
          </>
        )}
      </div>
    </div>
  );
}
