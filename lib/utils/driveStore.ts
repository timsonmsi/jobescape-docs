import { ensureNestedFolder, uploadDriveFile } from "@/lib/google/drive";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function extMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

/**
 * Upload a generated file to Google Drive.
 * Path segments map to nested Drive folders under DRIVE_ROOT_FOLDER_ID.
 * e.g. subDir="invoices/2026-02" → Drive: Generated/invoices/2026-02/
 * Returns the public webViewLink for the uploaded file.
 */
export async function saveToGoogleDrive(
  subDir: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const segments = ["Generated", ...subDir.split("/").filter(Boolean)];
  const folderId = await ensureNestedFolder(segments);
  const { webViewLink } = await uploadDriveFile({
    name: filename,
    mimeType: extMime(filename),
    buffer,
    parentFolderId: folderId,
  });
  return webViewLink;
}
