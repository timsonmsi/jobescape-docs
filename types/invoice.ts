export interface InvoiceRow {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  service_period: string;
  employee_id: string;
  amount_kzt: string;
  vat_note: string;
  status: string;
  pdf_url: string;
  drive_file_id: string;
  last_generated_at: string;
}

export interface EmployeeRow {
  employee_id: string;
  supplier_name: string;
  supplier_iin_bin: string;
  supplier_address: string;
  supplier_bank_name: string;
  supplier_iban: string;
  supplier_bic: string;
  supplier_kbe: string;
  supplier_phone_email: string;
  supplier_sign_name: string;
}

export interface CompanyRow {
  buyer_name: string;
  buyer_bin: string;
  buyer_address: string;
  buyer_bank_name: string;
  buyer_iban: string;
  buyer_bic: string;
  buyer_kbe: string;
}

export type InvoiceTemplateData = InvoiceRow & EmployeeRow & CompanyRow;
