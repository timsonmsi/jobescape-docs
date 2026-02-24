import { put } from "@vercel/blob";

/**
 * Upload a generated file to Vercel Blob Storage.
 * Returns the public URL of the uploaded file.
 */
export async function saveToBlob(
  subDir: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const { url } = await put(`${subDir}/${filename}`, buffer, {
    access: "public",
  });
  return url;
}
