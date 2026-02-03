# Domain Pitfalls

**Domain:** Telegram Note Capture Bot with Claude Agent SDK
**Researched:** 2026-02-02
**Confidence:** HIGH (verified with official documentation and multiple sources)

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

---

### Pitfall 1: Telegram Webhook Timeout Causing Duplicate Processing

**What goes wrong:** Webhook requests that take too long to complete cause Telegram to re-send the same update, resulting in duplicate note creation. Claude Agent SDK operations (especially file writes) can easily exceed Telegram's timeout threshold.

**Why it happens:** Telegram expects webhook responses within ~30 seconds. The Claude Agent SDK spawns a CLI process, makes API calls to Claude, and then performs file operations. This chain can exceed the timeout, especially during API latency spikes or when Claude needs multiple tool-use rounds.

**Consequences:**
- Same note created multiple times
- User confusion from duplicate responses
- Potential for conflicting writes if processing overlaps

**Prevention:**
1. Use grammY runner with long polling instead of webhooks for MVP
2. If using webhooks: immediately acknowledge the update, then process asynchronously via a queue
3. Set conservative timeouts and implement idempotency checks (store processed update IDs)

**Detection:**
- Users report seeing duplicate notes
- Logs show same `update_id` processed multiple times
- Monitoring shows webhook response times > 20 seconds

**Phase relevance:** Address in Phase 1 (Foundation) - architecture decision before any code is written.

