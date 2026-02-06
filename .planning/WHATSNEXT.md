# What's Next

## Immediate: Test Phase 3 Changes

Phase 3 (Vault Integration) was just completed but needs end-to-end verification. The bot needs to be restarted and tested with a real message.

**Test steps:**
1. Ensure `.env` has `NOTES_DIR` pointing to the vault root (the directory containing `Categories/` and `.obsidian/`)
2. Restart: `sudo systemctl restart focus-bot` or `/restart` from Telegram
3. Verify startup notification arrives in Telegram
4. Send a test message: "I've been thinking about how trees communicate through mycelium networks underground"
5. Check the resulting note file in NOTES_DIR:
   - Filename is AI-generated title (e.g., `Mycelium Communication Networks.md`)
   - Frontmatter has: `captured`, `source: telegram`, `status: inbox`, `categories` (with `[[Captures]]`), `topics`
   - Categories are valid (match files in Categories/ directory)
   - Body has inline `[[wiki-links]]`
6. Send `/health` to verify admin commands still work

**If something fails**, check `journalctl -u focus-bot -f` for errors. Common issues:
- NOTES_DIR not pointing to correct path (needs to be the dir with Categories/ in it)
- Claude response format issues (check regex JSON extraction in note-capture.ts)

## Phase 4: URL/Bookmark Capture

This is the next feature to implement. The enrichment service (`src/services/note-enrichment.ts`) is currently a stub.

### What it does

When a user sends a message containing a URL, the bot should:
1. **At capture time** (same Claude call): detect the URL, add `url` field to frontmatter, generate URL-aware title/categories (likely `[[References]]` or `[[Clippings]]`)
2. **Async enrichment** (after user gets confirmation): fetch the page, extract metadata (title, description, og:image), append a "Link Preview" section to the note body

### Files to create
- `src/utils/url.ts` -- URL extraction regex (`extractUrls(text)` returns URLs found)
- `src/utils/html-metadata.ts` -- Fetch page + extract og:title, og:description, og:site_name via regex (Bun native `fetch()`, 10s timeout)
- `src/utils/note-parser.ts` -- Split frontmatter from body, reassemble without re-serializing YAML (needed to append to existing note)

### Files to modify
- `src/services/note-capture.ts` -- When URL detected: add `url` field to frontmatter, hint Claude about URL in prompt
- `src/services/note-enrichment.ts` -- Replace stub with actual enrichment: fetch page metadata, append link preview to note
- `src/bot/handlers/message.ts` -- Pass URL info to `processNote()` so enrichment knows whether to fetch

### Design constraints
- No new npm dependencies (Bun has native `fetch()`)
- Enrichment failures must never crash the bot or block the user
- Non-URL messages should be completely unaffected
- The note-parser must preserve frontmatter exactly (don't re-serialize YAML)

### Example output for URL message

Message: "Check out this article on consciousness https://example.com/consciousness-article"

```markdown
---
captured: 2026-02-06T14:34
source: telegram
status: inbox
url: "https://example.com/consciousness-article"
categories:
  - "[[Captures]]"
  - "[[Clippings]]"
topics:
  - "[[Consciousness]]"
  - "[[Neuroscience]]"
---
Check out this article on [[consciousness]] https://example.com/consciousness-article

> **The Hard Problem of Consciousness Revisited**
> A comprehensive look at modern theories of consciousness and why the hard problem persists.
> — example.com
```

## Beyond Phase 4

Features to consider based on usage:
- **Emoji reaction acknowledgment** -- React with a checkmark before Claude processes, replace with note emoji when done (reduces perceived latency)
- **Voice note support** -- Transcribe audio + run through same capture pipeline
- **Review commands** -- `/inbox` to list unprocessed notes, `/review` for guided processing

See `.planning/research/IMPROVEMENT-OPTIONS-REPORT.md` for the full prioritized feature list.
