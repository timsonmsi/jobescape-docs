"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const baseSchema = {
  disclosure_party: z.enum([
    "NomadVentures",
    "NomadVentureStudioFZE",
    "DataDreamerAI",
  ]),
  receiving_type: z.enum(["Individual", "Company"]),
  effective_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  purpose: z.string().min(10, "At least 10 characters"),
  // Individual
  recv_full_name: z.string().optional(),
  recv_date_of_birth: z.string().optional(),
  recv_birth_place: z.string().optional(),
  recv_passport_number: z.string().optional(),
  recv_passport_nationality: z.string().optional(),
  recv_residence_address: z.string().optional(),
  // Company
  recv_company_name: z.string().optional(),
  recv_company_address: z.string().optional(),
  recv_representative_name: z.string().optional(),
};

const schema = z.object(baseSchema).superRefine((data, ctx) => {
  if (data.receiving_type === "Individual") {
    if (!data.recv_full_name) ctx.addIssue({ code: "custom", path: ["recv_full_name"], message: "Required" });
    if (!data.recv_date_of_birth) ctx.addIssue({ code: "custom", path: ["recv_date_of_birth"], message: "Required" });
    if (!data.recv_birth_place) ctx.addIssue({ code: "custom", path: ["recv_birth_place"], message: "Required" });
    if (!data.recv_passport_number) ctx.addIssue({ code: "custom", path: ["recv_passport_number"], message: "Required" });
    if (!data.recv_passport_nationality) ctx.addIssue({ code: "custom", path: ["recv_passport_nationality"], message: "Required" });
    if (!data.recv_residence_address) ctx.addIssue({ code: "custom", path: ["recv_residence_address"], message: "Required" });
  } else {
    if (!data.recv_company_name) ctx.addIssue({ code: "custom", path: ["recv_company_name"], message: "Required" });
    if (!data.recv_company_address) ctx.addIssue({ code: "custom", path: ["recv_company_address"], message: "Required" });
    if (!data.recv_representative_name) ctx.addIssue({ code: "custom", path: ["recv_representative_name"], message: "Required" });
  }
});

type FormData = z.infer<typeof schema>;

interface GenerateResult {
  agreementId: string;
  pdfUrl: string;
  driveFileId: string;
}

export function NdaForm() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      disclosure_party: "NomadVentures",
      receiving_type: "Individual",
      effective_date: new Date().toISOString().split("T")[0],
      purpose: "",
      recv_full_name: "",
      recv_date_of_birth: "",
      recv_birth_place: "",
      recv_passport_number: "",
      recv_passport_nationality: "",
      recv_residence_address: "",
      recv_company_name: "",
      recv_company_address: "",
      recv_representative_name: "",
    },
  });

  const receivingType = form.watch("receiving_type");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/nda/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setResult(json.data);
      toast.success("NDA generated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">
        Generate NDA
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Disclosure Party */}
          <FormField
            control={form.control}
            name="disclosure_party"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disclosure Party</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select party" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="NomadVentures">NomadVentures</SelectItem>
                    <SelectItem value="NomadVentureStudioFZE">NomadVentureStudioFZE</SelectItem>
                    <SelectItem value="DataDreamerAI">DataDreamerAI</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Receiving Type */}
          <FormField
            control={form.control}
            name="receiving_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receiving Party Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Individual fields */}
          {receivingType === "Individual" && (
            <>
              <FormField control={form.control} name="recv_full_name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="recv_date_of_birth" render={({ field }) => (
                  <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="recv_birth_place" render={({ field }) => (
                  <FormItem><FormLabel>Place of Birth</FormLabel><FormControl><Input placeholder="City, Country" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="recv_passport_number" render={({ field }) => (
                  <FormItem><FormLabel>Passport Number</FormLabel><FormControl><Input placeholder="AB1234567" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="recv_passport_nationality" render={({ field }) => (
                  <FormItem><FormLabel>Nationality</FormLabel><FormControl><Input placeholder="Kazakhstani" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="recv_residence_address" render={({ field }) => (
                <FormItem><FormLabel>Residence Address</FormLabel><FormControl><Input placeholder="Full address" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </>
          )}

          {/* Company fields */}
          {receivingType === "Company" && (
            <>
              <FormField control={form.control} name="recv_company_name" render={({ field }) => (
                <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="Acme Corp Ltd." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="recv_company_address" render={({ field }) => (
                <FormItem><FormLabel>Company Address</FormLabel><FormControl><Input placeholder="Full registered address" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="recv_representative_name" render={({ field }) => (
                <FormItem><FormLabel>Representative Name</FormLabel><FormControl><Input placeholder="Jane Smith, CEO" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </>
          )}

          {/* Common fields */}
          <FormField control={form.control} name="effective_date" render={({ field }) => (
            <FormItem><FormLabel>Effective Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name="purpose" render={({ field }) => (
            <FormItem><FormLabel>Purpose</FormLabel><FormControl><Input placeholder="Describe the purpose of this NDA…" {...field} /></FormControl><FormMessage /></FormItem>
          )} />

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {loading && <Loader2 size={16} className="animate-spin mr-2" />}
            {loading ? "Generating…" : "Generate NDA PDF"}
          </Button>
        </form>
      </Form>

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-800 mb-1">NDA ready!</p>
          <a
            href={result.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink size={14} />
            Open PDF
          </a>
          <p className="text-xs text-gray-400 mt-1">ID: {result.agreementId}</p>
        </div>
      )}
    </div>
  );
}
