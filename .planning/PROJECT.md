# Focus Bot

## What This Is

A focused Telegram bot that captures quick thoughts and saves them as markdown notes to an Obsidian vault. Messages are analyzed by Claude to generate a title and 3-5 tags, then written as markdown files with YAML frontmatter to a `Captures/` subdirectory.

## Core Value

**One thing done well:** Message -> Note. No friction, no decisions. Just send a thought and it's captured with intelligent metadata.

**Architectural principle:** Capture and organization are separate activities. Focus Bot optimizes ruthlessly for capture speed and reliability. Organization, linking, and enrichment happen asynchronously.

## How It Works

1. User sends a text message to the Telegram bot
2. Grammy receives the update, auth middleware checks user whitelist
3. Claude (haiku) analyzes content, returns JSON with title and 3-5 tags
4. Bot writes markdown file directly to `Captures/` subdirectory via `fs.writeFileSync`
5. Bot confirms: "Saved: [Note Title]"
6. Async enrichment fires (currently a stub for future type classification, link suggestions)

## Technical Approach

**Stack:**
- Grammy + @grammyjs/runner -- Telegram bot framework with concurrent long polling
- @anthropic-ai/claude-agent-sdk -- Claude haiku for metadata extraction (JSON response)
- Zod -- Config and metadata validation
- TypeScript + Bun runtime
- sanitize-filename -- Safe filename generation

**Architecture:**
- Two-phase capture: metadata extraction (Claude) + direct file writing (fs)
- Captures land in `NOTES_DIR/Captures/` subdirectory (created at startup)
- Claude is used only for metadata extraction (1 turn, no tools)
- Fire-and-forget enrichment path after user gets confirmation
- systemd service for production deployment with auto-restart

**Note Format:**
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
- The filename IS the title (Obsidian convention) -- no `title` in frontmatter
- **created**: Local datetime `YYYY-MM-DDTHH:mm` (Obsidian-compatible)
- **source**: Always `telegram` (enables Dataview filtering)
- **status**: Always `inbox` (for processing workflow)

## Commands

- `/start` -- Help message explaining how to use the bot
- `/health` -- Check bot health and uptime
- `/status` -- Show systemd service status
- `/logs` -- Show recent log entries
- `/restart` -- Restart the bot service

## Constraints

- Single user or small whitelist (personal tool)
- Notes directory must exist and be writable
- Captures go to `Captures/` subdirectory within vault
- Flat tags (no hierarchy like `#project/foo`)
- 3-5 tags per note

## What This Is NOT

- Not a general-purpose Claude Code bot (that's Claudegram)
- Not a note search/retrieval system (that's Obsidian's job)
- Not a multi-vault manager
- Not handling images, voice, or attachments (text only for v1)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Claude Agent SDK for metadata only | Reliable JSON extraction; file writing done directly via fs | Validated |
| Direct fs.writeFileSync over Claude Write tool | More reliable, faster, no tool permission issues | Validated |
| Flat tags | Simplicity; no existing convention to follow | Validated |
| Spaces in filenames | Obsidian convention -- filename IS the title | Validated |
| Captures/ subdirectory | Aligns with GTD inbox, BASB capture, Zettelkasten fleeting notes | Validated |
| No title in frontmatter | Obsidian uses filename as title; avoids duplication | Validated |
| Local datetime format | `YYYY-MM-DDTHH:mm` matches Obsidian DateTime property type | Validated |
| source/status fields | Enables Dataview queries and inbox processing workflow | Validated |
| Fire-and-forget enrichment | Never blocks the user; enrichment failures are logged only | Validated |
| Zod for config + metadata | Consistent validation pattern throughout the app | Validated |
| Bun runtime | Fast startup, built-in TypeScript support | Validated |
| systemd for production | Auto-restart on failure, starts on boot, journal logging | Validated |

## Requirements

### Validated

- [x] CFG-01: Config validated via Zod (TELEGRAM_BOT_TOKEN, NOTES_DIR, ALLOWED_USER_IDS)
- [x] CFG-02: Bot fails fast with clear error on invalid config
- [x] CFG-03: ANTHROPIC_API_KEY optional (defaults to subscription)
- [x] AUTH-01: Auth middleware restricts to allowed user IDs
- [x] AUTH-02: Unauthorized users receive "not authorized" message
- [x] CMD-01: `/start` command shows help
- [x] NOTE-01: Telegram bot receives text messages
- [x] NOTE-02: Claude analyzes message content and generates title
- [x] NOTE-03: Claude generates 3-5 relevant tags based on subject matter
- [x] NOTE-04: Bot writes markdown file with frontmatter to vault
- [x] NOTE-05: Bot confirms note was saved with title
- [x] NOTE-06: Note content preserves original message exactly

### Active

- [ ] CMD-02: `/recent` command lists last few notes
- [ ] ADMIN-01: `/health`, `/status`, `/logs`, `/restart` admin commands (implemented, needs testing)

### Future (from research)

- [ ] Note type classification (fleeting, task, reference, journal, quote)
- [ ] Link suggestions to existing vault notes
- [ ] Daily note append mode
- [ ] Voice note support
- [ ] Emoji reaction acknowledgment for faster perceived latency
- [ ] PARA-aware routing via message prefixes
- [ ] Review/processing commands (`/inbox`, `/review`)

### Out of Scope (v1)

- Voice/image handling -- text only for v1
- Note search -- use Obsidian
- Note editing/deletion -- use Obsidian
- Tag hierarchy -- flat tags only
- Multi-user/multi-vault -- personal tool

## Research

Research conducted 2026-02-05 covering:
- Obsidian properties best practices and YAML formatting
- Second brain methodologies (BASB/PARA, Zettelkasten, GTD, Evergreen Notes, MOCs)
- AI-assisted note-taking trends 2025-2026
- Competitive landscape (Telegram Sync plugin, Mem.ai, tg2obsidian)

Key findings documented in:
- `.planning/research/IMPROVEMENT-OPTIONS-REPORT.md` -- Feature prioritization and recommendations
- `.planning/research/SECOND-BRAIN-METHODOLOGIES.md` -- Deep methodology research

---
*Last updated: 2026-02-06 after Phase 2 completion and research synthesis*
