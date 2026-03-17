import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any | null = null;

export function getGoogleAuthClient() {
  if (_client) return _client;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google OAuth2 credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env.local"
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken, scope: SCOPES.join(" ") });

  _client = auth;
  return _client;
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getGoogleAuthClient() });
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: getGoogleAuthClient() });
}

export function getDocsClient() {
  return google.docs({ version: "v1", auth: getGoogleAuthClient() });
}
