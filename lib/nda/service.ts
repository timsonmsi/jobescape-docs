import { v4 as uuid } from "uuid";
import { format } from "date-fns";
import {
  appendSheetRow,
  ensureSheetExists,
} from "@/lib/google/sheets";
import {
  downloadDriveFile,
  findDriveFileByName,
} from "@/lib/google/drive";
import { renderDocxTemplate } from "@/lib/docx/render";
import { convertDocxToPdf } from "@/lib/pdf/convert";
import { sanitizeFilename } from "@/lib/utils/sanitize";
import { saveToGoogleDrive } from "@/lib/utils/driveStore";
import type { NdaGenerateInput } from "@/types/nda";

const AGREEMENTS_HEADERS = [
  "agreement_id",
  "type",
  "disclosure_party",
  "receiving_type",
  "receiving_name",
  "effective_date",
  "purpose",
  "pdf_url",
  "drive_file_id",
  "created_at",
];

export interface GenerateNdaResult {
  agreementId: string;
  pdfUrl: string;
  driveFileId: string;
}

/**
 * Generate an NDA PDF from a Drive DOCX template, upload it, and record it
 * in the Agreements sheet.
 */
export async function generateNda(
  input: NdaGenerateInput
): Promise<GenerateNdaResult> {
  // 1. Ensure Agreements sheet exists in the logs spreadsheet
  const logsSheetId = process.env.LOGS_SHEETS_ID!;
  await ensureSheetExists("Agreements", AGREEMENTS_HEADERS, logsSheetId);

  // 2. Find the right NDA template in Drive
  //    Actual naming: NDA_${disclosure_party}_${receiving_type_lowercase}_TEMPLATE.docx
  //    e.g. NDA_NomadVentures_individual_TEMPLATE.docx
  const templateNamePattern = `NDA_${input.disclosure_party}_${input.receiving_type.toLowerCase()}_TEMPLATE`;
  const templateFolderId = process.env.DRIVE_NDA_TEMPLATES_FOLDER_ID!;

  const templateFileId = await findDriveFileByName(
    templateFolderId,
    templateNamePattern
  );
  if (!templateFileId) {
    throw new Error(
      `NDA template not found for ${input.disclosure_party} / ${input.receiving_type}. ` +
      `Expected file containing "${templateNamePattern}" in the NDA templates folder.`
    );
  }

  // 3. Download and render the template
  //    Build template data from the typed input (only pass defined fields)
  const templateBuffer = await downloadDriveFile(templateFileId);
  const templateData: Record<string, string> = {
    effective_date: input.effective_date,
    purpose: input.purpose,
  };
  if (input.receiving_type === "Individual") {
    templateData.recv_full_name = input.recv_full_name ?? "";
    templateData.recv_date_of_birth = input.recv_date_of_birth ?? "";
    templateData.recv_birth_place = input.recv_birth_place ?? "";
    templateData.recv_passport_number = input.recv_passport_number ?? "";
    templateData.recv_passport_nationality = input.recv_passport_nationality ?? "";
    templateData.recv_residence_address = input.recv_residence_address ?? "";
  } else {
    templateData.recv_company_name = input.recv_company_name ?? "";
    templateData.recv_company_address = input.recv_company_address ?? "";
    templateData.recv_representative_name = input.recv_representative_name ?? "";
  }
  const docxBuffer = renderDocxTemplate(templateBuffer, templateData);

  // 4. Convert to PDF
  const pdfBuffer = await convertDocxToPdf(docxBuffer);

  // 5. Save PDF locally under public/generated/nda/YYYY-MM/
  const monthFolder = format(new Date(), "yyyy-MM");
  const agreementId = uuid();
  const receiverLabel =
    input.receiving_type === "Individual"
      ? (input.recv_full_name ?? "Individual")
      : (input.recv_company_name ?? "Company");
  const filename = sanitizeFilename(
    `NDA_${input.disclosure_party}_${input.receiving_type}_${input.effective_date}_${receiverLabel}.pdf`
  );
  const pdfPath = await saveToGoogleDrive(`nda/${monthFolder}`, filename, pdfBuffer);

  // 6. Append to Agreements sheet in logs spreadsheet
  const now = new Date().toISOString();
  await appendSheetRow("Agreements", [
    agreementId,
    "NDA",
    input.disclosure_party,
    input.receiving_type,
    receiverLabel,
    input.effective_date,
    input.purpose,
    pdfPath,
    filename,
    now,
  ], logsSheetId);

  return { agreementId, pdfUrl: pdfPath, driveFileId: filename };
}
