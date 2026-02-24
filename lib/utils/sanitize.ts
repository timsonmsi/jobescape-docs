/**
 * Sanitize a string for use as a filename.
 * Removes or replaces characters that are not safe in filenames.
 */
export function sanitizeFilename(input: string): string {
  return input
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}
