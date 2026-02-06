# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Focus Bot is a Telegram bot that captures quick thoughts and saves them as markdown notes to an Obsidian vault. Messages sent to the bot are analyzed by Claude to generate a title and 3-5 tags, then written as markdown files with YAML frontmatter to a `Captures/` subdirectory.

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
Telegram → Grammy Bot → Auth Middleware → Message Handler → Note Capture Service → fs.writeFileSync → Captures/
                                                         → (async) Note Enrichment Service (stub)
```

1. Grammy receives Telegram update via long polling (`@grammyjs/runner`)
2. Auth middleware checks user ID against `ALLOWED_USER_IDS` whitelist
3. Message handler extracts text and calls `captureNote()` (fast path)
4. Note capture service:
   - **Metadata extraction**: Claude haiku analyzes message, returns JSON `{title, tags}`
   - **File writing**: Direct `fs.writeFileSync` to `CAPTURES_DIR` (no Claude SDK needed)
5. Handler replies to user with "Saved: [title]"
6. Handler fires `processNote()` as fire-and-forget (async enrichment, currently a stub)

### Key Files
- `src/index.ts` - Entry point, bot startup, Captures/ dir creation, graceful shutdown
- `src/config.ts` - Zod-validated environment configuration + derived `CAPTURES_DIR`
- `src/bot/bot.ts` - Grammy bot initialization, middleware/handler registration
- `src/bot/middleware/auth.ts` - User whitelist enforcement
- `src/bot/handlers/message.ts` - Routes text messages to note capture, fires async enrichment
- `src/services/note-capture.ts` - Core logic: metadata extraction + direct file writing
- `src/services/note-enrichment.ts` - Async enrichment stub (future: type classification, link suggestions)

### Claude Agent SDK Usage Pattern

The bot uses `query()` from `@anthropic-ai/claude-agent-sdk` for a single call:

**Metadata extraction** (`haiku` model, 1 turn):
- Prompt asks for JSON response with title and tags
- Response parsed with regex to extract JSON, validated with Zod
- No tools allowed (pure text response)

File writing is done directly via `fs.writeFileSync` — no Claude SDK involved.

### Async Enrichment Architecture

After the fast capture path completes and the user gets their reply, the message handler fires `processNote()` as a fire-and-forget call. This is currently a no-op stub. Future enrichment tasks:
- Note type classification (fleeting, task, reference, journal, quote)
- Link suggestions to existing vault notes
- Summary generation for long notes
- Alias generation

Enrichment failures are logged but never surface to the user.

## Configuration

Required environment variables (validated at startup):

- **`TELEGRAM_BOT_TOKEN`** — Bot token from @BotFather
- **`ALLOWED_USER_IDS`** — Comma-separated Telegram user IDs
- **`NOTES_DIR`** — Absolute path to Obsidian vault
- **`ANTHROPIC_API_KEY`** — Optional (defaults to subscription model)

Derived values:
- **`CAPTURES_DIR`** — `NOTES_DIR/Captures/` (created at startup)

## Note Format

The filename IS the title (Obsidian convention). No `title` property in frontmatter.

```markdown
---
created: 2026-02-04T14:34
tags:
  - tag-one
  - tag-two
  - tag-three
source: telegram
status: inbox
---

Original message content here.
```

- **Filename**: AI-generated title with spaces preserved (e.g., `Coffee Machine Algorithm.md`)
- **created**: Local datetime in `YYYY-MM-DDTHH:mm` format (Obsidian-compatible)
- **source**: Always `telegram` (enables Dataview filtering)
- **status**: Always `inbox` (for processing workflow)
- **Location**: `NOTES_DIR/Captures/` subdirectory

## Planning Documentation

The `.planning/` directory contains project documentation:
- `PROJECT.md` - Vision, decisions, requirements
- `ROADMAP.md` - Phased execution plan
- `STATE.md` - Current progress tracking
- `research/` - Architecture, stack, and pitfall analysis
- `phases/` - Detailed plans for each development phase
