import { getSheetRows, getKeyValueSheet, updateSheetCells } from "@/lib/google/sheets";
import { copyGoogleDoc, getOrCreateEmployeeFolder } from "@/lib/google/drive";
import { replaceDocText } from "@/lib/google/docs";
import type { InvoiceRow, EmployeeRow, CompanyRow } from "@/types/invoice";

const TEMPLATE_DOC_ID = "1yURP0a3q-s0UP5Ft_ddQElpWCM34zYyzpbyqH6GYNSI";

const MONTH_NUMBERS: Record<string, string> = {
  January: "01", February: "02", March: "03", April: "04",
  May: "05", June: "06", July: "07", August: "08",
  September: "09", October: "10", November: "11", December: "12",
};

export interface GenerateInvoiceResult {
  driveLink: string;
  driveFileId: string;
  invoiceNumber: string;
}

/**
 * Generate an invoice Google Doc for the given employee in the given monthly sheet.
 * - Copies the template Doc to the employee's Drive subfolder
 * - Fills all {{placeholder}} tags via the Docs API
 * - Updates the monthly sheet row with status, link, and invoice number
 */
export async function generateInvoiceDoc(
  employeeId: string,
  sheetName: string
): Promise<GenerateInvoiceResult> {
  // 1. Load data in parallel
  const [invoiceRows, employeeRows, company] = await Promise.all([
    getSheetRows<InvoiceRow>(sheetName),
    getSheetRows<EmployeeRow>("Employees"),
    getKeyValueSheet("Company") as unknown as Promise<CompanyRow>,
  ]);

  // 2. Find the invoice row for this employee
  const invoiceIndex = invoiceRows.findIndex((r) => r.employee_id === employeeId);
  if (invoiceIndex === -1) {
    throw new Error(`No row found for employee_id "${employeeId}" in sheet "${sheetName}"`);
  }
  const invoice = invoiceRows[invoiceIndex];

  // 3. Find the employee
  const employee = employeeRows.find((e) => e.employee_id === employeeId);
  if (!employee) {
    throw new Error(`Employee "${employeeId}" not found in Employees sheet`);
  }

  // 4. Check company data
  if (!company.client_name) {
    throw new Error('Company sheet is missing "client_name". Check the Company tab.');
  }

  // 5. Build invoice number and date info from sheet name (e.g. "March-2026")
  const [monthName, yearStr] = sheetName.split("-");
  const monthNum = MONTH_NUMBERS[monthName] ?? "01";
  const invoiceNumber = `${yearStr}-${monthNum}-${employeeId.padStart(3, "0")}`;

  // Find the last Friday of the month, then pick a random date
  // in the window [lastFriday - 9, lastFriday - 3] so the invoice
  // is at least 3 days before salary payment day.
  const year = Number(yearStr);
  const month = Number(monthNum); // 1-based
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  // Walk backwards from the last day to find the last Friday (day 5)
  let lastFridayDay = lastDayOfMonth;
  while (new Date(year, month - 1, lastFridayDay).getDay() !== 5) {
    lastFridayDay--;
  }

  // Random offset: 3 to 6 days before last Friday (inclusive)
  const daysBack = 3 + Math.floor(Math.random() * 4); // 3,4,5,6
  const invoiceDayNum = Math.max(1, lastFridayDay - daysBack);
  const invoiceDate = `${monthName} ${invoiceDayNum}, ${yearStr}`;

  // 6. Resolve the amount (monthly invoice amount or employee default)
  const amount = (invoice.amount || employee.monthly_rate || "0").trim();
  const amountFormatted = `${Number(amount.replace(/,/g, "")).toLocaleString("en-US")} USD`;

  // 7. Get or create employee's Drive subfolder
  const folderId = await getOrCreateEmployeeFolder(employee.first_name, employee.last_name);

  // 8. Build the file name: firstname_lastname_month_invoice
  const firstName = employee.first_name.toLowerCase().replace(/\s+/g, "_");
  const lastName = employee.last_name.toLowerCase().replace(/\s+/g, "_");
  const monthLower = monthName.toLowerCase();
  const fileName = `${firstName}_${lastName}_${monthLower}_invoice`;

  // 9. Copy the template Doc to the employee's folder
  const { id: newDocId, webViewLink } = await copyGoogleDoc(
    TEMPLATE_DOC_ID,
    folderId,
    fileName
  );

  // 10. Replace all {{placeholders}} in the copied doc
  await replaceDocText(newDocId, {
    vendor_name: `${employee.first_name} ${employee.last_name}`,
    vendor_location: `${employee.registration_city}, ${employee.registration_country}`,
    vendor_address: employee.office_address,
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    client_name: company.client_name,
    client_address: company.client_address ?? "",
    service_description: employee.service_description,
    amount: amountFormatted,
    bank_name: employee.bank_name,
    account_holder: `${employee.first_name} ${employee.last_name}`,
    bank_swift: employee.bank_swift,
    bank_account: employee.bank_account,
    email: employee.email,
    payment_terms: company.payment_terms ?? "Please make payment within 7-14 business days from the invoice date",
  });

  // 11. Update the monthly sheet row
  // Column order: A=employee_id, B=first_name, C=last_name, D=amount,
  //               E=status, F=invoice_number, G=drive_link, H=generated_at
  const dataRowIndex = invoiceIndex + 1; // 1-based for updateSheetCells
  await updateSheetCells(sheetName, dataRowIndex, [
    { column: "B", value: employee.first_name },
    { column: "C", value: employee.last_name },
    { column: "E", value: "generated" },
    { column: "F", value: invoiceNumber },
    { column: "G", value: webViewLink },
    { column: "H", value: new Date().toISOString() },
  ]);

  return { driveLink: webViewLink, driveFileId: newDocId, invoiceNumber };
}
