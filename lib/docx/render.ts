import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

/**
 * Render a DOCX template buffer with the provided data object.
 * Tags in the template use {tag_name} Angular-style syntax.
 * Returns the rendered DOCX as a Buffer.
 */
export function renderDocxTemplate(
  templateBuffer: Buffer,
  data: Record<string, string | number>
): Buffer {
  let zip: PizZip;
  try {
    zip = new PizZip(templateBuffer);
  } catch (err) {
    throw new Error(
      `Invalid DOCX template: could not parse file. ${err instanceof Error ? err.message : ""}`
    );
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });

  try {
    doc.render(data);
  } catch (err: unknown) {
    // Docxtemplater throws structured errors with .properties.errors
    const structuredErr = err as {
      properties?: { errors?: { message: string }[] };
      message?: string;
    };
    const errors = structuredErr.properties?.errors;
    if (errors?.length) {
      const msgs = errors.map((e) => e.message).join(", ");
      throw new Error(`DOCX template render error: ${msgs}`);
    }
    throw err;
  }

  const output = doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return output;
}
