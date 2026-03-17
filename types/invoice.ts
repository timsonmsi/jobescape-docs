/** One row in the "Employees" sheet (permanent employee registry) */
export interface EmployeeRow {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  registration_city: string;
  registration_country: string;
  office_address: string;
  service_description: string;
  monthly_rate: string;     // default monthly amount in USD
  bank_name: string;
  bank_swift: string;
  bank_account: string;
}

/** One row in a monthly sheet, e.g. "March-2026" */
export interface InvoiceRow {
  employee_id: string;
  first_name: string;       // auto-filled on generation
  last_name: string;        // auto-filled on generation
  amount: string;           // USD amount (overrides monthly_rate if set)
  status: string;           // "pending" | "generated" | "error"
  invoice_number: string;   // filled after generation, e.g. INV-2026-03-001
  drive_link: string;
  generated_at: string;
}

/** Company (client) data from the "Company" key-value sheet */
export interface CompanyRow {
  client_name: string;
  client_address: string;
  payment_terms: string;
}
