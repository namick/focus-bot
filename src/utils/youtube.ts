/**
 * YouTube utilities: video ID extraction and transcript fetching.
 * Uses yt-dlp for reliable transcript extraction (YouTube's direct APIs
 * require proof-of-origin tokens that change frequently).
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const YT_DLP_PATH = process.env.YT_DLP_PATH || path.join(os.homedir(), '.local', 'bin', 'yt-dlp');

const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
];

export function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}

/**
 * Fetch the transcript for a YouTube video using yt-dlp.
 * Returns plain text transcript or null if unavailable.
 */
export async function fetchTranscript(
  url: string,
  timeoutMs: number = 30_000
): Promise<string | null> {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-transcript-'));
  const outputTemplate = path.join(tmpDir, 'sub');

  try {
    await runYtDlp([
      '--write-subs', '--write-auto-subs',
      '--sub-langs', 'en',
      '--sub-format', 'srv1',
      '--skip-download',
      '-o', outputTemplate,
      `https://www.youtube.com/watch?v=${videoId}`,
    ], timeoutMs);

    // yt-dlp writes to sub.en.srv1
    const subFile = path.join(tmpDir, 'sub.en.srv1');
    if (!fs.existsSync(subFile)) {
      console.log(`[youtube] No subtitle file produced for ${videoId}`);
      return null;
    }

    const xml = fs.readFileSync(subFile, 'utf-8');
    const transcript = parseTranscriptXml(xml);
    return transcript || null;
  } catch (error) {
    console.warn(`[youtube] Failed to fetch transcript for ${url}:`, error);
    return null;
  } finally {
    // Clean up temp dir
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Run yt-dlp with the given args, resolving when complete.
 */
function runYtDlp(args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(YT_DLP_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => { proc.kill(); reject(new Error('yt-dlp timeout')); }, timeoutMs);

    let stderr = '';
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp exited with code ${code}: ${stderr.slice(0, 200)}`));
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Parse YouTube's transcript XML into plain text.
 * The XML has <text> elements with start/dur attributes and HTML-encoded content.
 */
function parseTranscriptXml(xml: string): string {
  const segments: string[] = [];
  const textRegex = /<text[^>]*>([\s\S]*?)<\/text>/g;

  let match;
  while ((match = textRegex.exec(xml)) !== null) {
    let text = match[1];
    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\n/g, ' ')
      .trim();

    if (text) segments.push(text);
  }

  return segments.join(' ');
}
