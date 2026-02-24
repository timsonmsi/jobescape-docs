export type NdaReceivingType = "Individual" | "Company";

export type NdaDisclosureParty =
  | "NomadVentures"
  | "NomadVentureStudioFZE"
  | "DataDreamerAI";

export interface AgreementRow {
  agreement_id: string;
  type: string;
  disclosure_party: string;
  receiving_type: string;
  receiving_name: string;
  effective_date: string;
  purpose: string;
  pdf_url: string;
  drive_file_id: string;
  created_at: string;
}

export interface NdaGenerateInput {
  disclosure_party: NdaDisclosureParty;
  receiving_type: NdaReceivingType;
  effective_date: string;
  purpose: string;
  // Individual fields
  recv_full_name?: string;
  recv_date_of_birth?: string;
  recv_birth_place?: string;
  recv_passport_number?: string;
  recv_passport_nationality?: string;
  recv_residence_address?: string;
  // Company fields
  recv_company_name?: string;
  recv_company_address?: string;
  recv_representative_name?: string;
}
