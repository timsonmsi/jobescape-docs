import { NextRequest } from "next/server";
import { generateInvoiceDoc } from "@/lib/invoices/service";
import { apiOk, apiError } from "@/lib/utils/response";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: employeeId } = params;

  if (!employeeId) {
    return apiError("employee_id is required", 400);
  }

  const sheetName = req.nextUrl.searchParams.get("sheet");
  if (!sheetName) {
    return apiError("Missing required query param: ?sheet=", 400);
  }

  try {
    const result = await generateInvoiceDoc(employeeId, sheetName);
    return apiOk("Invoice generated successfully", result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/invoices/generate]", employeeId, sheetName, message);
    return apiError(message);
  }
}
