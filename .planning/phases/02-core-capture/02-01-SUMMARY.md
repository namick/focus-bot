---
phase: 02-core-capture
plan: 01
subsystem: services
tags: [claude-agent-sdk, zod, structured-output, sanitize-filename, markdown, yaml-frontmatter]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: config.ts with Zod validation pattern, fail-fast behavior
provides:
  - captureNote() service for extracting metadata and writing notes
  - ANTHROPIC_API_KEY config validation
  - Note file generation with YAML frontmatter
affects: [02-core-capture/02-02, text-message-handler, bot-integration]

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/claude-agent-sdk@0.2.30", "sanitize-filename@1.6.3"]
  patterns: [two-phase-capture, disallowedTools-for-restriction, structured-output-with-zod]

key-files:
  created: [src/services/note-capture.ts]
  modified: [src/config.ts, package.json]

key-decisions:
  - "Two-phase capture pattern: extract metadata first, then write file"
  - "Use disallowedTools to restrict to Write-only (allowedTools is broken)"
  - "sanitize-filename with fallback to timestamp for edge cases"
  - "Model: sonnet with maxTurns: 1 for metadata extraction"

patterns-established:
  - "Structured output: z.toJSONSchema() with safeParse validation"
  - "File write: permissionMode 'acceptEdits', maxTurns: 3"
  - "Filename sanitization with timestamp fallback"

# Metrics
duration: 4min
completed: 2026-02-03
---

# Phase 02 Plan 01: Note Capture Service Summary

**Claude Agent SDK integration with structured output for metadata extraction and Write tool for note persistence**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-03T17:00:00Z
- **Completed:** 2026-02-03T17:04:00Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments

- Extended config.ts with ANTHROPIC_API_KEY validation (fail-fast pattern)
- Installed @anthropic-ai/claude-agent-sdk@0.2.30 and sanitize-filename@1.6.3
- Created note-capture.ts service implementing two-phase capture pattern
- Implemented extractMetadata() with Claude structured output (Zod schema)
- Implemented writeNoteFile() with disallowedTools to permit only Write

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and extend config** - `4b7784d` (feat)
2. **Task 2: Create note capture service** - `a88ba2b` (feat)

## Files Created/Modified

- `src/config.ts` - Added ANTHROPIC_API_KEY to envSchema
- `src/services/note-capture.ts` - New service with captureNote() export
- `package.json` - Added claude-agent-sdk and sanitize-filename dependencies

## Decisions Made

- **Two-phase capture pattern:** Structured output cannot combine with tool use, so extract metadata in first query (structured output), write file in second query (Write tool)
- **disallowedTools over allowedTools:** Per SDK issue #19 and research, allowedTools is broken for restriction; use disallowedTools to block unwanted tools
- **Model selection:** sonnet for cost-effective metadata extraction with maxTurns: 1
- **permissionMode 'acceptEdits':** For file writing, auto-accept since we control the prompt and output

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - dependencies installed cleanly, TypeScript compiled without errors.

## User Setup Required

**External services require manual configuration.**

To use the note capture service, ensure:
- `ANTHROPIC_API_KEY` is set in `.env` (get from https://console.anthropic.com/settings/keys)

## Next Phase Readiness

- Note capture service ready for integration
- Next: Message handler (02-02) will wire captureNote() to text message events
- No blockers or concerns

---
*Phase: 02-core-capture*
*Completed: 2026-02-03*
