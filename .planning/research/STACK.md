# Technology Stack

**Project:** Focus Bot - Telegram Note Capture to Obsidian
**Researched:** 2026-02-02
**Overall Confidence:** HIGH

## Executive Summary

The stack is well-defined by project requirements: Grammy for Telegram, Claude Agent SDK for AI processing, Zod for validation. This research verifies current versions, identifies supporting libraries, and documents what NOT to use.

Key finding: The Claude Agent SDK requires Zod ^4.0.0 as a peer dependency, which aligns with modern best practices (Zod 4 is 14x faster than Zod 3). Grammy 1.39.x with @grammyjs/runner 2.x provides production-ready Telegram bot infrastructure.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| Grammy | ^1.39.3 | Telegram Bot Framework | HIGH | De facto standard for TypeScript Telegram bots. Excellent docs, active maintenance, plugin ecosystem. Verified via npm. |
| @grammyjs/runner | ^2.0.3 | Concurrent long polling | HIGH | Required for production: handles updates concurrently, graceful shutdown. v2.x is stable. |
| @anthropic-ai/claude-agent-sdk | ^0.2.29 | Claude Code API access | HIGH | Official Anthropic SDK for agentic Claude. Provides Write tool for file operations. |

### Validation & Config

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| Zod | ^4.3.6 | Schema validation | HIGH | **Required** - Claude Agent SDK peer dependency is `^4.0.0`. Zod 4 is 14x faster than v3, 2x smaller bundle. |
| znv | ^0.5.0 | Environment variable parsing | MEDIUM | Wraps Zod for env vars with better boolean coercion ("false" -> false). Alternative: use Zod directly. |

### Grammy Plugins (Recommended)

| Plugin | Version | Purpose | Confidence | When to Use |
|--------|---------|---------|------------|-------------|
| @grammyjs/auto-retry | ^2.0.2 | Handle Telegram 429s | HIGH | Always. Automatically retries rate-limited requests. |
| @grammyjs/parse-mode | ^2.2.0 | Simplified formatting | HIGH | When sending formatted messages (markdown, HTML). |
| @grammyjs/ratelimiter | ^1.2.1 | Limit user spam | MEDIUM | If you expect spam. Ignores excess messages per user. |
| @grammyjs/transformer-throttler | ^1.2.1 | Slow outbound API calls | LOW | Only if hitting 429s despite auto-retry. Usually unnecessary. |

### Development Tools

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| TypeScript | ^5.9.3 | Type safety | HIGH | Current stable. Excellent Zod 4 and Grammy support. |
| tsx | ^4.21.0 | Dev runtime | HIGH | Fast TypeScript execution without compilation step. |
| @types/node | ^25.2.0 | Node.js types | HIGH | Match your Node.js version family. |
| Biome | ^2.3.13 | Lint + format | MEDIUM | Fast, modern alternative to ESLint+Prettier. Single tool. |
| Vitest | ^4.0.18 | Testing | MEDIUM | If you need tests. Fast, Vite-based, good TS support. |

### Logging (Optional)

| Technology | Version | Purpose | Confidence | Why |
|------------|---------|---------|------------|-----|
| Pino | ^10.3.0 | Structured logging | MEDIUM | Fast, JSON logging. Grammy bot template uses it. Optional for simple bots. |

---

## Runtime Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | >=22.x LTS | Claude Agent SDK requires Node 18+. Use 22.x or 24.x LTS for production. |

---

## Alternatives Considered

### Telegram Bot Frameworks

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Bot Framework | Grammy | node-telegram-bot-api | Grammy has better TypeScript support, middleware system, plugin ecosystem, and active maintenance. |
| Bot Framework | Grammy | Telegraf | Telegraf is older, Grammy is its spiritual successor with better DX and modern TS. |
| Bot Framework | Grammy | GramIO | GramIO is newer but less mature ecosystem. Grammy has proven stability. |

### Validation

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Schema Validation | Zod 4 | Zod 3 | Claude Agent SDK requires ^4.0.0. Zod 4 is faster and smaller anyway. |
| Schema Validation | Zod 4 | Yup, Joi | Zod has better TypeScript inference. Required by Claude Agent SDK. |

### Env Parsing

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Env Variables | znv | dotenv | dotenv only loads vars, no validation. znv validates with Zod schemas. |
| Env Variables | znv | Raw Zod | znv handles edge cases (boolean coercion) better. Minor preference. |

