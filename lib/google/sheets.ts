import { getSheetsClient } from "./auth";

const SPREADSHEET_ID = process.env.SHEETS_ID!;

/** Retry wrapper: up to maxRetries attempts with exponential backoff */
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
 * Read a key-value formatted sheet (columns: field | value | ...) and return
 * a single Record<string, string> where each row's field maps to its value.
 * Used for the Company sheet which stores one field per row.
 */
export async function getKeyValueSheet(
  sheetName: string
): Promise<Record<string, string>> {
  return withRetry(async () => {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:B`,
    });
    const rows = res.data.values;
    if (!rows || rows.length < 2) return {};
    // Skip header row; map field -> value
    return Object.fromEntries(
      rows.slice(1).map((row) => [row[0] ?? "", row[1] ?? ""])
    );
  });
}

/**
 * Read all rows from a named sheet.
 * The first row is treated as headers; subsequent rows are mapped to typed objects.
 */
export async function getSheetRows<T>(sheetName: string, spreadsheetId = SPREADSHEET_ID): Promise<T[]> {
  return withRetry(async () => {
    const sheets = getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:ZZ`,
    });

    const rows = res.data.values;
    if (!rows || rows.length < 2) return [];

    const [headers, ...dataRows] = rows;
    return dataRows.map((row) =>
      Object.fromEntries(headers.map((h: string, i: number) => [h, row[i] ?? ""]))
    ) as T[];
  });
}

/** Append a single row to a named sheet */
export async function appendSheetRow(
  sheetName: string,
  values: string[],
  spreadsheetId = SPREADSHEET_ID
): Promise<void> {
  return withRetry(async () => {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
  });
}

/**
 * Update a single cell identified by sheet name, 1-based row index (data row,
 * not counting header), and column letter (A, B, C…).
 */
export async function updateSheetCell(
  sheetName: string,
  dataRowIndex: number, // 1-based: 1 = first data row (row 2 in sheet)
  columnLetter: string,
  value: string
): Promise<void> {
  return withRetry(async () => {
    const sheets = getSheetsClient();
    const sheetRow = dataRowIndex + 1; // +1 to skip header row
    const range = `${sheetName}!${columnLetter}${sheetRow}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[value]] },
    });
  });
}

/** Update multiple cells in a row at once */
export async function updateSheetCells(
  sheetName: string,
  dataRowIndex: number,
  updates: { column: string; value: string }[]
): Promise<void> {
  await Promise.all(
    updates.map(({ column, value }) =>
      updateSheetCell(sheetName, dataRowIndex, column, value)
    )
  );
}

/**
 * Ensure a sheet with the given name exists. If it doesn't, create it and
 * write the provided header row.
 */
export async function ensureSheetExists(
  sheetName: string,
  headers: string[],
  spreadsheetId = SPREADSHEET_ID
): Promise<void> {
  return withRetry(async () => {
    const sheets = getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existing = meta.data.sheets?.map((s) => s.properties?.title) ?? [];

    if (existing.includes(sheetName)) return;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: { rowCount: 1000, columnCount: headers.length },
              },
            },
          },
        ],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [headers] },
    });
  });
}
