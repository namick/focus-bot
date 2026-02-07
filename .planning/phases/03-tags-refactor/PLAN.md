# Plan: Replace Categories + Topics with Tags

## Context

The bot currently uses three organizational mechanisms in note frontmatter:
- `categories:` — wiki-links to hub notes, bounded by files in Categories/ directory
- `topics:` — wiki-links for subject matter, freeform AI-generated
- Body `[[wiki-links]]` — inline links to key concepts

This is over-engineered. The user wants to simplify to two mechanisms:
- `tags:` — plain Obsidian tags for **what type of thing** this is (top-down). Always plural.
- Body `[[wiki-links]]` — unchanged. Bottom-up emergent connections for **what it's about**.

Tags are NOT topical. "philosophy" or "machine-learning" are wiki-link territory.
Tags describe the *type*: `captures`, `books`, `movies`, `quotes`, `ideas`, `articles`.

The `captures` tag is always code-enforced. Tags are freeform but type-oriented.
The AI should also detect implicit tags from content patterns (e.g., `— Mark Twain` → `quotes`)
and honor explicit user-provided tags (e.g., user writes `tags: quotes` in their message).

## Output Format (After)

```yaml
---
captured: 2026-02-07T14:34
source: telegram
status: inbox
tags:
  - captures
  - quotes
---
"The secret of getting ahead is getting started." — [[Mark Twain]]
```

## Changes

### 1. `src/config.ts` — Remove categories infrastructure
- Delete `CATEGORIES_DIR` constant (line 66)
- Delete `loadCategories()` function (lines 77-87)
- Keep `BOOKMARKS_DIR` (still needed for URL routing)

### 2. `src/index.ts` — Remove categories startup logic
- Remove `loadCategories` import
- Remove lines 8-10 (category loading + log)
- Keep BOOKMARKS_DIR import and directory creation

### 3. `src/services/note-capture.ts` — Core changes (most work here)

**Zod schema** (lines 16-21): Replace `categories` + `topics` with `tags`
```typescript
const NoteMetadataSchema = z.object({
  title: z.string().min(1).max(100),
  tags: z.array(z.string()).min(1).max(8),
  body: z.string().min(1),
});
```

**Imports** (line 6): Remove `loadCategories` import

**Claude prompt** (lines 48-61): Rewrite with new tag philosophy. Key prompt instructions:
- Tags describe the **type** of capture, not the topic. Always plural.
- Examples: `captures`, `books`, `movies`, `quotes`, `ideas`, `articles`, `links`, `recipes`
- Detect implicit type signals (attribution line → `quotes`, URL → `links` or `bookmarks`)
- Honor any explicit tags the user includes in their message (e.g., `tags: quotes`)
- Do NOT use tags for subject matter — wiki-links in the body handle that
- JSON format: `{"title": "...", "tags": ["quotes"], "body": "..."}`
- Note: `captures` is NOT in the AI response — it's code-enforced after

**generateNoteContent()** (lines 101-128):
- Remove categories/topics YAML generation
- Ensure `captures` tag is always present (code-enforced, prepended)
- Generate `tags:` YAML with plain strings (no wiki-link wrapping)
```yaml
tags:
  - captures
  - quotes
```

### 4. Test files — Update fixtures and assertions

**`tests/services/note-capture.test.ts`**:
- Update `defaultMetadata` to use `tags` instead of `categories` + `topics`
- Update assertions: check for plain tag strings, not wiki-link format
- Update `[[Captures]]` always-included test → `captures` always-included test

**`tests/bot/message.test.ts`**:
- Update metadata fixture

**`tests/services/note-enrichment.test.ts`**:
- Update sample note frontmatter

**`tests/utils/note-parser.test.ts`**:
- Update sample note frontmatter and assertions

### 5. Documentation — Update CLAUDE.md and README.md
- Replace all references to categories/topics with tags
- Update example note formats
- Remove mentions of Categories/ directory requirement
- Update architecture description
- Document the tag philosophy: type-based, always plural, not topical

### 6. Planning docs — Update .planning/ files
- Update PROJECT.md, STATE.md, ROADMAP.md with new format
- Update MEMORY.md

## File Change Summary

| File | Action |
|------|--------|
| `src/config.ts` | Remove CATEGORIES_DIR + loadCategories() |
| `src/index.ts` | Remove category loading at startup |
| `src/services/note-capture.ts` | Replace schema, prompt, and frontmatter generation |
| `tests/services/note-capture.test.ts` | Update fixtures + assertions |
| `tests/bot/message.test.ts` | Update fixture |
| `tests/services/note-enrichment.test.ts` | Update sample note |
| `tests/utils/note-parser.test.ts` | Update sample note + assertions |
| `CLAUDE.md` | Update docs |
| `README.md` | Update docs |
| `.planning/PROJECT.md` | Update format + decisions |
| `.planning/STATE.md` | Update status |

## Verification

1. `npx tsc --noEmit` — type check passes
2. `bun test` — all tests pass
3. Manual: send a test message to the bot, verify the output note has `tags:` with `captures` included and no `categories:` or `topics:` fields
