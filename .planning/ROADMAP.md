# Roadmap: Focus Bot

## Overview

Focus Bot delivers a single-purpose Telegram-to-Obsidian capture workflow: send a message, get an AI-organized note. The roadmap progresses from bot foundation through core note capture to enrichment features informed by second brain methodology research.

## Milestone 1: MVP (Phases 1-3)

- [x] **Phase 1: Foundation** - Bot scaffolding, config validation, auth middleware, /start command
- [x] **Phase 2: Core Capture** - Message to note with AI-generated title, tags, and frontmatter
- [ ] **Phase 3: Polish** - /recent command for trust building

## Future Milestone: Enrichment (from research)

Prioritized features from `.planning/research/IMPROVEMENT-OPTIONS-REPORT.md`:

**P0 -- High Value, Low Effort:**
- Emoji reaction acknowledgment (reduce perceived latency)

**P1 -- High Value, Medium Effort:**
- Note type classification (fleeting, task, reference, journal, quote)
- Daily note append mode (interstitial journaling pattern)
- Voice note support (transcribe + capture pipeline)

**P2 -- Medium Value, Medium-High Effort:**
- Review/processing commands (`/inbox`, `/review`, `/recent`)
- PARA-aware routing via message prefixes
- URL/bookmark capture with metadata fetching

**P3 -- High Value, High Effort (Future Vision):**
- Link suggestion (scan vault for related notes)
- Progressive summarization layers
- Multi-message threading

## Phase Details

### Phase 1: Foundation
**Goal**: Running bot that validates configuration, enforces user authorization, and responds to /start
**Depends on**: Nothing (first phase)
**Requirements**: CFG-01, CFG-02, CFG-03, AUTH-01, AUTH-02, CMD-01
**Success Criteria** (what must be TRUE):
  1. Bot starts successfully with valid TELEGRAM_BOT_TOKEN, ALLOWED_USER_IDS, and NOTES_DIR
  2. Bot fails fast with clear error message if any config is invalid or missing
  3. Unauthorized user receives "not authorized" message and cannot use the bot
  4. Authorized user can send /start and receives help message explaining how to use the bot
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md - Config validation, TypeScript setup, auth middleware
- [x] 01-02-PLAN.md - Start command, bot assembly, entry point with runner

### Phase 2: Core Capture
**Goal**: User sends text message, Claude analyzes it, generates title and tags, writes markdown note to vault, bot confirms
**Depends on**: Phase 1
**Requirements**: NOTE-01, NOTE-02, NOTE-03, NOTE-04, NOTE-05, NOTE-06
**Success Criteria** (what must be TRUE):
  1. User can send any text message and it becomes a markdown note in the vault
  2. Note has YAML frontmatter with created timestamp, 3-5 relevant tags, source, and status
  3. Filename is the generated title with reserved characters sanitized plus .md extension
  4. Bot confirms note was saved by displaying the generated title
  5. Note content preserves original message exactly
**Plans**: 2 plans

Plans:
- [x] 02-01-PLAN.md - Config extension, dependencies, note capture service
- [x] 02-02-PLAN.md - Text message handler, bot wiring, end-to-end verification

**Additional work completed beyond original plans:**
- Direct file writing (replaced Claude Write tool with fs.writeFileSync)
- Enriched frontmatter (source, status, Obsidian-compatible datetime)
- Captures/ subdirectory with auto-creation at startup
- Admin commands (/health, /status, /logs, /restart)
- Fire-and-forget enrichment stub
- systemd service file for production deployment
- CLAUDE.md and README.md

### Phase 3: Polish
**Goal**: User can verify notes are being saved correctly via /recent command
**Depends on**: Phase 2
**Requirements**: CMD-02
**Success Criteria** (what must be TRUE):
  1. User can send /recent and see list of last few notes saved
  2. List shows note titles so user can verify captures are working
**Plans**: TBD

Plans:
- [ ] 03-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-02-03 |
| 2. Core Capture | 2/2 | Complete | 2026-02-05 |
| 3. Polish | 0/TBD | Not started | - |
