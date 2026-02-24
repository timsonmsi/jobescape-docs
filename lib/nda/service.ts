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

import { sanitizeFilename } from "@/lib/utils/sanitize";
import { saveToBlob } from "@/lib/utils/blobStore";
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
 * Generate an NDA DOCX from a Drive template, upload it to Blob, and record
 * it in the Agreements sheet.
 */
export async function generateNda(
  input: NdaGenerateInput
): Promise<GenerateNdaResult> {
  // Guard: required env vars
  const logsSheetId = process.env.LOGS_SHEETS_ID;
  if (!logsSheetId) throw new Error("Missing environment variable: LOGS_SHEETS_ID");
  const templateFolderId = process.env.DRIVE_NDA_TEMPLATES_FOLDER_ID;
  if (!templateFolderId) throw new Error("Missing environment variable: DRIVE_NDA_TEMPLATES_FOLDER_ID");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Missing environment variable: BLOB_READ_WRITE_TOKEN");

  // 1. Ensure Agreements sheet exists in the logs spreadsheet
  await ensureSheetExists("Agreements", AGREEMENTS_HEADERS, logsSheetId);

  // 2. Find the right NDA template in Drive
  //    Expected name pattern: NDA_${disclosure_party}_${receiving_type_lowercase}_TEMPLATE
  //    e.g. NDA_NomadVentures_individual_TEMPLATE.docx
  const templateNamePattern = `NDA_${input.disclosure_party}_${input.receiving_type.toLowerCase()}_TEMPLATE`;

  let templateFileId: string | null;
  try {
    templateFileId = await findDriveFileByName(templateFolderId, templateNamePattern);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to search NDA templates folder (ID: ${templateFolderId}): ${msg}`);
  }

  if (!templateFileId) {
    throw new Error(
      `NDA template not found for ${input.disclosure_party} / ${input.receiving_type}. ` +
      `Expected a file whose name contains "${templateNamePattern}" in Drive folder ID "${templateFolderId}". ` +
      `Please verify the file exists and the service account has Viewer access to it.`
    );
  }

  // 3. Download the template
  let templateBuffer: Buffer;
  try {
    templateBuffer = await downloadDriveFile(templateFileId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to download NDA template (file ID: ${templateFileId}): ${msg}`);
  }

  // 4. Render the template with input data
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

  // 5. Upload DOCX to Vercel Blob under nda/YYYY-MM/
  const monthFolder = format(new Date(), "yyyy-MM");
  const agreementId = uuid();
  const receiverLabel =
    input.receiving_type === "Individual"
      ? (input.recv_full_name ?? "Individual")
      : (input.recv_company_name ?? "Company");
  const filename = sanitizeFilename(
    `NDA_${input.disclosure_party}_${input.receiving_type}_${input.effective_date}_${receiverLabel}.docx`
  );
  const pdfPath = await saveToBlob(`nda/${monthFolder}`, filename, docxBuffer);

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
