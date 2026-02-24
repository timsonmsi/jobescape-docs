/**
 * Downloads the Google Doc invoice template as DOCX using the service account
 * and uploads it to the Drive invoice templates folder.
 *
 * Usage: node scripts/upload-invoice-template.mjs
 */

import { google } from "googleapis";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");

// Parse .env.local (simple parser)
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let value = trimmed.slice(eqIdx + 1).trim();
  // Strip surrounding single quotes (for GOOGLE_SERVICE_ACCOUNT_JSON)
  if (value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
}

const GOOGLE_DOC_FILE_ID = "1gVtPkbC5EMeyEkQsvPa2evr6ZFyk2_Ru";
const TEMPLATE_FOLDER_ID = process.env.DRIVE_INVOICE_TEMPLATES_FOLDER_ID;
const SA_JSON = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
];

async function main() {
  console.log("Authenticating with service account...");
  const auth = new google.auth.JWT({
    email: SA_JSON.client_email,
    key: SA_JSON.private_key.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });

  const drive = google.drive({ version: "v3", auth });

  // 1. Export Google Doc as DOCX
  console.log(`Exporting Google Doc ${GOOGLE_DOC_FILE_ID} as DOCX...`);
  let exportRes;
  try {
    exportRes = await drive.files.export(
      {
        fileId: GOOGLE_DOC_FILE_ID,
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      { responseType: "arraybuffer" }
    );
  } catch (err) {
    console.error("Failed to export Google Doc. Make sure the document is shared with:");
    console.error(`  ${SA_JSON.client_email}`);
    console.error("Error:", err.message);
    process.exit(1);
  }

  const docxBuffer = Buffer.from(exportRes.data);
  console.log(`Exported DOCX: ${docxBuffer.length} bytes`);

  // 2. Check if a template already exists and delete it (to avoid duplicates)
  const existingList = await drive.files.list({
    q: `'${TEMPLATE_FOLDER_ID}' in parents and name contains 'Invoice_Template' and trashed = false`,
    fields: "files(id, name)",
  });
  for (const file of existingList.data.files ?? []) {
    console.log(`Removing old template: ${file.name} (${file.id})`);
    await drive.files.delete({ fileId: file.id });
  }

  // 3. Upload DOCX to templates folder
  const { Readable } = await import("stream");
  const stream = Readable.from(docxBuffer);

  console.log("Uploading Invoice_Template.docx to Drive templates folder...");
  const uploadRes = await drive.files.create({
    requestBody: {
      name: "Invoice_Template.docx",
      parents: [TEMPLATE_FOLDER_ID],
    },
    media: {
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      body: stream,
    },
    fields: "id, name, webViewLink",
  });

  console.log("✓ Template uploaded successfully!");
  console.log(`  Name: ${uploadRes.data.name}`);
  console.log(`  ID:   ${uploadRes.data.id}`);
  console.log(`  URL:  ${uploadRes.data.webViewLink}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
