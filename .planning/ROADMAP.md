# Roadmap: Focus Bot

## Overview

Focus Bot delivers a single-purpose Telegram-to-Obsidian capture workflow: send a message, get an AI-organized note. Organization follows Steph Ango's vault patterns with categories as wiki-links and inline `[[wiki-links]]` in note body.

## Milestone 1: MVP (Phases 1-3)

- [x] **Phase 1: Foundation** - Bot scaffolding, config validation, auth middleware, /start command
- [x] **Phase 2: Core Capture** - Message to note with AI-generated title, tags, and frontmatter
- [x] **Phase 3: Vault Integration** - Steph Ango-inspired format: categories, topics, inline wiki-links

## Milestone 2: Enrichment

- [ ] **Phase 4: URL/Bookmark Capture** - Auto-detect URLs, add to frontmatter, async fetch page metadata
- [ ] **Phase 5: TBD** - Future enrichment features based on usage

## Phase Details

### Phase 1: Foundation (Complete - 2026-02-03)
**Goal**: Running bot that validates configuration, enforces user authorization, and responds to /start

Plans:
- [x] 01-01-PLAN.md - Config validation, TypeScript setup, auth middleware
- [x] 01-02-PLAN.md - Start command, bot assembly, entry point with runner

### Phase 2: Core Capture (Complete - 2026-02-05)
**Goal**: User sends text message, Claude analyzes it, generates title and tags, writes markdown note to vault, bot confirms

Plans:
- [x] 02-01-PLAN.md - Config extension, dependencies, note capture service
- [x] 02-02-PLAN.md - Text message handler, bot wiring, end-to-end verification

Additional work beyond plans:
- Direct file writing (fs.writeFileSync)
- Admin commands (/health, /status, /logs, /restart)
- systemd service file, CLAUDE.md, README.md

### Phase 3: Vault Integration (Complete - 2026-02-06)
**Goal**: Restructure note format to align with Steph Ango's vault patterns
**Success Criteria**:
  1. Notes written to vault root (no Captures/ subdirectory)
  2. Categories as wiki-links constrained to Categories/ directory hub files
  3. Topics as wiki-links replacing flat tags
  4. Inline [[wiki-links]] in note body for key concepts
  5. `[[Captures]]` always included as a category
  6. /restart in Telegram menu, startup notification on boot

Work completed:
- Researched Steph Ango's vault system (article, repo, templates, property patterns)
- Researched Obsidian wiki-links in frontmatter (native support, Dataview, plugins)
- Restructured config (CAPTURES_DIR -> CATEGORIES_DIR + loadCategories())
- Restructured note capture service (new schema, prompt, frontmatter format)
- Notes go to NOTES_DIR root
- Removed build step (Bun runs TS directly)
- /restart in command menu, startup notification to allowed users
- Updated all documentation (CLAUDE.md, README.md)

### Phase 4: URL/Bookmark Capture (Not started)
**Goal**: Auto-detect URLs in messages, add to frontmatter, async fetch page metadata
**Depends on**: Phase 3
**Success Criteria**:
  1. Messages containing URLs get `url` field in frontmatter
  2. Claude generates URL-aware title/categories (likely "References" category)
  3. Async enrichment fetches page title, description, og metadata
  4. Link preview appended to note body after capture
  5. Non-URL messages unaffected
  6. Enrichment failures never crash bot or block user

## Progress

| Phase | Status | Completed |
|-------|--------|-----------|
| 1. Foundation | Complete | 2026-02-03 |
| 2. Core Capture | Complete | 2026-02-05 |
| 3. Vault Integration | Complete | 2026-02-06 |
| 4. URL/Bookmark Capture | Not started | - |
