import { appendSheetRow, ensureSheetExists } from "@/lib/google/sheets";
import { v4 as uuid } from "uuid";
import type { RiskReport, NdaReviewRow } from "@/types/legal";

const NDA_REVIEW_HEADERS = [
  "review_id",
  "filename",
  "risk_score",
  "red_flags",
  "recommendations",
  "summary",
  "report_url",
  "created_at",
];

const NDA_REVIEW_PROMPT = `You are an NDA (Non-Disclosure Agreement) specialist legal analyst. Analyze the following NDA document and respond with a JSON object that has EXACTLY this structure (no markdown, just raw JSON):
{
  "risk_score": <integer 0-100 where 0 is no risk and 100 is extremely unfavorable>,
  "summary": "<2-3 sentence summary of the NDA: parties involved, type (mutual/unilateral), term, and overall risk>",
  "red_flags": [
    {
      "clause": "<exact quote or brief description of the problematic clause>",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "explanation": "<why this clause is risky or unfavorable>"
    }
  ],
  "recommendations": [
    "<specific actionable recommendation to improve the NDA>",
    ...
  ]
}

Focus specifically on NDA-related risks:
1. Confidentiality scope — Is it overly broad? Does it cover public or independently developed information?
2. Definition of confidential information — Is it vague or excessively wide?
3. Duration — Is the confidentiality period reasonable? (typical: 2-5 years; perpetual for trade secrets)
4. Mutual vs Unilateral — Is it one-sided? Does the disclosing party also have obligations?
5. Permitted disclosures — Are there carve-outs for court/regulatory disclosure, prior knowledge, independent development?
6. IP / Work Product — Does the NDA inadvertently assign ownership of IP or derivative works?
7. Non-compete / Non-solicitation — Are there hidden restrictions beyond confidentiality?
8. Breach and remedies — Is injunctive relief or excessive damages clause present?
9. Governing law and jurisdiction — Is the jurisdiction favorable? Is there an arbitration clause?
10. Return/destruction of materials — Are obligations clearly defined?

NDA document to analyze:
---
{DOCUMENT_TEXT}
---`;

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
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
  throw new Error(`Unsupported file type: ${mimeType}. Please upload PDF, DOCX, or TXT.`);
}

async function callLlm(documentText: string): Promise<RiskReport> {
  const provider = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  const model = process.env.LLM_MODEL ?? "claude-opus-4-6";
  const apiKey = process.env.LLM_API_KEY;

  if (!apiKey) {
    return {
      risk_score: 0,
      summary: "LLM review is not configured. Set LLM_API_KEY and LLM_PROVIDER in .env.local to enable AI-powered NDA analysis.",
      red_flags: [],
      recommendations: ["Configure LLM_API_KEY in your .env.local file to enable AI-powered NDA review."],
    };
  }

  const truncated =
    documentText.length > 80000
      ? documentText.slice(0, 80000) + "\n\n[Document truncated for analysis]"
      : documentText;

  const prompt = NDA_REVIEW_PROMPT.replace("{DOCUMENT_TEXT}", truncated);

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
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as RiskReport;
      throw new Error("LLM returned invalid JSON response");
    }
  }

  if (provider === "openai" || provider === "openrouter") {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey,
      ...(provider === "openrouter" && { baseURL: "https://openrouter.ai/api/v1" }),
    });
    const res = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      // response_format not used — many OpenRouter models (e.g. Qwen) don't support it
    });
    const content = res.choices[0].message.content ?? "";
    try {
      return JSON.parse(content) as RiskReport;
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as RiskReport;
      throw new Error("LLM returned invalid JSON response");
    }
  }

  throw new Error(`Unknown LLM_PROVIDER: "${provider}". Use "anthropic", "openai", or "openrouter".`);
}


export async function reviewNdaDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ report: RiskReport; row: NdaReviewRow }> {
  const logsSheetId = process.env.LOGS_SHEETS_ID!;
  await ensureSheetExists("NdaReviews", NDA_REVIEW_HEADERS, logsSheetId);

  const documentText = await extractText(fileBuffer, mimeType);
  const report = await callLlm(documentText);

  const reviewId = uuid();
  const reportPath = "";

  const createdAt = new Date().toISOString();

  await appendSheetRow("NdaReviews", [
    reviewId,
    filename,
    String(report.risk_score),
    JSON.stringify(report.red_flags),
    JSON.stringify(report.recommendations),
    report.summary,
    reportPath,
    createdAt,
  ], logsSheetId);

  const row: NdaReviewRow = {
    review_id: reviewId,
    filename,
    risk_score: String(report.risk_score),
    red_flags: JSON.stringify(report.red_flags),
    recommendations: JSON.stringify(report.recommendations),
    summary: report.summary,
    report_url: reportPath,
    created_at: createdAt,
  };

  return { report, row };
}
