/**
 * Creates an invoice Google Doc template by uploading invoice-template.html.
 * Google Drive converts the HTML to a proper Google Doc preserving layout.
 * Run: node scripts/create-invoice-template.mjs
 * Outputs the new Doc ID to update in lib/invoices/service.ts
 */

import { google } from "googleapis";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Manually parse .env.local to avoid dotenv mangling values
const envContent = readFileSync(resolve(__dirname, "../.env.local"), "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (!match) continue;
  const key = match[1].trim();
  let val = match[2].trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  process.env[key] = val;
}

const FOLDER_ID     = process.env.DRIVE_INVOICE_TEMPLATES_FOLDER_ID ?? null;
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: "v3", auth });

async function main() {
  const htmlPath = resolve(__dirname, "invoice-template.html");
  const htmlContent = readFileSync(htmlPath, "utf-8");

  // Upload HTML → Google Docs (Drive auto-converts on upload)
  const res = await drive.files.create({
    requestBody: {
      name: "Invoice Template",
      mimeType: "application/vnd.google-apps.document",
    },
    media: {
      mimeType: "text/html",
      body: Readable.from([htmlContent]),
    },
    fields: "id,webViewLink",
  });

  const docId = res.data.id;
  const docUrl = res.data.webViewLink ?? `https://docs.google.com/document/d/${docId}/edit`;

  console.log("\n✅ Template created successfully!");
  console.log(`📄 Doc URL: ${docUrl}`);
  console.log(`\n🔑 New TEMPLATE_DOC_ID: ${docId}`);
  console.log(`\nUpdate lib/invoices/service.ts line 6:`);
  console.log(`  const TEMPLATE_DOC_ID = "${docId}";`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message ?? err);
  process.exit(1);
});
