"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RiskReport } from "@/components/legal/RiskReport";
import { UploadCloud, FileText, X, Loader2, ShieldCheck } from "lucide-react";
import type { RiskReport as RiskReportType } from "@/types/legal";

const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export function NdaReviewPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<RiskReportType | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File) => {
    if (!ACCEPTED_MIME.includes(f.type)) {
      toast.error("Unsupported format. Please upload a PDF, DOCX, or TXT file.");
      return;
    }
    setFile(f);
    setReport(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) pick(dropped);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (chosen) pick(chosen);
    e.target.value = "";
  };

  const handleAnalyze = async () => {
    if (!file || loading) return;
    setLoading(true);
    setReport(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/nda/review", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setReport(json.data.report);
      toast.success("NDA review complete");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <ShieldCheck size={18} className="text-[#2B45F5]" />
        <div>
          <h2 className="text-sm font-semibold text-gray-900">NDA Review</h2>
          <p className="text-xs text-gray-400">
            Upload an NDA from a counterparty — AI will flag risky clauses.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        {/* Left: upload + analyze */}
        <div className="p-5 space-y-4 lg:w-80 shrink-0">
          {/* Drop zone */}
          <div
            onClick={() => !loading && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center gap-2.5 rounded-lg border-2 border-dashed px-6 py-8 cursor-pointer transition-colors text-center ${
              dragging
                ? "border-[#2B45F5] bg-[#ECEFFE]"
                : file
                ? "border-[#2B45F5]/40 bg-[#ECEFFE]/30"
                : "border-gray-200 bg-gray-50 hover:border-[#2B45F5]/40 hover:bg-[#ECEFFE]/20"
            } ${loading ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleChange}
              className="hidden"
            />

            {file ? (
              <>
                <FileText size={28} className="text-[#2B45F5]" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(file.size / 1024).toFixed(1)} KB · Click to replace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setReport(null); }}
                  className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <UploadCloud size={28} className="text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Drop NDA here or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">PDF, DOCX, or TXT · max 50 MB</p>
                </div>
              </>
            )}
          </div>

          {/* Analyze button */}
          <Button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="w-full bg-[#2B45F5] hover:bg-[#2B45F5]/90 text-white"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin mr-2" />
                Analyzing NDA…
              </>
            ) : (
              <>
                <ShieldCheck size={15} className="mr-2" />
                Analyze NDA
              </>
            )}
          </Button>

          {loading && (
            <p className="text-xs text-center text-gray-400">
              Reviewing clauses with AI — this may take some time.
            </p>
          )}
        </div>

        {/* Right: report */}
        {report && (
          <div className="flex-1 overflow-auto">
            <RiskReport report={report} />
          </div>
        )}
      </div>
    </div>
  );
}
