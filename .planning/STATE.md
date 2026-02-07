# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Message -> Note. No friction, no decisions. Just send a thought and it's captured with intelligent metadata.
**Current focus:** Tags refactor complete. Categories+topics replaced with type-based tags.

## Current Position

Phase: 5 of 5 complete (Tags Refactor)
Status: All planned features delivered
Last activity: 2026-02-07 - Tags refactor (replaced categories+topics with type-based tags)

Progress: [██████████] 100%

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 5]: Replaced categories+topics with type-based tags (plain strings, always plural)
- [Phase 5]: `captures` tag code-enforced (always prepended, not in AI response)
- [Phase 5]: Removed Categories/ directory dependency (loadCategories, CATEGORIES_DIR)
- [Phase 5]: Tags describe type of capture (quotes, ideas, articles), not topic
- [Phase 5]: Wiki-links in body unchanged — handle subject matter connections
- [Phase 4]: URL notes route to NOTES_DIR/Bookmarks/ (text notes stay in vault root)
- [Phase 4]: Telegraph (telegra.ph) publishes readable summaries of URL content
- [Phase 4]: Enrichment failures logged but never surface to user

### Pending Todos

- Consider voice note support (transcribe audio + capture pipeline)
- Consider review commands (/inbox, /review)

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-07
Stopped at: Phase 5 (Tags Refactor) complete
Resume file: .planning/WHATSNEXT.md

## What's Been Delivered

### Phase 1: Foundation (Complete - 2026-02-03)
- Config validation with Zod (fail-fast on invalid config)
- Auth middleware (blocks unauthorized users)
- /start command handler (help message)
- Bot assembly with middleware chain
- Entry point with runner and graceful shutdown

### Phase 2: Core Capture (Complete - 2026-02-05)
- Note capture service: Claude haiku metadata extraction + direct file writing
- Text message handler wired to bot
- Enriched frontmatter (captured, categories, topics, source, status)
- Fire-and-forget enrichment stub
- Admin commands (/health, /status, /logs, /restart)
- systemd service file for production
- CLAUDE.md and README.md documentation

### Phase 3: Vault Integration (Complete - 2026-02-06)
- Steph Ango vault research (article, repo, templates, property patterns)
- Obsidian wiki-link frontmatter research (native support, Dataview, plugins)
- Restructured note format: categories (wiki-links), topics (wiki-links), inline [[wiki-links]] in body
- Categories loaded from Categories/ directory at startup
- Notes written to vault root (removed Captures/ subdirectory)
- Removed build step (Bun runs TS directly)
- /restart in Telegram command menu
- Startup notification to allowed users on boot

### Phase 4: URL/Bookmark Capture (Complete - 2026-02-06)
- URL detection and extraction in messages
- YouTube transcript fetching via yt-dlp + AI summarization
- Generic URL article text extraction + AI summarization
- Telegraph (telegra.ph) publishing for readable summary links
- Telegraph URL stored in note frontmatter
- Telegraph link sent as reply to user
- URL notes route to Bookmarks/ directory
- Reaction feedback: 👍 on capture, 💯 on enrichment complete

### Phase 5: Tags Refactor (Complete - 2026-02-07)
- Replaced categories+topics with type-based tags (plain strings, always plural)
- Removed Categories/ directory dependency (CATEGORIES_DIR, loadCategories)
- `captures` tag code-enforced (always prepended)
- Updated Claude prompt for tag philosophy (type-based, not topical)
- Updated all test files, documentation, and planning docs

### Research
- 2026-02-05: Second brain methodologies, feature prioritization, competitive landscape
- 2026-02-06: Steph Ango vault system, Obsidian property types, wiki-links in frontmatter