**Sources:**
- [grammY Deployment Types](https://grammy.dev/guide/deployment-types) - HIGH confidence
- [grammY Deployment Checklist](https://grammy.dev/advanced/deployment) - HIGH confidence

---

### Pitfall 2: Claude Agent SDK Permission System Complexity

**What goes wrong:** File writes fail silently or require unexpected user interaction because the SDK's multi-layered permission system has conflicting configurations.

**Why it happens:** The Claude Agent SDK has overlapping permission controls:
- `permissionMode` parameter
- `allowedTools` / `disallowedTools` arrays
- `~/.claude/settings.json` configuration
- Per-project settings
- `canUseTool` callback hooks

When these conflict, the SDK may block file writes even when you've configured `allowedTools: ["write"]`. The `allowedTools` whitelist can be ignored in `--continue` mode.

**Consequences:**
- Bot appears to work in development but fails in production
- File writes silently fail
- Unexpected permission prompts in automated contexts
- Security holes if tools aren't properly restricted

**Prevention:**
1. Use explicit `permissionMode: "acceptEdits"` or `permissionMode: "full"` for automated operation
2. Always specify `allowedTools` explicitly with only the tools needed (Write, Read)
3. Test permission behavior in both initial and continuation contexts
4. Use `canUseTool` callback as a failsafe validation layer
5. Do NOT rely on `~/.claude/settings.json` for SDK permission - exclude `user` from `settingSources`

**Detection:**
- Agent logs show tool use attempts without corresponding file changes
- Testing with `disallowedTools` shows blocked tools still executing
- Continuation sessions behave differently than initial sessions

**Phase relevance:** Address in Phase 1 (Foundation) - configure correctly from the start.

**Sources:**
- [Common Pitfalls with Claude Agent SDK](https://liruifengv.com/posts/claude-agent-sdk-pitfalls-en/) - HIGH confidence
- [Claude Agent SDK GitHub Issues](https://github.com/anthropics/claude-agent-sdk-typescript/issues/29) - MEDIUM confidence

---

### Pitfall 3: Relative vs Absolute File Paths in Agent Tool Use

**What goes wrong:** Claude writes notes to wrong locations, creates files outside the vault, or corrupts files when using relative paths that resolve differently than expected.

**Why it happens:** Anthropic's own research found that "models would make mistakes with tools using relative filepaths after the agent had moved out of the root directory." The Claude Agent SDK spawns processes that may have different working directories than expected.

**Consequences:**
- Notes saved outside Obsidian vault
- Notes saved in wrong subdirectory
- Path confusion leading to overwrites
- Cascading file corruption when agent tries to "fix" its mistakes

**Prevention:**
1. **Always require absolute paths** in your tool definitions and system prompts
2. Pass the vault path as an explicit parameter, not a relative reference
3. Validate paths in tool implementations before writing
4. Implement path whitelisting - reject any path not within the vault directory
5. Use `path.resolve()` and `path.normalize()` to canonicalize paths before operations

**Detection:**
- Notes appear in unexpected locations
- `find` command shows markdown files outside vault
- File write errors referencing non-existent directories

**Phase relevance:** Address in Phase 2 (Core Integration) - implement strict path handling in the Write tool wrapper.

**Sources:**
- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents) - HIGH confidence
- [Problems in Agentic Coding](https://medium.com/@TimSylvester/problems-in-agentic-coding-2866ca449ff0) - MEDIUM confidence

---

### Pitfall 4: YAML Frontmatter Parsing Edge Cases

**What goes wrong:** Notes with certain content patterns cause YAML parsing failures in Obsidian, rendering notes unusable or losing metadata.

**Why it happens:** YAML has many gotchas:
- Colons in values break parsing (e.g., `title: Code: something`)
- Unquoted strings starting with `@`, `#`, `*`, or `!` are special YAML tokens
- Multi-line values require proper formatting
- Reserved words (`yes`, `no`, `true`, `false`, `null`) need quoting
- Dates without quotes may be auto-converted

**Consequences:**
- Notes render with raw YAML visible instead of hidden metadata
- Dataview queries fail on malformed frontmatter
- Obsidian sync may conflict on metadata changes
- Loss of tags, timestamps, and other metadata

**Prevention:**
1. Always quote string values in frontmatter: `title: "My Note Title"`
2. Escape or quote values containing colons, special characters
3. Use ISO 8601 format for dates: `created: "2026-02-02T14:30:00Z"`
4. Validate YAML output before writing (use `js-yaml` library to parse/validate)
5. Test frontmatter generation with edge cases: colons, quotes, unicode, long text

**Detection:**
- Notes display `---` markers and frontmatter as content
- Obsidian shows "Invalid YAML" warnings
- Dataview or search queries return incomplete results

**Phase relevance:** Address in Phase 2 (Core Integration) - implement robust frontmatter generator with validation.

**Sources:**
- [Obsidian Forum: YAML Frontmatter Issues](https://forum.obsidian.md/t/current-status-for-parsing-working-with-yaml-frontmatter/70290) - HIGH confidence
- [Obsidian Help: YAML Front Matter](https://help.obsidian.md/Advanced+topics/YAML+front+matter) - HIGH confidence

---

### Pitfall 5: Cost Explosion from Unscoped Agent Context

**What goes wrong:** Claude Agent SDK costs spiral out of control because the agent processes unnecessary files or generates excessive tool-use rounds.

**Why it happens:** Without proper scoping:
- Agent may try to read/index the entire vault to "understand context"
- Conversation history accumulates, increasing token costs per turn
- Failed operations trigger retry loops
- Agent may "explore" the filesystem looking for relevant files

One documented case: "$5 spent trying to push a simple change because they hadn't properly configured .gitignore, and the agent was trying to index and process 5,000 irrelevant XML and image files."

**Consequences:**
- Unexpectedly high API bills
- Slow response times
- Rate limiting from Anthropic
- Token limits exceeded mid-conversation

**Prevention:**
1. Scope the agent narrowly - only provide the Write tool, not Read or Bash
2. Design for single-shot operation: one message in, one note out
3. Implement `max_tokens` limits on responses
4. Track and log token usage per request
5. Set up cost alerts on your Anthropic account
6. Use `stopSequences` to prevent runaway generation
7. Clear conversation history between unrelated requests (don't accumulate context)

**Detection:**
- API costs significantly exceed projections
- Requests consistently hit token limits
- Agent logs show multiple tool-use rounds for simple operations
- Monitoring shows increasing latency over time (context growth)

**Phase relevance:** Address in Phase 1 (Foundation) - design minimal-context architecture from start.

**Sources:**
- [Claude Code Subagent Mistakes](https://dev.to/alireza_rezvani/4-claude-code-subagent-mistakes-that-kill-your-workflow-and-the-fixes-3n72) - MEDIUM confidence
- [Common Pitfalls with Claude Agent SDK](https://liruifengv.com/posts/claude-agent-sdk-pitfalls-en/) - HIGH confidence

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

---

### Pitfall 6: grammY Runner vs bot.start() Confusion

**What goes wrong:** Bot becomes unresponsive under load or fails to process messages concurrently, limiting scalability.

**Why it happens:** `bot.start()` provides simple long polling that cannot handle:
- More than ~5K messages/hour
- Long-running operations (like Claude API calls)
- Concurrent message processing

Developers start with `bot.start()` for simplicity, then face a rewrite when scaling.

**Prevention:**
1. Use `@grammyjs/runner` from the start for long-polling bots
2. Configure runner with appropriate concurrency limits
3. Implement `sequentialize` middleware with session key resolver
4. Set up graceful shutdown handling with `handle.stop()`

**Detection:**
- Bot becomes slow during active usage periods
- Messages process serially instead of concurrently
- Deployment updates leave orphaned connections

**Phase relevance:** Address in Phase 1 (Foundation) - start with runner architecture.

**Sources:**
- [grammY Runner Plugin](https://grammy.dev/plugins/runner) - HIGH confidence
- [grammY Deployment Checklist](https://grammy.dev/advanced/deployment) - HIGH confidence

---

### Pitfall 7: Missing Error Boundaries in Telegram Message Handling

**What goes wrong:** Unhandled errors crash the bot or leave messages unprocessed without user feedback.

**Why it happens:** Multiple error sources exist:
- Telegram API errors (rate limits, invalid chat IDs)
- Claude API errors (overloaded, rate limited, timeout)
- File system errors (permissions, disk space)
- Malformed user input

Without proper error handling at each layer, errors propagate and cause silent failures or crashes.

**Prevention:**
1. Use `bot.catch()` for grammY-level error handling
2. Wrap Claude SDK calls in try-catch with specific error handling
3. Implement retry logic with exponential backoff for transient errors
4. Always send user feedback on failure: "Sorry, I couldn't save that note. Please try again."
5. Log all errors with context (update_id, user_id, error type)

**Detection:**
- Users report messages being "ignored"
- Error logs show unhandled promise rejections
- Bot process crashes in production

**Phase relevance:** Address in Phase 2 (Core Integration) - implement comprehensive error handling.

**Sources:**
- [Claude API Errors](https://platform.claude.com/docs/en/api/errors) - HIGH confidence
- [Telegram Bot FAQ](https://core.telegram.org/bots/faq) - HIGH confidence

---

### Pitfall 8: Telegram Rate Limits and Flood Control

**What goes wrong:** Bot gets temporarily banned or messages fail silently due to Telegram rate limits.

**Why it happens:** Telegram enforces strict rate limits:
- Max 30 messages/second globally
- Max 1 message/second per chat
- Max 20 messages/minute per group

Bots that send confirmation messages, error messages, and follow-up prompts can easily exceed these limits during active use.

**Prevention:**
1. Use `auto-retry` plugin for grammY to handle flood wait automatically
2. Implement message queuing with rate limiting
3. Batch status updates where possible
4. Avoid sending unnecessary confirmation messages
5. Use exponential backoff on 429 errors

**Detection:**
- 429 errors in logs
- Users report delayed or missing bot responses
- Telegram temporarily blocks bot API calls

**Phase relevance:** Address in Phase 3 (Polish) - implement rate limit handling.

**Sources:**
- [Telegram Bot FAQ: Broadcasting](https://core.telegram.org/bots/faq#how-can-i-message-all-of-my-bot-39s-subscribers-at-once) - HIGH confidence
- [grammY Auto-Retry Plugin](https://grammy.dev/plugins/auto-retry) - HIGH confidence

---

### Pitfall 9: Session State Management Across Bot Restarts

**What goes wrong:** User context or multi-step interactions are lost when bot restarts, causing broken conversation flows.

**Why it happens:** Default grammY session storage is in-memory and lost on restart. For a note capture bot, this might not be critical if each message is independent, but becomes important if implementing:
- Multi-step note creation
- Settings/preferences
- Context from previous notes

**Prevention:**
1. Design for stateless operation where possible - each message is independent
2. If state is needed, use persistent session storage (Redis, filesystem)
3. Use `lazySessions` for better performance
4. Store minimal state - avoid storing entire conversation history

**Detection:**
- Users report settings not persisting
- Multi-step flows break after bot restart
- Logs show session initialization on every message

**Phase relevance:** Evaluate in Phase 1 (Foundation) - decide if stateless design is sufficient.

**Sources:**
- [grammY Session Plugin](https://grammy.dev/plugins/session) - HIGH confidence

---

### Pitfall 10: API Key Exposure in Logs or Error Messages

**What goes wrong:** API keys (Telegram bot token, Anthropic API key) leak through logs, error messages, or agent output.

**Why it happens:**
- Agent may attempt to write API keys to config files or documentation
- Error stack traces may include environment variables
- Verbose logging may capture request headers

Claude Agent SDK specifically has this issue: "Agents attempted to add an API_KEY in plain text to a generated README or config file."

**Prevention:**
1. Never pass API keys in prompts or context to Claude
2. Use environment variables, not config files, for secrets
3. Implement log sanitization to redact sensitive patterns
4. Review all agent output before persisting
5. Use `.gitignore` to prevent credential file commits

**Detection:**
- Security scanning tools flag exposed secrets
- API key appears in logs or generated files
- Unusual API activity on your accounts

**Phase relevance:** Address in Phase 1 (Foundation) - establish security practices early.

**Sources:**
- [Claude Code Subagent Mistakes](https://dev.to/alireza_rezvani/4-claude-code-subagent-mistakes-that-kill-your-workflow-and-the-fixes-3n72) - MEDIUM confidence

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

---

### Pitfall 11: Claude API Response Latency Variability

**What goes wrong:** User experience is inconsistent due to variable Claude API response times (sometimes 2s, sometimes 30s).

**Why it happens:** Claude API latency varies based on:
- Model load and queue depth
- Input/output token counts
- Tool use complexity
- Time of day (higher load during business hours)

**Prevention:**
1. Send immediate "thinking..." indicator to user
2. Use streaming responses if UI supports it
3. Implement timeout with fallback message
4. Consider caching common processing patterns
5. Set realistic user expectations in bot description

**Detection:**
- User complaints about slow responses
- Monitoring shows high variance in response times
- Some requests timing out while others complete quickly

**Phase relevance:** Address in Phase 3 (Polish) - improve user experience.

---

### Pitfall 12: Unicode and Emoji Handling in Notes

**What goes wrong:** Notes contain garbled text, broken emoji, or incorrect character encoding.

**Why it happens:** Multiple encoding contexts:
- Telegram sends UTF-8 but may include special Unicode
- YAML has specific rules for non-ASCII characters
- File system may have encoding expectations
- Claude may transform or mishandle special characters

**Prevention:**
1. Explicitly handle UTF-8 encoding in all file operations
2. Test with emoji, CJK characters, RTL text, and special symbols
3. Sanitize or escape special characters in filenames
4. Use quotes for string values in YAML frontmatter

**Detection:**
- Notes display with replacement characters or garbled text
- Emoji appear as question marks or boxes
- Search fails to find notes with non-ASCII content

**Phase relevance:** Address in Phase 2 (Core Integration) - test encoding edge cases.

---

### Pitfall 13: File Naming Collision and Sanitization

**What goes wrong:** Notes overwrite each other or fail to save due to invalid filenames.

**Why it happens:**
- Users send similar thoughts that generate the same filename
- Filenames with special characters (/, \, :, *, ?) are invalid on some systems
- Very long filenames exceed filesystem limits
- Timestamps may collide if messages arrive in same second

**Prevention:**
1. Include timestamp with millisecond precision or UUID in filename
2. Sanitize filenames: remove/replace invalid characters
3. Truncate filenames to safe length (200 chars max for cross-platform)
4. Use flat directory structure as planned to simplify path handling
5. Implement collision detection: append suffix if file exists

**Detection:**
- Users report notes being overwritten
- File write errors in logs
- Notes missing from vault

**Phase relevance:** Address in Phase 2 (Core Integration) - implement safe filename generation.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Foundation | Bot architecture choice (polling vs webhook) | Use grammY runner with long polling for simplicity |
| Foundation | Claude SDK permission configuration | Use `permissionMode: "acceptEdits"`, explicit `allowedTools` |
| Foundation | Cost scoping | Design for single-shot, minimal-context operations |
| Core Integration | Path handling | Always use absolute paths, validate within vault |
| Core Integration | YAML frontmatter | Quote all values, validate before writing |
| Core Integration | Error handling | Implement comprehensive try-catch with user feedback |
| Polish | Rate limiting | Use auto-retry plugin, implement backoff |
| Polish | Latency UX | Send "thinking" indicator, set user expectations |

---

## Sources

### HIGH Confidence (Official Documentation)
- [grammY Deployment Checklist](https://grammy.dev/advanced/deployment)
- [grammY Runner Plugin](https://grammy.dev/plugins/runner)
- [grammY Deployment Types](https://grammy.dev/guide/deployment-types)
- [Claude API Errors](https://platform.claude.com/docs/en/api/errors)
- [Telegram Bot FAQ](https://core.telegram.org/bots/faq)
- [Obsidian YAML Front Matter](https://help.obsidian.md/Advanced+topics/YAML+front+matter)

### MEDIUM Confidence (Verified with Multiple Sources)
- [Common Pitfalls with Claude Agent SDK](https://liruifengv.com/posts/claude-agent-sdk-pitfalls-en/)
- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Claude Code Subagent Mistakes](https://dev.to/alireza_rezvani/4-claude-code-subagent-mistakes-that-kill-your-workflow-and-the-fixes-3n72)

### LOW Confidence (Single Source, Needs Validation)
- [Problems in Agentic Coding](https://medium.com/@TimSylvester/problems-in-agentic-coding-2866ca449ff0)
- [Obsidian Forum Discussions](https://forum.obsidian.md/) - various threads on YAML and sync issues
