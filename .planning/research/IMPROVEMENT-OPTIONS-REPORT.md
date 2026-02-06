# Focus Bot Improvement Report: Obsidian Properties, Second Brain Methods, and Feature Options

*Research conducted: 2026-02-05*
*Application context: Focus Bot -- a Telegram-to-Obsidian quick capture bot*

---

## Where We Are Today

Focus Bot currently captures text messages via Telegram, uses Claude (haiku) to generate a title and 3-5 tags, then writes a markdown file with this frontmatter:

```yaml
---
title: Generated Title
created: 2026-02-04T12:34:56.789Z
tags:
  - tag-one
  - tag-two
---
```

The roadmap has 3 phases: Foundation (done), Core Capture (in progress), and Polish (/recent command).

---

## Part 1: Obsidian Properties Improvements

### Current Gaps vs. Best Practices

Our frontmatter is functional but minimal. Obsidian 1.4+ introduced a Properties system with typed fields, and 1.9 enforced stricter formatting.

**Additional Property Fields**

- **`aliases`** (list) -- Alternative names for the note. Claude could generate 1-2 aliases from the message
- **`type`** (text) -- Note classification: `fleeting`, `task`, `reference`, `journal`, `quote`
- **`status`** (text) -- Processing status: `inbox`, `processing`, `evergreen`
- **`source`** (text) -- Always `telegram` for our bot. Enables Dataview filtering
- **`cssclasses`** (list) -- Could assign `focus-capture` class for custom styling

**Obsidian-Native Date Handling**

Our `created` field uses full ISO 8601 with milliseconds. Obsidian's date picker expects `YYYY-MM-DD` for Date type or `YYYY-MM-DDTHH:mm` for DateTime type. Options:
- Split into `date: 2026-02-04` and `time: "14:34"`
- Or keep `created` as DateTime but trim to `YYYY-MM-DDTHH:mm` format

**Wikilinks in Properties**

Obsidian supports `"[[Note Name]]"` syntax in properties (must be quoted). We could add a `related` list property with AI-suggested links.

**Enhanced Frontmatter Example**

```yaml
---
date: 2026-02-04
type: fleeting
status: inbox
source: telegram
tags:
  - algorithms
  - coffee
  - quantum-computing
aliases:
  - quantum coffee algorithm
---
```

---

## Part 2: Second Brain Methodology Insights

### Key Methodologies Researched

**BASB/PARA (Tiago Forte)** -- CODE method (Capture, Organize, Distill, Express). Key insight: capture and organization are separate activities. PARA framework (Projects, Areas, Resources, Archives) suggests routing notes via message prefixes.

**Zettelkasten** -- Notes classified as fleeting (quick captures), literature (source-based), or permanent (refined knowledge). Everything Focus Bot creates is a fleeting note. Emphasizes atomic notes and dense linking.

**GTD (Getting Things Done)** -- Inbox concept: all captures land in an inbox, get processed during review, then filed or discarded.

**Evergreen Notes (Andy Matuschak)** -- Concept-oriented, densely linked, developed over time. Implies our bot could help develop fleeting captures into permanent notes.

**Maps of Content (MOCs)** -- Index notes linking to related notes by topic. Bot could auto-generate or update MOCs.

Full methodology research: `.planning/research/SECOND-BRAIN-METHODOLOGIES.md`

---

## Part 3: Feature Options (Prioritized)

### P0 -- High Value, Low Effort

**1. Inbox/Captures Folder Default**
- Write captured notes to `Captures/` subfolder instead of vault root
- Aligns with GTD, BASB, and Zettelkasten inbox concepts

**2. Richer Frontmatter Properties**
- Add `type`, `status: inbox`, `source: telegram` fields
- Fix date format for Obsidian compatibility
- Enables Dataview queries like `TABLE FROM "Captures" WHERE status = "inbox"`

