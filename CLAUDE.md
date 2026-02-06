# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Focus Bot is a Telegram bot that captures quick thoughts and saves them as markdown notes to an Obsidian vault. Messages sent to the bot are analyzed by Claude to generate a title, categories, topics, and inline wiki-links, then written as markdown files with YAML frontmatter to the vault root. Organization follows Steph Ango's vault patterns: categories as wiki-links to hub notes, topics for subject matter, and `[[wiki-links]]` in note body.

## Commands

```bash
# Development (with hot reload)
bun run dev

# Production build
bun run build

# Run built output
bun run start

# Type check without emitting
npx tsc --noEmit
```

## Architecture

### Message Flow
```
Telegram → Grammy Bot → Auth Middleware → Message Handler → Note Capture Service → fs.writeFileSync → NOTES_DIR/
                                                         → (async) Note Enrichment Service (stub)
```

1. Grammy receives Telegram update via long polling (`@grammyjs/runner`)
2. Auth middleware checks user ID against `ALLOWED_USER_IDS` whitelist
3. Message handler extracts text and calls `captureNote()` (fast path)
4. Note capture service:
   - **Metadata extraction**: Claude haiku analyzes message, returns JSON `{title, categories, topics, body}`
   - Categories are constrained to files in `NOTES_DIR/Categories/` (loaded at startup)
   - Body includes inline `[[wiki-links]]` for key concepts
   - **File writing**: Direct `fs.writeFileSync` to `NOTES_DIR`
5. Handler replies to user with "Saved: [title]"
6. Handler fires `processNote()` as fire-and-forget (async enrichment, currently a stub)

### Key Files
- `src/index.ts` - Entry point, bot startup, categories loading, graceful shutdown
- `src/config.ts` - Zod-validated environment configuration + `CATEGORIES_DIR` + `loadCategories()`
- `src/bot/bot.ts` - Grammy bot initialization, middleware/handler registration
- `src/bot/middleware/auth.ts` - User whitelist enforcement
- `src/bot/handlers/message.ts` - Routes text messages to note capture, fires async enrichment
- `src/services/note-capture.ts` - Core logic: metadata extraction + direct file writing
- `src/services/note-enrichment.ts` - Async enrichment stub (future: URL metadata, vault scanning)

### Claude Agent SDK Usage Pattern

The bot uses `query()` from `@anthropic-ai/claude-agent-sdk` for a single call:

**Metadata extraction** (`haiku` model, 1 turn):
- Prompt includes the category list from `Categories/` directory
- Asks for JSON with title, categories, topics, and wiki-linked body
- Response parsed with regex to extract JSON, validated with Zod
- No tools allowed (pure text response)

File writing is done directly via `fs.writeFileSync` — no Claude SDK involved.

### Async Enrichment Architecture

After the fast capture path completes and the user gets their reply, the message handler fires `processNote()` as a fire-and-forget call. This is currently a no-op stub. Future enrichment tasks:
- URL/bookmark metadata fetching
- Vault-aware link suggestions

Enrichment failures are logged but never surface to the user.

## Configuration

Required environment variables (validated at startup):

- **`TELEGRAM_BOT_TOKEN`** — Bot token from @BotFather
- **`ALLOWED_USER_IDS`** — Comma-separated Telegram user IDs
- **`NOTES_DIR`** — Absolute path to Obsidian vault root (must contain a `Categories/` subdirectory)
- **`ANTHROPIC_API_KEY`** — Optional (defaults to subscription model)

Derived values:
- **`CATEGORIES_DIR`** — `NOTES_DIR/Categories/` (must exist, read at startup)

## Note Format

The filename IS the title (Obsidian convention). No `title` property in frontmatter. Inspired by [Steph Ango's vault](https://stephango.com/vault).

```markdown
---
captured: 2026-02-04T14:34
source: telegram
status: inbox
categories:
  - "[[Captures]]"
  - "[[Ideas]]"
topics:
  - "[[Consciousness]]"
  - "[[Philosophy]]"
---
One way to prove or overcome the subjectiveness of [[consciousness]] or [[qualia]], would be to have some sort of consciousness sharing experience.
```

- **Filename**: AI-generated title with spaces preserved (e.g., `Consciousness Sharing to Prove Qualia.md`)
- **captured**: Local datetime in `YYYY-MM-DDTHH:mm` format (Obsidian-compatible)
- **source**: Always `telegram` (enables Dataview filtering)
- **status**: Always `inbox` (for processing workflow)
- **categories**: Wiki-links to hub notes in `Categories/` directory. `[[Captures]]` always included.
- **topics**: Wiki-links for subject matter (freeform, AI-generated)
- **Body**: Original message with inline `[[wiki-links]]` for key concepts
- **Location**: `NOTES_DIR` root

## Planning Documentation

The `.planning/` directory contains project documentation:
- `PROJECT.md` - Vision, decisions, requirements
- `ROADMAP.md` - Phased execution plan
- `STATE.md` - Current progress tracking
- `research/` - Architecture, stack, and pitfall analysis
- `phases/` - Detailed plans for each development phase
