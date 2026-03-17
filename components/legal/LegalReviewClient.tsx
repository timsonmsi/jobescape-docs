"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LegalUpload } from "@/components/legal/LegalUpload";
import { RiskReport } from "@/components/legal/RiskReport";
import type { RiskReport as RiskReportType } from "@/types/legal";

export function LegalReviewClient() {
  const [report, setReport] = useState<RiskReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setReport(null);
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
      toast.success("Legal review complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left: upload */}
      <div className="w-full lg:w-96 shrink-0 space-y-4">
        <LegalUpload onUpload={handleUpload} loading={loading} />

        {loading && (
          <div className="text-center text-sm text-gray-500">
            Analyzing <strong>{filename}</strong>… this may take some time.
          </div>
        )}
      </div>

      {/* Right: report */}
      <div className="flex-1 min-w-0 w-full overflow-hidden">
        {report && <RiskReport report={report} />}
      </div>
    </div>
  );
}
