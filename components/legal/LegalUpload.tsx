"use client";

import { useRef } from "react";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LegalUploadProps {
  onUpload: (file: File) => void;
  loading: boolean;
}

export function LegalUpload({ onUpload, loading }: LegalUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    onUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center",
        "hover:border-blue-300 transition-colors",
        loading && "opacity-60 pointer-events-none"
      )}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center">
          {loading ? (
            <FileText size={24} className="text-blue-400 animate-pulse" />
          ) : (
            <Upload size={24} className="text-blue-500" />
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700">
            {loading ? "Analyzing document…" : "Drop your document here"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Supported: PDF, DOCX, TXT — max 50 MB
          </p>
        </div>

        {!loading && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            Browse file
          </Button>
        )}
      </div>
    </div>
  );
}
