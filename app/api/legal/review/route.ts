import { NextRequest } from "next/server";
import { reviewLegalDocument } from "@/lib/legal/service";
import { apiOk, apiError } from "@/lib/utils/response";

// TODO(auth): Add session validation middleware here

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Failed to parse form data. Send a multipart/form-data request.", 400);
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return apiError("No file provided. Include a 'file' field in the form data.", 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return apiError(
      `Unsupported file type: ${file.type}. Allowed: PDF, DOCX, TXT.`,
      400
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return apiError("File size exceeds the 10 MB limit.", 400);
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { report, row } = await reviewLegalDocument(buffer, file.name, file.type);
    return apiOk("Legal review complete", { report, row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/legal/review]", file.name, message);
    return apiError(message);
  }
}