### Dev Tooling

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Linting | Biome | ESLint | Biome is faster, single config. ESLint is fine but heavier setup. |
| Running TS | tsx | ts-node | tsx is faster, no config needed. ts-node requires more setup. |

---

## What NOT to Use

### Deprecated/Outdated

| Technology | Why Avoid |
|------------|-----------|
| Zod 3.x | Claude Agent SDK requires Zod ^4.0.0. Zod 3 is slower and larger. |
| node-telegram-bot-api | Callback-based API, poor TypeScript support compared to Grammy. |
| Telegraf | Older generation. Grammy is the modern successor. |
| ts-node | Slower than tsx, requires configuration. |

### Unnecessary for This Project

| Technology | Why Skip |
|------------|----------|
| Database (SQLite, PostgreSQL) | Not needed - writing directly to filesystem (Obsidian vault). |
| Redis | Not needed - single user bot, no session persistence required. |
| @grammyjs/conversations | Overkill - simple capture flow doesn't need multi-turn conversations. |
| @grammyjs/i18n | Single language bot, no internationalization needed. |
| Express/Fastify | Long polling via runner, not webhooks. No web server needed. |

### Potentially Problematic

| Technology | Why Caution |
|------------|-------------|
| @grammyjs/transformer-throttler | Usually unnecessary with auto-retry. Can degrade performance. |
| Electron packaging with Claude Agent SDK | Known issues with path resolution. Not relevant for this CLI bot. |

---

## Installation Commands

```bash
# Core dependencies
npm install grammy @grammyjs/runner @anthropic-ai/claude-agent-sdk zod znv

# Recommended Grammy plugins
npm install @grammyjs/auto-retry @grammyjs/parse-mode

# Dev dependencies
npm install -D typescript tsx @types/node @biomejs/biome

# Optional (if you want testing)
npm install -D vitest
```

---

## Configuration Files

### package.json (type: module)

```json
{
  "type": "module",
  "engines": {
    "node": ">=22.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

---

## Claude Agent SDK Specific Notes

### Authentication

The SDK uses Claude Code's authentication automatically if you've run `claude` in terminal. For programmatic use:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const result = await query({
  prompt: "...",
  options: {
    apiKey: process.env.ANTHROPIC_API_KEY, // Or use Claude Code auth
  }
});
```

### Important Pitfalls (Verified)

1. **API Key Precedence**: If `~/.claude/settings.json` has an API key, it overrides environment variables. Solution: Exclude `user` from `settingSources` if using custom API key.

2. **Node.js Required**: SDK spawns Node process internally. Ensure Node.js is available in PATH.

3. **Tool Permissions**: The `tools`, `allowedTools`, `disallowedTools` parameters have confusing precedence. Test your exact configuration.

---

## Confidence Assessment

| Component | Confidence | Verification Source |
|-----------|------------|---------------------|
| Grammy 1.39.3 | HIGH | npm registry, official docs |
| @grammyjs/runner 2.0.3 | HIGH | npm registry, official docs |
| Claude Agent SDK 0.2.29 | HIGH | npm registry, GitHub |
| Zod 4.3.6 | HIGH | npm registry, required peer dep |
| znv 0.5.0 | MEDIUM | npm registry, community recommendation |
| TypeScript 5.9.3 | HIGH | npm registry |
| tsx 4.21.0 | HIGH | npm registry |
| Biome 2.3.13 | MEDIUM | npm registry, growing adoption |
| Node.js 22+ LTS | HIGH | nodejs.org release schedule |

---

## Sources

### Authoritative (HIGH confidence)
- npm registry: Direct version queries via `npm view`
- [Grammy Official Docs](https://grammy.dev/) - Framework documentation
- [Grammy GitHub](https://github.com/grammyjs/grammY) - 1.39.x current
- [Claude Agent SDK GitHub](https://github.com/anthropics/claude-agent-sdk-typescript) - v0.2.29 current
- [Zod Release Notes](https://zod.dev/v4) - Zod 4 stable

### Verified (MEDIUM confidence)
- [Grammy Plugins](https://grammy.dev/plugins/) - Official plugin list
- [Grammy Flood Limits](https://grammy.dev/advanced/flood) - Rate limiting best practices
- [znv GitHub](https://github.com/lostfictions/znv) - Env parsing with Zod
- [Claude Agent SDK Pitfalls](https://liruifengv.com/posts/claude-agent-sdk-pitfalls-en/) - Known issues

### Node.js
- [Node.js Releases](https://nodejs.org/en/about/previous-releases) - LTS schedule
