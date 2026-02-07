/**
 * Extract readable text from HTML pages for AI summarization.
 * Uses regex-based tag stripping — simple but sufficient since
 * Claude tolerates noise well during summarization.
 */

const STRIP_TAGS_RE = /<(script|style|noscript|iframe|svg|nav|header|footer|aside|form)\b[^>]*>[\s\S]*?<\/\1>/gi;
const HTML_TAG_RE = /<[^>]+>/g;

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};
const ENTITY_RE = /&(?:amp|lt|gt|quot|apos|nbsp|#39);/g;

/**
 * Fetch a URL and extract readable text content from HTML.
 * Returns null if the page is not HTML, too short, or fetch fails.
 */
export async function fetchArticleText(
  url: string,
  timeoutMs: number = 15_000,
  maxChars: number = 50_000
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FocusBot/1.0)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;

    const html = await response.text();
    return extractText(html, maxChars);
  } catch (error) {
    console.warn(`[html-text] Failed to fetch ${url}:`, error);
    return null;
  }
}

function extractText(html: string, maxChars: number): string | null {
  // Remove tags whose content should be stripped entirely
  let cleaned = html.replace(STRIP_TAGS_RE, ' ');

  // Strip remaining HTML tags
  cleaned = cleaned.replace(HTML_TAG_RE, ' ');

  // Decode common HTML entities
  cleaned = cleaned.replace(ENTITY_RE, (entity) => ENTITY_MAP[entity] || entity);

  // Decode numeric entities (&#123; and &#x1a;)
  cleaned = cleaned.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  cleaned = cleaned.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Collapse whitespace
  const text = cleaned.replace(/\s+/g, ' ').trim();

  // Too short to be a real article
  if (text.length < 200) return null;

  return text.length > maxChars ? text.slice(0, maxChars) + '...' : text;
}
