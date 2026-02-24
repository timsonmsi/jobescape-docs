import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const PUBLIC_DIR = join(process.cwd(), "public");

/**
 * Save a buffer to public/generated/<subDir>/<filename> and return the URL path.
 * Creates the directory if it doesn't exist.
 */
export function saveGeneratedFile(
  subDir: string,
  filename: string,
  buffer: Buffer
): string {
  const dir = join(PUBLIC_DIR, "generated", subDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), buffer);
  return `/generated/${subDir}/${filename}`;
}
