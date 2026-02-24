import { google } from "googleapis";
import { JWT } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

let _client: JWT | null = null;

export function getGoogleAuthClient(): JWT {
  if (_client) return _client;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set"
    );
  }

  const credentials = JSON.parse(raw);

  _client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });

  return _client;
}

export function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getGoogleAuthClient() });
}

export function getDriveClient() {
  return google.drive({ version: "v3", auth: getGoogleAuthClient() });
}
