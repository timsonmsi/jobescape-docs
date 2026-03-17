import { getSheetRows } from "@/lib/google/sheets";
import type { InvoiceRow } from "@/types/invoice";

/**
 * Generate the next invoice number in the format INV-YYYY-MM-###.
 * Auto-increments within the current month.
 */
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `${year}-${month}-`;

  const invoices = await getSheetRows<InvoiceRow>("Invoices");

  const thisMonthNumbers = invoices
    .map((inv) => inv.invoice_number)
    .filter((n) => n?.startsWith(prefix))
    .map((n) => parseInt(n.replace(prefix, ""), 10))
    .filter((n) => !isNaN(n));

  const nextSeq =
    thisMonthNumbers.length > 0 ? Math.max(...thisMonthNumbers) + 1 : 1;

  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}