**3. Emoji Reaction Acknowledgment**
- React with checkmark emoji immediately upon receipt, before processing
- Reply with title only after note is saved
- Reduces perceived latency

### P1 -- High Value, Medium Effort

**4. Note Type Classification**
- Claude classifies each message as `fleeting`, `task`, `reference`, `journal`, or `quote`
- Task-type notes could extract the actionable item

**5. Daily Note Append Mode**
- Option to append captures to today's daily note
- Format: `- 14:32 | captured thought here` under `## Captures`
- Config: `CAPTURE_MODE=individual|daily-note`

**6. Voice Note Support**
- Accept voice messages, transcribe, then run through capture pipeline
- Store `voice_transcript: true` in frontmatter

### P2 -- Medium Value, Medium-High Effort

**7. PARA-Aware Routing** -- Message prefixes to route notes to Projects/Areas/Resources

**8. Review/Processing Commands** -- `/inbox`, `/review`, `/recent`

**9. Photo/Image Capture** -- Save photos, create notes referencing images

**10. URL/Bookmark Capture** -- Detect URLs, fetch metadata, create reference notes

### P3 -- High Value, High Effort (Future Vision)

**11. Link Suggestion** -- Scan vault for related notes, suggest wikilinks

**12. Progressive Summarization** -- Layer-based note development

**13. Smart Connections Integration** -- Embeddings-based related note surfacing

**14. Multi-Message Threading** -- Combine rapid-fire messages into single notes

---

## Part 4: Competitive Landscape

**Obsidian Telegram Sync** (~600 stars) -- Desktop-only plugin, template-based, no AI. Our advantage: AI metadata, server-side.

**Mem.ai** -- Self-organizing AI workspace. Inspiration for query commands.

**tg2obsidian** -- Standalone bot, no AI. Our advantage: AI enrichment at capture time.

---

## Part 5: Architectural Principle

> Capture and organization are separate activities that happen at different times. Focus Bot should optimize ruthlessly for capture speed and reliability. Organization, linking, and enrichment can happen asynchronously.

---

## Sources

### Obsidian Properties & YAML
- [Properties - Obsidian Help](https://help.obsidian.md/properties)
- [Obsidian Properties: Best Practices - Forum](https://forum.obsidian.md/t/obsidian-properties-best-practices-and-why/63891)
- [Front matter format changes in Obsidian 1.9](https://forum.actions.work/t/front-matter-format-changes-in-obsidian-1-9-and-how-to-deal-with-them/671)
- [Adding Metadata - Dataview](https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/)
- [YAML Frontmatter - Fork My Brain](https://notes.nicolevanderhoeven.com/obsidian-playbook/Using+Obsidian/03+Linking+and+organizing/YAML+Frontmatter)

### Second Brain Methodologies
- [Building a Second Brain - Tiago Forte](https://www.buildingasecondbrain.com/)
- [Zettelkasten Method - zettelkasten.de](https://zettelkasten.de/introduction/)
- [Evergreen Notes - Andy Matuschak](https://notes.andymatuschak.org/Evergreen_notes)
- [GTD in 15 Minutes](https://hamberg.no/gtd)
- [Maps of Content - Obsidian Rocks](https://obsidian.rocks/maps-of-content-effortless-organization-for-notes/)

### Telegram Bot Patterns
- [Reactions - grammY](https://grammy.dev/guide/reactions)
- [Obsidian Telegram Sync - GitHub](https://github.com/soberhacker/obsidian-telegram-sync)
- [Interstitial Journaling with Telegram](https://www.jskherman.com/blog/logs-in-telegram-obsidian/)

### AI Note-Taking Trends
- [Smart Connections for Obsidian](https://smartconnections.app/smart-connections/)
- [Copilot for Obsidian](https://www.obsidiancopilot.com/en)
- [Mem 2.0 - Self-Organizing Workspace](https://get.mem.ai/blog/introducing-mem-2-0)
