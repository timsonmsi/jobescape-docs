import { v4 as uuid } from "uuid";
import {
  appendSheetRow,
  ensureSheetExists,
} from "@/lib/google/sheets";
import {
  downloadDriveFile,
  findDriveFileByName,
  uploadDriveFile,
} from "@/lib/google/drive";
import { renderDocxTemplate } from "@/lib/docx/render";

import { sanitizeFilename } from "@/lib/utils/sanitize";
import type { NdaGenerateInput } from "@/types/nda";

const AGREEMENTS_HEADERS = [
  "agreement_id",
  "type",
  "disclosure_party",
  "receiving_type",
  "receiving_name",
  "effective_date",
  "purpose",
  "drive_link",
  "drive_file_id",
  "created_at",
];

export interface GenerateNdaResult {
  agreementId: string;
  driveLink: string;
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
  const ndaOutputFolderId = process.env.DRIVE_NDA_OUTPUT_FOLDER_ID;
  if (!ndaOutputFolderId) throw new Error("Missing environment variable: DRIVE_NDA_OUTPUT_FOLDER_ID");

  // 1. Ensure NDAs sheet exists in the logs spreadsheet
  await ensureSheetExists("NDAs", AGREEMENTS_HEADERS, logsSheetId);

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

  // 5. Upload DOCX to Drive NDA output folder
  const agreementId = uuid();
  const receiverLabel =
    input.receiving_type === "Individual"
      ? (input.recv_full_name ?? "Individual")
      : (input.recv_company_name ?? "Company");
  const filename = sanitizeFilename(
    `NDA_${input.disclosure_party}_${input.receiving_type}_${input.effective_date}_${receiverLabel}.docx`
  );
  const { id: driveFileId, webViewLink: driveLink } = await uploadDriveFile({
    name: filename,
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: docxBuffer,
    parentFolderId: ndaOutputFolderId,
  });

  // 6. Append to NDAs sheet in logs spreadsheet
  const now = new Date().toISOString();
  await appendSheetRow("NDAs", [
    agreementId,
    "NDA",
    input.disclosure_party,
    input.receiving_type,
    receiverLabel,
    input.effective_date,
    input.purpose,
    driveLink,
    driveFileId,
    now,
  ], logsSheetId);

  return { agreementId, driveLink, driveFileId };
}
