/**
 * Extract URLs from a text string.
 * Returns deduplicated array of http/https URLs found, or empty array if none.
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex);
  if (!matches) return [];
  return [...new Set(matches)];
}
