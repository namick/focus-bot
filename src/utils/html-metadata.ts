export interface PageMetadata {
  title: string | null;
  description: string | null;
  siteName: string | null;
}

const EMPTY: PageMetadata = { title: null, description: null, siteName: null };

/**
 * oEmbed endpoints for sites that block bot HTML fetches.
 */
const OEMBED_PROVIDERS: { pattern: RegExp; endpoint: string }[] = [
  {
    pattern: /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch|youtu\.be\/)/,
    endpoint: 'https://www.youtube.com/oembed',
  },
  {
    pattern: /^https?:\/\/(?:www\.)?vimeo\.com\//,
    endpoint: 'https://vimeo.com/api/oembed.json',
  },
];

/**
 * Fetch a URL and extract Open Graph / HTML metadata.
 * Falls back to oEmbed for known providers (YouTube, Vimeo, etc.).
 * Never throws — returns null fields on any failure.
 */
export async function fetchPageMetadata(
  url: string,
  timeoutMs: number = 10_000
): Promise<PageMetadata> {
  // Try oEmbed first for known providers (more reliable than scraping)
  const oembed = OEMBED_PROVIDERS.find((p) => p.pattern.test(url));
  if (oembed) {
    const result = await fetchOembed(oembed.endpoint, url, timeoutMs);
    if (result.title) return result;
  }

  // Fall back to HTML scraping
  return fetchHtmlMetadata(url, timeoutMs);
}

async function fetchOembed(
  endpoint: string,
  url: string,
  timeoutMs: number
): Promise<PageMetadata> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const oembedUrl = `${endpoint}?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    clearTimeout(timeout);

    if (!response.ok) return EMPTY;

    const data = (await response.json()) as Record<string, unknown>;
    return {
      title: typeof data.title === 'string' ? data.title : null,
      description: typeof data.author_name === 'string' ? `by ${data.author_name}` : null,
      siteName: typeof data.provider_name === 'string' ? data.provider_name : null,
    };
  } catch (error) {
    console.warn(`[html-metadata] oEmbed failed for ${url}:`, error);
    return EMPTY;
  }
}

async function fetchHtmlMetadata(
  url: string,
  timeoutMs: number
): Promise<PageMetadata> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FocusBot/1.0 (Obsidian note capture)',
        Accept: 'text/html',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[html-metadata] HTTP ${response.status} for ${url}`);
      return EMPTY;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      console.warn(`[html-metadata] Non-HTML content-type for ${url}: ${contentType}`);
      return EMPTY;
    }

    // Read only first ~50KB to capture <head> metadata without downloading entire page
    const reader = response.body?.getReader();
    if (!reader) return EMPTY;

    let html = '';
    const decoder = new TextDecoder();
    const MAX_BYTES = 50_000;

    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel();

    return parseMetadata(html);
  } catch (error) {
    console.warn(`[html-metadata] Failed to fetch ${url}:`, error);
    return EMPTY;
  }
}

function getMetaContent(html: string, property: string): string | null {
  const regex = new RegExp(
    `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']` +
      `|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
    'i'
  );
  const match = html.match(regex);
  return match ? (match[1] || match[2] || null) : null;
}

function parseMetadata(html: string): PageMetadata {
  const ogTitle = getMetaContent(html, 'og:title');
  let title = ogTitle;
  if (!title) {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    title = titleMatch ? titleMatch[1].trim() : null;
  }

  return {
    title,
    description: getMetaContent(html, 'og:description') || getMetaContent(html, 'description'),
    siteName: getMetaContent(html, 'og:site_name'),
  };
}
