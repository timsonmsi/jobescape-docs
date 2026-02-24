import CloudConvert from "cloudconvert";

/**
 * Convert a DOCX buffer to PDF using CloudConvert.
 * Requires CLOUDCONVERT_API_KEY env var.
 */
export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.CLOUDCONVERT_API_KEY;
  if (!apiKey) {
    throw new Error(
      "CLOUDCONVERT_API_KEY is not set. Add it to your environment variables."
    );
  }
  return cloudConvertStrategy(docxBuffer, apiKey);
}

interface CloudConvertTask {
  name: string;
  result?: { files?: { url: string }[] };
}

interface CloudConvertJob {
  id: string;
  tasks: CloudConvertTask[];
}

async function cloudConvertStrategy(docxBuffer: Buffer, apiKey: string): Promise<Buffer> {
  const cloudConvert = new CloudConvert(apiKey);

  const job = (await cloudConvert.jobs.create({
    tasks: {
      "upload-docx": {
        operation: "import/upload",
      },
      convert: {
        operation: "convert",
        input: ["upload-docx"],
        output_format: "pdf",
      },
      "export-pdf": {
        operation: "export/url",
        input: ["convert"],
      },
    },
  } as Parameters<typeof cloudConvert.jobs.create>[0])) as unknown as CloudConvertJob;

  const uploadTask = job.tasks.find((t) => t.name === "upload-docx");
  if (!uploadTask) throw new Error("CloudConvert: upload task not found");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await cloudConvert.tasks.upload(uploadTask as any, docxBuffer, "document.docx");

  const finished = (await cloudConvert.jobs.wait(job.id)) as unknown as CloudConvertJob;
  const exportTask = finished.tasks.find((t) => t.name === "export-pdf");
  const fileUrl = exportTask?.result?.files?.[0]?.url;

  if (!fileUrl) throw new Error("CloudConvert: no output URL in completed job");

  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`CloudConvert: failed to download PDF (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
}
