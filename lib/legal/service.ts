import { v4 as uuid } from "uuid";
import { format } from "date-fns";
import { appendSheetRow, ensureSheetExists } from "@/lib/google/sheets";
import { saveToBlob } from "@/lib/utils/blobStore";
import type { RiskReport, LegalReviewRow } from "@/types/legal";

const LEGAL_REVIEWS_HEADERS = [
  "review_id",
  "filename",
  "policy",
  "risk_score",
  "red_flags",
  "recommendations",
  "summary",
  "report_url",
  "created_at",
];

const STUB_REPORT: RiskReport = {
  risk_score: 0,
  summary:
    "LLM review is not configured. Set LLM_API_KEY and LLM_PROVIDER to enable AI-powered analysis.",
  red_flags: [],
  recommendations: [
    "Configure LLM_API_KEY in your .env.local file to enable AI-powered legal review.",
  ],
};

const REVIEW_PROMPT = `You are a legal document risk analyst. Analyze the following legal document carefully and respond with a JSON object that has EXACTLY this structure (no markdown, just raw JSON):
{
  "risk_score": <integer 0-100 where 0 is no risk and 100 is extreme risk>,
  "summary": "<1-2 sentence executive summary of the document and its risk profile>",
  "red_flags": [
    {
      "clause": "<exact quote or brief description of the problematic clause>",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "explanation": "<why this clause is concerning and what risk it poses>"
    }
  ],
  "recommendations": [
    "<specific actionable recommendation>",
    ...
  ]
}

Analyze for: unfair terms, unlimited liability, IP ownership issues, non-compete overreach, jurisdiction problems, payment terms, termination clauses, and other standard legal risks.

Document to analyze:
---
{DOCUMENT_TEXT}
---`;

/**
 * Extract text from a document buffer based on MIME type.
 */
async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType === "application/pdf") {
    // pdf-parse v2 uses a class-based API: new PDFParse({ data: buffer })
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse") as { PDFParse: new (opts: { data: Buffer }) => { getText: () => Promise<{ text: string }> } };
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    return result.text;
  }

  throw new Error(
    `Unsupported file type: ${mimeType}. Please upload PDF, DOCX, or TXT.`
  );
}

/** Call the LLM to get a risk report */
async function callLlm(documentText: string): Promise<RiskReport> {
  const provider = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  const model = process.env.LLM_MODEL ?? "claude-opus-4-6";
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) {
    return STUB_REPORT;
  }

  // Truncate very long documents
  const truncated =
    documentText.length > 80000
      ? documentText.slice(0, 80000) + "\n\n[Document truncated for analysis]"
      : documentText;

  const prompt = REVIEW_PROMPT.replace("{DOCUMENT_TEXT}", truncated);

  if (provider === "anthropic") {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text;
    try {
      return JSON.parse(text) as RiskReport;
    } catch {
      // Try to extract JSON from the response
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as RiskReport;
      throw new Error("LLM returned invalid JSON response");
    }
  }

  if (provider === "openai") {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const content = res.choices[0].message.content!;
    return JSON.parse(content) as RiskReport;
  }

  throw new Error(`Unknown LLM_PROVIDER: "${provider}". Use "anthropic" or "openai".`);
}

function formatReportAsText(
  report: RiskReport,
  filename: string
): string {
  const lines = [
    "LEGAL REVIEW REPORT",
    `File: ${filename}`,
    `Risk Score: ${report.risk_score}/100`,
    "",
    "SUMMARY",
    report.summary,
    "",
    `RED FLAGS (${report.red_flags.length})`,
    ...report.red_flags.map(
      (f, i) =>
        `${i + 1}. [${f.severity}] ${f.clause}\n   ${f.explanation}`
    ),
    "",
    `RECOMMENDATIONS`,
    ...report.recommendations.map((r, i) => `${i + 1}. ${r}`),
  ];
  return lines.join("\n");
}

/**
 * Review a legal document with AI.
 * Returns a structured RiskReport.
 */
export async function reviewLegalDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ report: RiskReport; row: LegalReviewRow }> {
  // 1. Ensure LegalReviews sheet exists in the logs spreadsheet
  const logsSheetId = process.env.LOGS_SHEETS_ID!;
  await ensureSheetExists("LegalReviews", LEGAL_REVIEWS_HEADERS, logsSheetId);

  // 2. Extract text from document
  const documentText = await extractText(fileBuffer, mimeType);

  // 3. Call LLM (returns stub if no API key)
  const report = await callLlm(documentText);

  // 4. Save report locally under public/generated/legal/YYYY-MM/
  const monthFolder = format(new Date(), "yyyy-MM");
  const reviewId = uuid();
  const reportFilename = `LegalReview_${filename}_${reviewId.slice(0, 8)}.txt`;
  const reportText = formatReportAsText(report, filename);
  const reportPath = await saveToBlob(
    `legal/${monthFolder}`,
    reportFilename,
    Buffer.from(reportText, "utf-8")
  );

  // 5. Append to LegalReviews sheet in logs spreadsheet
  const now = new Date().toISOString();
  await appendSheetRow("LegalReviews", [
    reviewId,
    filename,
    "standard",
    String(report.risk_score),
    JSON.stringify(report.red_flags),
    JSON.stringify(report.recommendations),
    report.summary,
    reportPath,
    now,
  ], logsSheetId);

  const row: LegalReviewRow = {
    review_id: reviewId,
    filename,
    policy: "standard",
    risk_score: String(report.risk_score),
    red_flags: JSON.stringify(report.red_flags),
    recommendations: JSON.stringify(report.recommendations),
    summary: report.summary,
    report_url: reportPath,
    created_at: now,
  };

  return { report, row };
}
