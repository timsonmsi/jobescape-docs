import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { MonthYearPicker } from "@/components/invoices/MonthYearPicker";
import { getSheetRows } from "@/lib/google/sheets";
import type { InvoiceRow, EmployeeRow } from "@/types/invoice";
import { AlertCircle, FolderOpen } from "lucide-react";

// TODO(auth): Add session check here

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface PageProps {
  searchParams: { month?: string; year?: string };
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const now = new Date();
  const month = searchParams.month ?? MONTH_NAMES[now.getMonth()];
  const year = Number(searchParams.year ?? now.getFullYear());
  const sheetName = `${month} ${year}`;

  let invoices: InvoiceRow[] = [];
  let employeeMap: Record<string, string> = {};
  let sheetMissing = false;
  let error: string | null = null;

  try {
    const [invoiceRows, employeeRows] = await Promise.all([
      getSheetRows<InvoiceRow>(sheetName),
      getSheetRows<EmployeeRow>("Employees"),
    ]);
    invoices = invoiceRows;
    employeeMap = Object.fromEntries(
      employeeRows.map((e) => [e.employee_id, e.supplier_name])
    );
    if (invoices.length === 0) sheetMissing = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    // Sheets returns an error when the tab doesn't exist
    if (msg.includes("Unable to parse range") || msg.includes("not found")) {
      sheetMissing = true;
    } else {
      error = msg || "Failed to load data from Google Sheets";
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Select a month to load and generate salary invoices.
          </p>
        </div>
        <MonthYearPicker month={month} year={year} />
      </div>

      {/* API/auth error */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <strong>Failed to load Sheets data:</strong> {error}
            <br />
            <span className="text-xs text-red-500">
              Check your GOOGLE_SERVICE_ACCOUNT_JSON and SHEETS_ID env vars, and
              ensure the sheet is shared with the service account.
            </span>
          </div>
        </div>
      )}

      {/* Sheet not found */}
      {sheetMissing && !error && (
        <div className="flex flex-col items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl py-16 text-center">
          <FolderOpen size={36} className="text-gray-300" />
          <div>
            <p className="text-sm font-medium text-gray-700">
              No sheet found for <span className="font-semibold">{sheetName}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Create a tab named exactly &ldquo;{sheetName}&rdquo; in your Google Sheets
              with the invoice columns.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {!sheetMissing && !error && (
        <InvoiceTable
          invoices={invoices}
          employeeMap={employeeMap}
          sheetName={sheetName}
        />
      )}
    </div>
  );
}
