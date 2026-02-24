import { NextRequest } from "next/server";
import { z } from "zod";
import { generateNda } from "@/lib/nda/service";
import { apiOk, apiError } from "@/lib/utils/response";

// TODO(auth): Add session validation middleware here

const NdaSchema = z.discriminatedUnion("receiving_type", [
  z.object({
    disclosure_party: z.enum([
      "NomadVentures",
      "NomadVentureStudioFZE",
      "DataDreamerAI",
    ]),
    receiving_type: z.literal("Individual"),
    effective_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    purpose: z.string().min(10, "Purpose must be at least 10 characters"),
    recv_full_name: z.string().min(1, "Full name is required"),
    recv_date_of_birth: z.string().min(1, "Date of birth is required"),
    recv_birth_place: z.string().min(1, "Birth place is required"),
    recv_passport_number: z.string().min(1, "Passport number is required"),
    recv_passport_nationality: z.string().min(1, "Nationality is required"),
    recv_residence_address: z.string().min(1, "Residence address is required"),
  }),
  z.object({
    disclosure_party: z.enum([
      "NomadVentures",
      "NomadVentureStudioFZE",
      "DataDreamerAI",
    ]),
    receiving_type: z.literal("Company"),
    effective_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    purpose: z.string().min(10, "Purpose must be at least 10 characters"),
    recv_company_name: z.string().min(1, "Company name is required"),
    recv_company_address: z.string().min(1, "Company address is required"),
    recv_representative_name: z.string().min(1, "Representative name is required"),
  }),
]);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = NdaSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join("; ");
    return apiError(`Validation error: ${issues}`, 400);
  }

  try {
    const result = await generateNda(parsed.data);
    return apiOk("NDA generated successfully", result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/nda/generate]", message);
    return apiError(message);
  }
}
