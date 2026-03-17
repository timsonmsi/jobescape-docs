import { getDriveClient } from "./auth";
import { Readable } from "stream";

const INVOICES_ROOT = () => process.env.DRIVE_INVOICES_ROOT_FOLDER_ID!;

/** Retry wrapper */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
      }
    }
  }
  throw lastError;
}

/**
 * Ensure a folder with `name` exists inside `parentId`.
 * supportsAllDrives=true so this works in both personal Drive and Shared Drives.
 * Returns the folder's Drive ID.
 */
export async function ensureDriveFolder(
  name: string,
  parentId: string
): Promise<string> {
  return withRetry(async () => {
    const drive = getDriveClient();
    const res = await drive.files.list({
      q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      fields: "files(id)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (res.data.files?.length) return res.data.files[0].id!;

    const created = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
    });
    return created.data.id!;
  });
}

/**
 * Build a nested folder path under DRIVE_ROOT_FOLDER_ID.
 * e.g. ensureNestedFolder(['Generated', 'Invoices', '2026-02'])
 */
export async function ensureNestedFolder(segments: string[]): Promise<string> {
  const rootId = process.env.DRIVE_ROOT_FOLDER_ID!;
  let parentId = rootId;
  for (const segment of segments) {
    parentId = await ensureDriveFolder(segment, parentId);
  }
  return parentId;
}

/**
 * Get file metadata (name, mimeType) for a Drive file.
 */
export async function getDriveFileMeta(
  fileId: string
): Promise<{ name: string; mimeType: string }> {
  return withRetry(async () => {
    const drive = getDriveClient();
    const res = await drive.files.get({
      fileId,
      fields: "name,mimeType",
      supportsAllDrives: true,
    });
    return { name: res.data.name ?? "", mimeType: res.data.mimeType ?? "" };
  });
}

/**
 * Download a Drive file by ID. Returns a Buffer.
 */
export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  return withRetry(async () => {
    const drive = getDriveClient();
    const res = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "arraybuffer" }
    );
    return Buffer.from(res.data as ArrayBuffer);
  });
}

/**
 * Find the first file whose name contains `namePattern`.
 * Strategy:
 *   1. Search inside `folderId` (works when folder is shared with the service account).
 *   2. If that fails or returns nothing, fall back to a global search across all
 *      files visible to the service account (works when individual files are shared).
 * Returns the file ID or null if not found anywhere.
 */
export async function findDriveFileByName(
  folderId: string,
  namePattern: string
): Promise<string | null> {
  const drive = getDriveClient();

  // Attempt 1: folder-scoped search
  try {
    const res = await drive.files.list({
      q: `name contains '${namePattern}' and '${folderId}' in parents and trashed=false`,
      fields: "files(id,name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    if (res.data.files?.length) return res.data.files[0].id!;
  } catch {
    // Folder not accessible to service account — fall through to global search
  }

  // Attempt 2: global search (finds files directly shared with the service account)
  return withRetry(async () => {
    const res = await drive.files.list({
      q: `name contains '${namePattern}' and trashed=false`,
      fields: "files(id,name)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    return res.data.files?.[0]?.id ?? null;
  });
}

/**
 * Copy a Google Doc template to a destination folder.
 * Returns { id, webViewLink } of the new document.
 */
export async function copyGoogleDoc(
  templateDocId: string,
  destFolderId: string,
  fileName: string
): Promise<{ id: string; webViewLink: string }> {
  return withRetry(async () => {
    const drive = getDriveClient();
    const res = await drive.files.copy({
      fileId: templateDocId,
      supportsAllDrives: true,
      requestBody: {
        name: fileName,
        parents: [destFolderId],
      },
      fields: "id,webViewLink",
    });
    return {
      id: res.data.id!,
      webViewLink:
        res.data.webViewLink ??
        `https://docs.google.com/document/d/${res.data.id}/edit`,
    };
  });
}

/**
 * Get or create a "First Last" subfolder inside DRIVE_INVOICES_ROOT_FOLDER_ID.
 * Returns the folder ID.
 */
export async function getOrCreateEmployeeFolder(
  firstName: string,
  lastName: string
): Promise<string> {
  const folderName = `${firstName} ${lastName}`;
  return ensureDriveFolder(folderName, INVOICES_ROOT());
}

/**
 * Upload a Buffer as a file to Drive (personal or Shared Drive).
 * Sets 'anyone reader' permission so the webViewLink works publicly.
 * Returns { id, webViewLink }.
 */
export async function uploadDriveFile(params: {
  name: string;
  mimeType: string;
  buffer: Buffer;
  parentFolderId: string;
}): Promise<{ id: string; webViewLink: string }> {
  return withRetry(async () => {
    const drive = getDriveClient();

    const res = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: params.name,
        parents: [params.parentFolderId],
      },
      media: {
        mimeType: params.mimeType,
        body: Readable.from(params.buffer),
      },
      fields: "id,webViewLink",
    });

    const fileId = res.data.id!;

    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: { role: "reader", type: "anyone" },
    });

    return {
      id: fileId,
      webViewLink: res.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
    };
  });
}
