import { NextRequest } from "next/server";
import { generateInvoicePdf } from "@/lib/invoices/service";
import { apiOk, apiError } from "@/lib/utils/response";

// TODO(auth): Add session validation middleware here

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return apiError("Invoice number is required", 400);
  }

  const sheetName = req.nextUrl.searchParams.get("sheet");
  if (!sheetName) {
    return apiError("Missing required query param: ?sheet=", 400);
  }

  try {
    const result = await generateInvoicePdf(id, sheetName);
    return apiOk("Invoice PDF generated successfully", result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/invoices/generate]", id, sheetName, message);
    return apiError(message);
  }
}
