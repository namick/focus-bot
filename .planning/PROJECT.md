# Focus Bot

## What This Is

A focused Telegram bot that captures quick thoughts and saves them as markdown notes to an Obsidian vault. Messages are analyzed by Claude to generate a title, categories, topics, and inline `[[wiki-links]]`, then written as markdown files with YAML frontmatter to the vault root. Organization inspired by Steph Ango's vault patterns.

## Core Value

**One thing done well:** Message -> Note. No friction, no decisions. Just send a thought and it's captured with intelligent metadata.

**Architectural principle:** Capture and organization are separate activities. Focus Bot optimizes ruthlessly for capture speed and reliability. Organization, linking, and enrichment happen asynchronously.

## How It Works

1. User sends a text message to the Telegram bot
2. Grammy receives the update, auth middleware checks user whitelist
3. Claude (haiku) analyzes content, returns JSON with title, categories, topics, and wiki-linked body
4. Bot writes markdown file directly to NOTES_DIR via `fs.writeFileSync`
5. Bot confirms: "Saved: [Note Title]"
6. Async enrichment fires (currently a stub for future URL metadata fetching)

## Technical Approach

**Stack:**
- Grammy + @grammyjs/runner -- Telegram bot framework with concurrent long polling
- @anthropic-ai/claude-agent-sdk -- Claude haiku for metadata extraction (JSON response)
- Zod -- Config and metadata validation
- TypeScript + Bun runtime (no build step, runs TS directly)
- sanitize-filename -- Safe filename generation

**Architecture:**
- Single Claude call extracts title, categories, topics, and rewrites body with `[[wiki-links]]`
- Categories constrained to hub notes in `NOTES_DIR/Categories/` (loaded at startup)
- Notes written to vault root (NOTES_DIR)
- Fire-and-forget enrichment path after user gets confirmation
- systemd service for production deployment with auto-restart
- Bot sends startup notification to all allowed users on boot

