# Feature Landscape: Telegram Note Capture Bot

**Domain:** Telegram-to-Obsidian quick capture bot
**Researched:** 2026-02-02
**Confidence:** MEDIUM (based on ecosystem research, multiple sources)

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Text message capture | Core functionality - any message becomes a note | Low | The fundamental value proposition |
| Timestamps on notes | Users need temporal context for captured thoughts | Low | Include capture time in note metadata or body |
| /start command with help | Telegram bot standard - users expect onboarding | Low | Required by Telegram best practices |
| Confirmation of save | Users need feedback that capture succeeded | Low | tg2obsidian uses OK emoji; others send "Saved." |
| Markdown formatting preserved | Obsidian is markdown-native; users expect formatting | Low | Bold, italic, links should transfer |
| User allowlist/authentication | Security - only authorized users can write to vault | Low | Standard: check Telegram user ID against allowlist |
| Error handling with clear messages | Users need to know if something fails | Low | Rate limits, file issues, API errors |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-generated titles** | Eliminates "untitled-note-47" problem; notes become findable | Medium | Core differentiator for Focus Bot. Mem, Notion do this. |
| **AI-generated tags** | Automatic categorization without manual effort | Medium | Core differentiator. "Let the app handle organization" is 2026 trend. |
| **Intelligent content analysis** | Understanding what the note is about, not just storing text | Medium | Foundation for titles/tags. Differentiates from dumb pipes. |
| Voice message transcription | Capture thoughts while walking, driving | High | tg2obsidian supports this; Telegram Premium has native transcription |
| Image OCR | Extract text from screenshots, photos | High | tg2obsidian has this; requires Tesseract or API |
| /recent command | Quick access to verify notes landed correctly | Low | Great for trust-building; not offered by competitors |
| Forwarded message handling | Capture content from other chats/channels | Medium | tg2obsidian preserves source attribution |
| Multi-format support (photos, files) | Not just text capture | Medium | telegram-sync supports images, files, documents |
| Custom templates | Control how notes appear in vault | Medium | telegram-sync offers customizable templates |
| Daily note append mode | Fit into existing Obsidian workflows | Low | telegram-inbox appends to daily note |
| Delete after processing | Keep Telegram chat clean | Low | telegram-sync offers this |

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Complex folder hierarchies for v1 | Adds decision paralysis; users want quick capture, not filing | Flat directory. Let AI tags handle organization. Add folders later if needed. |
| Inline keyboards for every message | Interrupts flow; quick capture should be frictionless | Process silently, confirm with minimal response |
| Settings via bot commands | Bot conversations become cluttered with config | Use config file or environment variables |
| Real-time sync requirements | Over-engineering for quick capture; Obsidian syncs separately | Write to local vault; let Obsidian Sync handle distribution |
| Multi-vault support in v1 | Scope creep; complicates architecture | Single vault. Add vault selection later if needed. |
| Rich notification/reminder systems | Scope creep; that's a different product | Focus on capture, not task management |
| Bidirectional sync | Massive complexity; different product category | One-way: Telegram -> Obsidian only |
| Group chat support in v1 | Privacy/spam concerns; complicates auth model | Personal bot only. Groups add complexity. |
| Image/voice in v1 | Complexity explosion for MVP; nail text first | Explicitly defer to v2. Text-only MVP. |
| Web dashboard | Scope creep; Obsidian IS the interface | Notes live in Obsidian. No separate UI needed. |
| Note editing via bot | Against "quick capture" philosophy; edit in Obsidian | Capture is one-way. Edit in Obsidian. |
| Conversation threading | Adds state management complexity | Each message is independent capture |

## Feature Dependencies

```
Core (must have for MVP):
  Text capture → Timestamp → Markdown file creation
  /start command (standalone)

AI Layer (Focus Bot differentiator):
  Text capture → Content analysis → Title generation
  Text capture → Content analysis → Tag generation

Enhancement Layer (post-MVP):
  Voice messages → Transcription → Text capture → AI layer
  Images → OCR → Text capture → AI layer
  /recent → Read vault → Format response
```

**Dependency insights:**
- AI title/tag generation depends on content analysis. This is a single operation, not separate features.
- Voice/image features are ADDITIVE - they funnel into the existing text pipeline
- /recent is independent - can be added anytime

## MVP Recommendation

Based on research, the v1 scope (already decided) is well-aligned:

**v1 - Ship these:**
1. Text message -> note with AI title and tags (DIFFERENTIATOR)
2. /start with help text (TABLE STAKES)
3. /recent to list last few notes (DIFFERENTIATOR - trust building)
4. Flat directory, flat tags (ANTI-BLOAT)
5. Confirmation response (TABLE STAKES)

**v1 - Explicitly exclude:**
- Voice messages, images (HIGH complexity, defer to v2)
- Folder selection (ANTI-PATTERN - adds friction)
- Templates (nice-to-have, not MVP)
- Group chat support (complexity explosion)

**Rationale:**
- The AI title/tag generation is the key differentiator. Most Telegram->Obsidian tools are "dumb pipes" that just dump text.
- /recent builds trust and solves the "did it work?" anxiety
- Text-only keeps scope tight while proving the AI value

## Post-MVP Roadmap (informed by research)

**v2 candidates (ordered by value/complexity):**
1. Voice message transcription - HIGH value, MEDIUM complexity (leverage Telegram Premium or Whisper API)
2. Forwarded message handling with attribution - MEDIUM value, LOW complexity
3. Image support (no OCR, just save) - MEDIUM value, LOW complexity
4. Custom templates - MEDIUM value, LOW complexity

**v3 candidates:**
1. Image OCR - MEDIUM value, HIGH complexity (external dependency)
2. Daily note append mode - MEDIUM value, MEDIUM complexity (config option)
3. Multi-user support - LOW value for personal use, HIGH complexity

## Competitive Landscape Summary

| Tool | Approach | AI Features | Differentiator |
|------|----------|-------------|----------------|
| telegram-sync (Obsidian plugin) | Plugin runs in Obsidian, polls bot | None | Templates, voice transcription (Premium) |
| telegram-inbox (Obsidian plugin) | Appends to daily note | None | Simplicity, daily note integration |
| tg2obsidian (Python bot) | External bot writes to vault | OCR, speech recognition | Full-featured, but complex setup |
| **Focus Bot** | External bot writes to vault | **Title + tag generation** | Zero-friction intelligent capture |

**Gap identified:** None of the existing tools use AI for intelligent note organization. They're all "dumb pipes" that move content. Focus Bot's AI-generated titles and tags fill a clear market gap.

## Sources

**HIGH confidence (official docs, GitHub repos):**
- [obsidian-telegram-sync GitHub](https://github.com/soberhacker/obsidian-telegram-sync) - Feature list, capabilities
- [tg2obsidian GitHub](https://github.com/dimonier/tg2obsidian) - Feature list, limitations
- [Telegram Bot Features](https://core.telegram.org/bots/features) - Best practices for commands

**MEDIUM confidence (multiple sources agree):**
- [Zapier: Best Note Taking Apps 2026](https://zapier.com/blog/best-note-taking-apps/) - Table stakes features
- [AFFiNE: AI Note Taking Apps](https://affine.pro/blog/ai-note-taking-app) - AI tagging trends
- [Obsidian Forum: Quick Capture Workflow](https://forum.obsidian.md/t/quick-capture-mac-ios-and-inbox-processing/21808) - Inbox workflow patterns

**LOW confidence (single source, needs validation):**
- Specific user frustration patterns (limited data found)
