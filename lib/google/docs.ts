import { getDocsClient } from "./auth";

/**
 * Replace all {{placeholder}} occurrences in a Google Doc using the Docs API.
 * `replacements` is a map of placeholder name → replacement value.
 * e.g. { vendor_name: "John Doe", invoice_number: "INV-2026-03-001" }
 */
export async function replaceDocText(
  documentId: string,
  replacements: Record<string, string>
): Promise<void> {
  const docs = getDocsClient();

  const requests = Object.entries(replacements).map(([key, value]) => ({
    replaceAllText: {
      containsText: {
        text: `{{${key}}}`,
        matchCase: true,
      },
      replaceText: value ?? "",
    },
  }));

  if (requests.length === 0) return;

  await docs.documents.batchUpdate({
    documentId,
    requestBody: { requests },
  });
}
