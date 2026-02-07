export interface ParsedNote {
  frontmatter: string; // Raw YAML between --- delimiters (excluding delimiters)
  body: string; // Everything after the closing ---
}

/**
 * Parse a markdown note into frontmatter and body.
 * Preserves exact YAML text to avoid re-serialization artifacts.
 */
export function parseNote(content: string): ParsedNote {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: '', body: content };
  }
  return { frontmatter: match[1], body: match[2] };
}

/**
 * Reassemble a note from frontmatter and body.
 */
export function assembleNote(parsed: ParsedNote): string {
  return `---\n${parsed.frontmatter}\n---\n${parsed.body}`;
}

/**
 * Append text to the body of a note, preserving frontmatter exactly.
 */
export function appendToNoteBody(content: string, appendix: string): string {
  const parsed = parseNote(content);
  const separator = parsed.body.endsWith('\n') ? '\n' : '\n\n';
  return assembleNote({
    frontmatter: parsed.frontmatter,
    body: parsed.body + separator + appendix + '\n',
  });
}
