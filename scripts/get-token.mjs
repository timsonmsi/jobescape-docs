/**
 * One-time script to obtain a Google OAuth2 refresh token.
 *
 * Usage:
 *   1. Fill in CLIENT_ID and CLIENT_SECRET below (from Google Cloud Console)
 *   2. Add  http://localhost:3001/callback  to your OAuth2 client's
 *      "Authorized redirect URIs" in Google Cloud Console
 *   3. Run:  node scripts/get-token.mjs
 *   4. Authorize in the browser that opens
 *   5. Copy the printed GOOGLE_REFRESH_TOKEN into your .env.local
 */

import { google } from "googleapis";
import http from "http";
import { URL } from "url";
import { exec } from "child_process";

// ── Fill these in ──────────────────────────────────────────
const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "YOUR_CLIENT_SECRET";
// ──────────────────────────────────────────────────────────

const REDIRECT_URI = "http://localhost:3001/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
];

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",   // force refresh_token to be returned every time
});

console.log("\n=== Google OAuth2 Refresh Token Setup ===\n");
console.log("Step 1 — Make sure this URI is in your Google Cloud Console:");
console.log("  Authorized redirect URIs →  http://localhost:3001/callback\n");
console.log("Step 2 — Opening your browser to authorize…");

// Try to open the URL automatically
const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
exec(`${opener} "${authUrl}"`);
console.log("  (if browser didn't open, visit this URL manually)");
console.log(`  ${authUrl}\n`);
console.log("Step 3 — Waiting for authorization on port 3001…\n");

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, "http://localhost:3001");
  if (parsedUrl.pathname !== "/callback") return;

  const code = parsedUrl.searchParams.get("code");
  if (!code) {
    res.writeHead(400);
    res.end("Missing authorization code.");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end("<h2 style='font-family:sans-serif'>✅ Authorization successful! You can close this tab.</h2>");
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);

    console.log("✅ Success! Add these to your .env.local:\n");
    console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log();
  } catch (err) {
    console.error("❌ Failed to exchange code for token:", err.message);
  }
});

server.listen(3001);
