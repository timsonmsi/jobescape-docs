"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";

interface GenerateButtonProps {
  employeeId: string;
  sheetName: string;
  onSuccess: (driveLink: string) => void;
}

export function GenerateButton({ employeeId, sheetName, onSuccess }: GenerateButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/invoices/${encodeURIComponent(employeeId)}/generate?sheet=${encodeURIComponent(sheetName)}`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      toast.success("Invoice generated successfully");
      onSuccess(json.data.driveLink);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleGenerate}
      disabled={loading}
      className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <FileDown size={14} />
      )}
      <span className="ml-1.5">{loading ? "Generating…" : "Generate"}</span>
    </Button>
  );
}