**Note Format:**
```markdown
---
captured: 2026-02-06T14:34
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
- The filename IS the title (Obsidian convention) -- no `title` in frontmatter
- **captured**: Local datetime `YYYY-MM-DDTHH:mm` (Obsidian-compatible)
- **categories**: Wiki-links to hub notes in Categories/ directory. `[[Captures]]` always included.
- **topics**: Wiki-links for subject matter (freeform, AI-generated, 2-5 per note)
- **source**: Always `telegram` (enables Dataview filtering)
- **status**: Always `inbox` (for processing workflow)
- **Body**: Original message with inline `[[wiki-links]]` for key concepts

## Commands

- `/start` -- Help message explaining how to use the bot (also sent on startup)
- `/health` -- Check bot health and uptime
- `/status` -- Show systemd service status
- `/logs` -- Show recent log entries
- `/restart` -- Restart the bot service

## Constraints

- Single user or small whitelist (personal tool)
- Notes directory must exist and be writable
- Categories/ subdirectory must exist with .md hub files
- Notes go to vault root (NOTES_DIR)
- 2-5 topics per note (as wiki-links)
- 1-5 categories per note (must match files in Categories/)

## What This Is NOT

- Not a general-purpose Claude Code bot (that's Claudegram)
- Not a note search/retrieval system (that's Obsidian's job)
- Not a multi-vault manager
- Not handling images, voice, or attachments (text only for now)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Claude Agent SDK for metadata only | Reliable JSON extraction; file writing done directly via fs | Validated |
| Direct fs.writeFileSync over Claude Write tool | More reliable, faster, no tool permission issues | Validated |
| Steph Ango vault patterns | Categories as wiki-links, topics for subjects, minimal folders | Validated |
| Categories from filesystem | Bot reads Categories/ at startup, injects into prompt -- no round trip | Validated |
| Topics replace tags | Wiki-links for subject matter instead of flat tags -- richer connections | Validated |
| Notes in vault root | No Captures/ subdirectory -- categories and topics handle organization | Validated |
| Inline wiki-links in body | Claude rewrites body with [[links]] in same call -- zero extra latency | Validated |
| `[[Captures]]` always included | Every telegram capture gets this category for easy filtering | Validated |
| Spaces in filenames | Obsidian convention -- filename IS the title | Validated |
| No title in frontmatter | Obsidian uses filename as title; avoids duplication | Validated |
| Local datetime format | `YYYY-MM-DDTHH:mm` matches Obsidian DateTime property type | Validated |
| source/status fields | Enables Dataview queries and inbox processing workflow | Validated |
| Fire-and-forget enrichment | Never blocks the user; enrichment failures are logged only | Validated |
| Zod for config + metadata | Consistent validation pattern throughout the app | Validated |
| Bun runtime, no build step | Fast startup, runs TypeScript directly, no dist/ needed | Validated |
| systemd for production | Auto-restart on failure, starts on boot, journal logging | Validated |
| Startup notification | Bot sends /start message to all allowed users on boot | Validated |

## Requirements

### Validated

- [x] CFG-01: Config validated via Zod (TELEGRAM_BOT_TOKEN, NOTES_DIR, ALLOWED_USER_IDS)
- [x] CFG-02: Bot fails fast with clear error on invalid config
- [x] CFG-03: ANTHROPIC_API_KEY optional (defaults to subscription)
- [x] CFG-04: Categories/ directory loaded at startup, fail-fast if missing
- [x] AUTH-01: Auth middleware restricts to allowed user IDs
- [x] AUTH-02: Unauthorized users receive "not authorized" message
- [x] CMD-01: `/start` command shows help
- [x] CMD-03: `/restart` in Telegram menu, startup notification on boot
- [x] NOTE-01: Telegram bot receives text messages
- [x] NOTE-02: Claude analyzes message content and generates title
- [x] NOTE-03: Claude assigns categories from Categories/ directory
- [x] NOTE-04: Claude generates 2-5 topics as wiki-links
- [x] NOTE-05: Claude adds inline [[wiki-links]] to note body
- [x] NOTE-06: Bot writes markdown file with frontmatter to vault root
- [x] NOTE-07: Bot confirms note was saved with title
- [x] ADMIN-01: `/health`, `/status`, `/logs`, `/restart` admin commands

### Dropped

- ~~CMD-02: `/recent` command~~ -- Telegram history serves this function

### Future

- [ ] URL/bookmark capture with metadata fetching (auto-detect URLs, add to frontmatter, async fetch page metadata)
- [ ] Voice note support
- [ ] Emoji reaction acknowledgment for faster perceived latency
- [ ] Review/processing commands (`/inbox`, `/review`)

### Out of Scope

- Voice/image handling -- text only for now
- Note search -- use Obsidian
- Note editing/deletion -- use Obsidian
- Multi-user/multi-vault -- personal tool

## Research

Research conducted 2026-02-05 covering:
- Obsidian properties best practices and YAML formatting
- Second brain methodologies (BASB/PARA, Zettelkasten, GTD, Evergreen Notes, MOCs)
- AI-assisted note-taking trends 2025-2026
- Competitive landscape (Telegram Sync plugin, Mem.ai, tg2obsidian)

Research conducted 2026-02-06 covering:
- Steph Ango's vault system (stephango.com/vault, kepano/kepano-obsidian repo)
- Categories as wiki-links to hub notes (Obsidian Bases feature)
- Tags vs categories vs topics distinction
- Wiki-links in YAML frontmatter (quoted syntax, Dataview compatibility)
- Obsidian property types and frontmatter link behavior

Key findings documented in:
- `.planning/research/IMPROVEMENT-OPTIONS-REPORT.md` -- Feature prioritization and recommendations
- `.planning/research/SECOND-BRAIN-METHODOLOGIES.md` -- Deep methodology research

---
*Last updated: 2026-02-06 after Steph Ango vault restructure*
