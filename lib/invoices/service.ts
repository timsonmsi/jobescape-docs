import { format } from "date-fns";
import { getSheetRows, getKeyValueSheet, updateSheetCells } from "@/lib/google/sheets";
import {
  downloadDriveFile,
  findDriveFileByName,
  getDriveFileMeta,
} from "@/lib/google/drive";
import { renderDocxTemplate } from "@/lib/docx/render";
import { convertDocxToPdf } from "@/lib/pdf/convert";
import { sanitizeFilename } from "@/lib/utils/sanitize";
import { saveToGoogleDrive } from "@/lib/utils/driveStore";
import type { InvoiceRow, EmployeeRow } from "@/types/invoice";

export interface GenerateInvoiceResult {
  pdfUrl: string;
  driveFileId: string;
  invoiceNumber: string;
}

/**
 * Generate a PDF for the invoice identified by invoiceNumber.
 * Reads data from Google Sheets, fills the DOCX template from Drive,
 * converts to PDF, uploads to Drive, and writes back the result to Sheets.
 */
export async function generateInvoicePdf(
  invoiceNumber: string,
  sheetName: string
): Promise<GenerateInvoiceResult> {
  // 1. Load all required sheets data in parallel
  const [invoices, employees, company] = await Promise.all([
    getSheetRows<InvoiceRow>(sheetName),
    getSheetRows<EmployeeRow>("Employees"),
    getKeyValueSheet("Company"),   // key-value format: field -> value
  ]);

  // 2. Find the specific invoice row (0-based index in data array)
  const invoiceIndex = invoices.findIndex(
    (inv) => inv.invoice_number === invoiceNumber
  );
  if (invoiceIndex === -1) {
    throw new Error(`Invoice not found: ${invoiceNumber}`);
  }
  const invoice = invoices[invoiceIndex];

  // 3. Find the employee
  const employee = employees.find(
    (e) => e.employee_id === invoice.employee_id
  );
  if (!employee) {
    throw new Error(
      `Employee not found for employee_id: ${invoice.employee_id}`
    );
  }

  // 4. Check company data is present
  if (!company.buyer_name) {
    throw new Error("Company data not found in Sheets (Company tab is empty or missing buyer_name)");
  }

  // 5. Build merged template data
  const templateData: Record<string, string | number> = {
    ...invoice,
    ...employee,
    ...company,
  };

  // 6. Download invoice template from Drive
  //    Tries common naming patterns, then falls back to any DOCX with "TEMPLATE" in name
  const templateFolderId = process.env.DRIVE_INVOICE_TEMPLATES_FOLDER_ID!;
  const templateFileId =
    (await findDriveFileByName(templateFolderId, "Invoice_Template")) ??
    (await findDriveFileByName(templateFolderId, "INVOICE_TEMPLATE")) ??
    (await findDriveFileByName(templateFolderId, "_TEMPLATE"));

  if (!templateFileId) {
    throw new Error(
      "Invoice template not found in Drive folder. " +
      "Upload a DOCX file whose name contains 'Invoice_Template' or 'INVOICE_TEMPLATE'."
    );
  }

  // Check the file extension — docxtemplater requires DOCX, not XLSX
  const { name: fileName } = await getDriveFileMeta(templateFileId);
  if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
    throw new Error(
      `Invoice template "${fileName}" is an Excel file. ` +
      "Please upload a DOCX version with {placeholder} tags. " +
      "In Excel: File → Save As → Word Document (.docx)"
    );
  }

  const templateBuffer = await downloadDriveFile(templateFileId);

  // 7. Render DOCX with data
  const docxBuffer = renderDocxTemplate(templateBuffer, templateData);

  // 8. Convert to PDF
  const pdfBuffer = await convertDocxToPdf(docxBuffer);

  // 9. Upload PDF to Google Drive under Generated/invoices/YYYY-MM/
  const monthFolder = format(new Date(), "yyyy-MM");
  const filename = sanitizeFilename(
    `${invoice.invoice_number}_${employee.supplier_name}.pdf`
  );
  const pdfPath = await saveToGoogleDrive(
    `invoices/${monthFolder}`,
    filename,
    pdfBuffer
  );

  // 10. Write back to Sheets (data row index is 1-based)
  const dataRowIndex = invoiceIndex + 1;
  const now = new Date().toISOString();

  // Actual column order in sheet:
  // A=invoice_number, B=invoice_date, C=due_date, D=service_period,
  // E=employee_id, F=amount_kzt, G=vat_note, H=payment_purpose,
  // I=status, J=notes, K=pdf_url, L=drive_file_id, M=last_generated_at
  await updateSheetCells(sheetName, dataRowIndex, [
    { column: "I", value: "generated" },
    { column: "K", value: pdfPath },
    { column: "L", value: filename },
    { column: "M", value: now },
  ]);

  return { pdfUrl: pdfPath, driveFileId: filename, invoiceNumber };
}
