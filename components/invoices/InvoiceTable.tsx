"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GenerateButton } from "./GenerateButton";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, FileDown, Loader2 } from "lucide-react";
import type { InvoiceRow } from "@/types/invoice";

interface InvoiceTableProps {
  invoices: InvoiceRow[];
  employeeMap: Record<string, string>;
  sheetName: string;
}

const STATUS_COLORS: Record<string, string> = {
  generated: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  error: "bg-red-100 text-red-700 border-red-200",
};

export function InvoiceTable({ invoices: initialInvoices, employeeMap, sheetName }: InvoiceTableProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Sync when server sends fresh data after router.refresh()
  useEffect(() => {
    setInvoices(initialInvoices);
    setSelected(new Set());
  }, [initialInvoices]);

  const allSelected =
    invoices.length > 0 && invoices.every((inv) => selected.has(inv.invoice_number));

  const handleGenerated = (invoiceNumber: string, pdfUrl: string) => {
    setInvoices((prev) =>
      prev.map((row) =>
        row.invoice_number === invoiceNumber
          ? { ...row, status: "generated", pdf_url: pdfUrl }
          : row
      )
    );
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoices.map((inv) => inv.invoice_number)));
    }
  };

  const handleToggle = (invoiceNumber: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceNumber)) next.delete(invoiceNumber);
      else next.add(invoiceNumber);
      return next;
    });
  };

  const handleBulkGenerate = async () => {
    const toGenerate = invoices.filter((inv) => selected.has(inv.invoice_number));
    if (toGenerate.length === 0) return;

    setBulkGenerating(true);
    setBulkProgress({ done: 0, total: toGenerate.length });
    let successCount = 0;

    for (let i = 0; i < toGenerate.length; i++) {
      const inv = toGenerate[i];
      try {
        const res = await fetch(
          `/api/invoices/${encodeURIComponent(inv.invoice_number)}/generate?sheet=${encodeURIComponent(sheetName)}`,
          { method: "POST" }
        );
        const json = await res.json();
        if (!json.ok) throw new Error(json.message);
        handleGenerated(inv.invoice_number, json.data.pdfUrl);
        successCount++;
      } catch (err) {
        toast.error(
          `${inv.invoice_number}: ${err instanceof Error ? err.message : "Failed"}`
        );
      }
      setBulkProgress({ done: i + 1, total: toGenerate.length });
    }

    setBulkGenerating(false);
    setBulkProgress(null);
    setSelected(new Set());
    if (successCount > 0) {
      toast.success(`Generated ${successCount} of ${toGenerate.length} invoice(s)`);
    }
  };

  if (invoices.length === 0) {
    return null; // empty state is handled by the page
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSelectAll}
          className="text-gray-600"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </Button>

        {selected.size > 0 && (
          <Button
            size="sm"
            onClick={handleBulkGenerate}
            disabled={bulkGenerating}
            className="bg-[#2B45F5] hover:bg-[#2338d4] text-white"
          >
            {bulkGenerating ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" />
                {bulkProgress
                  ? `Generating ${bulkProgress.done}/${bulkProgress.total}…`
                  : "Generating…"}
              </>
            ) : (
              <>
                <FileDown size={14} className="mr-1.5" />
                Generate {selected.size} Selected
              </>
            )}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            {selected.size > 0 && (
              <span className="ml-1 text-[#2B45F5]">· {selected.size} selected</span>
            )}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isPending}
            className="text-gray-500 hover:text-gray-700"
          >
            <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
            <span className="ml-1.5">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-[#2B45F5] focus:ring-[#2B45F5] cursor-pointer"
                />
              </th>
              {["Invoice #", "Date", "Due", "Period", "Employee", "Amount (KZT)", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.map((inv) => (
              <tr
                key={inv.invoice_number}
                className={`transition-colors ${
                  selected.has(inv.invoice_number)
                    ? "bg-[#ECEFFE]/60"
                    : "hover:bg-gray-50/60"
                }`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(inv.invoice_number)}
                    onChange={() => handleToggle(inv.invoice_number)}
                    className="rounded border-gray-300 text-[#2B45F5] focus:ring-[#2B45F5] cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">
                  {inv.invoice_number}
                </td>
                <td className="px-4 py-3 text-gray-600">{inv.invoice_date}</td>
                <td className="px-4 py-3 text-gray-600">{inv.due_date}</td>
                <td className="px-4 py-3 text-gray-600">{inv.service_period}</td>
                <td className="px-4 py-3 text-gray-600">
                  {employeeMap[inv.employee_id] ?? inv.employee_id}
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">
                  {Number(inv.amount_kzt || 0).toLocaleString("ru-KZ")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      STATUS_COLORS[inv.status] ?? "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {inv.status || "pending"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <GenerateButton
                      invoiceNumber={inv.invoice_number}
                      sheetName={sheetName}
                      onSuccess={(url) => handleGenerated(inv.invoice_number, url)}
                    />
                    {inv.pdf_url && (
                      <a
                        href={inv.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#2B45F5] hover:underline"
                      >
                        <ExternalLink size={12} />
                        Open
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
