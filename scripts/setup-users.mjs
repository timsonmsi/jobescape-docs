/**
 * One-time script to create the Users tab and seed initial admin accounts.
 * Run once: node scripts/setup-users.mjs
 *
 * Sheet structure: email | password | role
 * role "admin"  → Invoices + NDA + Legal Review
 * role "user"   → NDA + Legal Review only
 */

import { google } from "googleapis";

// ── Paste your credentials here ──────────────────────────────────────────────
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "YOUR_CLIENT_SECRET";
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN ?? "YOUR_REFRESH_TOKEN";
const SPREADSHEET_ID = "1zxAcoPWKWDHOH0A2HwAEEhKKDuFnBEAogh5ojjrQPNE";
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL_USERS = [
  { email: "aruzhan.kadylbekova@nvs.team", password: "NVSoperations", role: "admin" },
  { email: "temirlan.omarov@nvs.team",     password: "NVSoperations", role: "admin" },
  { email: "gani.kazbek@nvs.team",         password: "NVSoperations", role: "admin" },
];

async function main() {
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
  auth.setCredentials({ refresh_token: REFRESH_TOKEN });
  const sheets = google.sheets({ version: "v4", auth });

  // 1. Check if "Users" sheet already exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existing = meta.data.sheets?.find((s) => s.properties?.title === "Users");

  if (!existing) {
    // Create the tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "Users" } } }],
      },
    });
    console.log("✅ Created 'Users' tab");
  } else {
    console.log("ℹ️  'Users' tab already exists");
  }

  // 2. Write header + users
  const rows = [
    ["email", "password", "role"],
    ...INITIAL_USERS.map((u) => [u.email, u.password, u.role]),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "Users!A1",
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });

  console.log(`✅ Written ${INITIAL_USERS.length} users to 'Users' tab`);
  console.log("\nUsers sheet structure:");
  console.log("  email | password | role");
  console.log("  Add new rows directly in the spreadsheet to add more users.");
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
