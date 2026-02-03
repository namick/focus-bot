# Building a Claude Code Telegram Bot: Comprehensive Technical Guide

This document provides everything needed to build a Telegram bot that interfaces with Claude's Agent SDK to run Claude Code remotely. It is based on extensive analysis of the Claudegram project.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Grammy Bot Framework](#grammy-bot-framework)
5. [Claude Agent SDK Integration](#claude-agent-sdk-integration)
6. [Session Management](#session-management)
7. [Request Queue System](#request-queue-system)
8. [Message Handling Flow](#message-handling-flow)
9. [Streaming Responses](#streaming-responses)
10. [Telegraph Integration](#telegraph-integration)
11. [Voice & TTS Features](#voice--tts-features)
12. [Security Patterns](#security-patterns)
13. [Configuration System](#configuration-system)
14. [Error Handling](#error-handling)
15. [Complete Code Examples](#complete-code-examples)

---

## Architecture Overview

The bot acts as a bridge between Telegram and Claude Code's agent runtime. The high-level flow is:

```
User (Telegram) → Grammy Bot → Request Queue → Claude Agent SDK → Claude Code → Response
                                    ↓
                              Session Manager (tracks working directory, conversation)
```

**Key Design Decisions:**

- **Per-chat sequentialization**: Messages from the same chat are processed in order, but different chats can run concurrently
- **Streaming responses**: Real-time updates as Claude generates text
- **Session persistence**: Working directories and Claude session IDs are stored for conversation continuity
- **Telegraph for long responses**: Responses >2500 chars are published to Telegraph (Instant View)
- **Queue with cancellation**: Running queries can be cancelled via `/cancel` command

---

## Technology Stack

### Core Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.2.19",
    "grammy": "^1.31.3",
    "@grammyjs/runner": "^2.0.3",
    "@grammyjs/auto-retry": "^2.0.2",
    "zod": "^4.3.6",
    "dotenv": "^16.4.7",
    "telegra.ph": "^1.0.1",
    "telegram-markdown-v2": "^0.0.4",
    "openai": "^6.16.0",
    "cheerio": "^1.2.0",
    "turndown": "^7.2.2"
  }
}
```

### Purpose of Each:

- **grammy**: Telegram bot framework (modern, TypeScript-first)
- **@grammyjs/runner**: Concurrent update processing with per-chat ordering
- **@grammyjs/auto-retry**: Automatic retry on transient errors (429, 5xx)
- **@anthropic-ai/claude-agent-sdk**: Official SDK to run Claude Code as an agent
- **zod**: Runtime schema validation for configuration
- **telegra.ph**: Create Telegraph pages for long responses
- **telegram-markdown-v2**: Convert standard markdown to Telegram's MarkdownV2
- **openai**: TTS (text-to-speech) integration

---

## Project Structure

```
src/
├── index.ts                    # Entry point
├── config.ts                   # Zod-validated environment config
├── bot/
│   ├── bot.ts                  # Bot initialization & middleware
│   ├── handlers/
│   │   ├── command.handler.ts  # All slash commands
│   │   ├── message.handler.ts  # Text message routing
│   │   ├── voice.handler.ts    # Voice transcription
│   │   └── photo.handler.ts    # Image uploads
│   └── middleware/
│       ├── auth.middleware.ts  # User whitelist
│       └── stale-filter.ts     # Ignore old messages
├── claude/
│   ├── agent.ts                # Core agent query logic
│   ├── session-manager.ts      # Per-chat session state
│   ├── request-queue.ts        # Sequential request queue
│   └── session-history.ts      # Persistent session storage
├── telegram/
│   ├── message-sender.ts       # Streaming & message delivery
│   ├── markdown.ts             # MarkdownV2 conversion
│   ├── telegraph.ts            # Telegraph page creation
│   └── terminal-renderer.ts    # Terminal UI emojis
├── tts/
│   ├── tts.ts                  # OpenAI/Groq TTS providers
│   └── voice-reply.ts          # Auto-send voice responses
├── audio/
│   └── transcribe.ts           # Groq Whisper transcription
└── utils/
    ├── download.ts             # Secure file downloads
    ├── sanitize.ts             # Path/error sanitization
    └── url-guard.ts            # SSRF protection
```

---

## Grammy Bot Framework

### Bot Initialization

```typescript
import { Bot, type Context } from 'grammy';
import { autoRetry } from '@grammyjs/auto-retry';
import { sequentialize } from '@grammyjs/runner';
import { run } from '@grammyjs/runner';

export async function createBot(): Promise<Bot> {
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  // Auto-retry on transient errors (ECONNRESET, 429, 5xx)
  bot.api.config.use(autoRetry({
    maxRetryAttempts: 5,
    maxDelaySeconds: 60,
    rethrowInternalServerErrors: false,
  }));

  // Auth middleware - first in chain
  bot.use(authMiddleware);

  // CRITICAL: /cancel fires BEFORE sequentialize to bypass the queue
  bot.command('cancel', handleCancel);

  // Sequentialize: same-chat updates processed in order
  bot.use(sequentialize((ctx) => ctx.chat?.id.toString()));

  // Register commands (sequentialized)
  bot.command('start', handleStart);
  bot.command('project', handleProject);
  bot.command('clear', handleClear);
  // ... more commands

  // Callback queries for inline keyboards
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data.startsWith('model:')) {
      await handleModelCallback(ctx);
    }
    // ... more callbacks
  });

  // Message handlers
  bot.on('message:voice', handleVoice);
  bot.on('message:photo', handlePhoto);
  bot.on('message:text', handleMessage);

  // Error handler
  bot.catch((err) => console.error('Bot error:', err));

  return bot;
}
```

### Running the Bot

```typescript
async function main() {
  const bot = await createBot();
  await bot.init();

  // Use runner for concurrent processing
  const runner = run(bot);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await runner.stop();
    process.exit(0);
  });

  await runner.task();
}
```

### Middleware Pattern

The middleware stack runs in order. Early middleware can block processing:

```typescript
// Auth middleware - blocks unauthorized users
export async function authMiddleware(
  ctx: Context,
  next: NextFunction
): Promise<void> {
  const userId = ctx.from?.id;

  if (!userId || !config.ALLOWED_USER_IDS.includes(userId)) {
    await ctx.reply('⛔ You are not authorized.');
    return; // Don't call next() - stops processing
  }

  await next();
}
```

### Command Registration

```typescript
// Register command menu for Telegram autocomplete
const commandList = [
  { command: 'start', description: '🚀 Show help' },
  { command: 'project', description: '📁 Set working directory' },
  { command: 'cancel', description: '⏹️ Cancel current request' },
  // ... more commands
];

bot.api.setMyCommands(commandList);
```

---

## Claude Agent SDK Integration

### Core Query Function

```typescript
import {
  query,
  type SDKMessage,
  type SDKResultMessage,
  type PermissionMode,
} from '@anthropic-ai/claude-agent-sdk';

interface AgentOptions {
  onProgress?: (text: string) => void;
  onToolStart?: (toolName: string, input?: Record<string, unknown>) => void;
  onToolEnd?: () => void;
  abortController?: AbortController;
  command?: string;  // 'plan', 'explore', etc.
  model?: string;    // 'opus', 'sonnet', 'haiku'
}

export async function sendToAgent(
  chatId: number,
  message: string,
  options: AgentOptions = {}
): Promise<AgentResponse> {
  const { onProgress, onToolStart, onToolEnd, abortController, command, model } = options;

  const session = sessionManager.getSession(chatId);
  if (!session) {
    throw new Error('No active session. Use /project to set working directory.');
  }

  const controller = abortController || new AbortController();
  const existingSessionId = chatSessionIds.get(chatId) || session.claudeSessionId;

  // Define available tools
  const tools = ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Task'];

  // Start the query
  const response = query({
    prompt: message,
    options: {
      cwd: session.workingDirectory,
      tools,
      allowedTools: tools,
      permissionMode: command === 'plan' ? 'plan' : 'acceptEdits',
      abortController: controller,
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: CUSTOM_SYSTEM_PROMPT,
      },
      model: model || 'opus',
      resume: existingSessionId,  // Resume previous conversation
    },
  });

  // Store query for /cancel to interrupt
  setActiveQuery(chatId, response);

  let fullText = '';
  const toolsUsed: string[] = [];

  // Process streaming response
  for await (const msg of response) {
    if (controller.signal.aborted) break;

    if (msg.type === 'assistant') {
      for (const block of msg.message.content) {
        if (block.type === 'text') {
          fullText += block.text;
          onProgress?.(fullText);
        } else if (block.type === 'tool_use') {
          toolsUsed.push(block.name);
          onToolStart?.(block.name, block.input);
        }
      }
    } else if (msg.type === 'tool_use_summary') {
      onToolEnd?.();
    } else if (msg.type === 'result') {
      // Store session ID for future conversations
      if (msg.session_id) {
        chatSessionIds.set(chatId, msg.session_id);
        sessionManager.setClaudeSessionId(chatId, msg.session_id);
      }
    }
  }

  return { text: fullText, toolsUsed };
}
```

### Permission Modes

The SDK supports different permission modes:

- **`plan`**: Read-only mode for exploration and planning
- **`acceptEdits`**: Auto-accept file edits (default)
- **`bypassPermissions`**: Skip all permission prompts (dangerous)

```typescript
function getPermissionMode(command?: string): PermissionMode {
  if (config.DANGEROUS_MODE) return 'bypassPermissions';
  if (command === 'plan') return 'plan';
  return 'acceptEdits';
}
```

### System Prompt Customization

```typescript
const queryOptions = {
  systemPrompt: {
    type: 'preset',
    preset: 'claude_code',  // Use Claude Code's built-in prompt
    append: `You are ${config.BOT_NAME}, an AI assistant helping via Telegram.

Guidelines:
- Show relevant code snippets when helpful, but keep them short
- If a task requires multiple steps, execute them and summarize what you did

Response Formatting:
Your responses are displayed via Telegram. Longer responses (2500+ chars)
are published as Telegraph Instant View pages.`,
  },
};
```

### Loop Mode (Iterative Tasks)

```typescript
export async function sendLoopToAgent(
  chatId: number,
  message: string,
  options: LoopOptions = {}
): Promise<AgentResponse> {
  const { maxIterations = 5, onIterationComplete } = options;

  // Wrap prompt with loop instructions
  const loopPrompt = `${message}

IMPORTANT: When you have fully completed this task, respond with "DONE" on its own line.
If you need to continue working, do not say "DONE".`;

  let iteration = 0;
  let combinedText = '';
  let isComplete = false;

  while (iteration < maxIterations && !isComplete) {
    iteration++;

    const currentPrompt = iteration === 1
      ? loopPrompt
      : 'Continue the task. Say "DONE" when complete.';

    const response = await sendToAgent(chatId, currentPrompt, options);
    combinedText += `\n\n--- Iteration ${iteration} ---\n\n${response.text}`;

    onIterationComplete?.(iteration, response.text);

    if (response.text.includes('DONE')) {
      isComplete = true;
    }
  }

  return { text: combinedText, toolsUsed: [] };
}
```

---

## Session Management

### Session Structure

```typescript
interface Session {
  conversationId: string;       // Unique ID for this conversation
  claudeSessionId?: string;     // Claude's session ID for resume
  workingDirectory: string;     // Project path
  createdAt: Date;
  lastActivity: Date;
}

class SessionManager {
  private sessions: Map<number, Session> = new Map();

  getSession(chatId: number): Session | undefined {
    return this.sessions.get(chatId);
  }

  createSession(chatId: number, workingDirectory: string): Session {
    const session: Session = {
      conversationId: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      workingDirectory,
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    this.sessions.set(chatId, session);

    // Persist to disk
    sessionHistory.saveSession(chatId, session.conversationId, workingDirectory);

    return session;
  }

  setClaudeSessionId(chatId: number, claudeSessionId: string): void {
    const session = this.sessions.get(chatId);
    if (session) {
      session.claudeSessionId = claudeSessionId;
      sessionHistory.updateClaudeSessionId(chatId, session.conversationId, claudeSessionId);
    }
  }

  resumeSession(chatId: number, conversationId: string): Session | undefined {
    const historyEntry = sessionHistory.getSessionByConversationId(chatId, conversationId);
    if (!historyEntry) return undefined;

    const session: Session = {
      conversationId: historyEntry.conversationId,
      claudeSessionId: historyEntry.claudeSessionId,
      workingDirectory: historyEntry.projectPath,
      createdAt: new Date(historyEntry.createdAt),
      lastActivity: new Date(),
    };
    this.sessions.set(chatId, session);
    return session;
  }
}

export const sessionManager = new SessionManager();
```

### Cross-OS Path Resolution

When sessions are persisted, paths may need remapping between macOS and Linux:

```typescript
function resolveWorkingDirectory(storedPath: string): string {
  if (fs.existsSync(storedPath)) return storedPath;

  // Remap: /Users/user/foo → /home/user/foo
  const home = os.homedir();
  const homePrefixes = ['/Users/', '/home/'];

  for (const prefix of homePrefixes) {
    if (storedPath.startsWith(prefix)) {
      const rest = storedPath.slice(prefix.length);
      const slashIdx = rest.indexOf('/');
      const remapped = slashIdx === -1 ? home : `${home}${rest.slice(slashIdx)}`;
      if (fs.existsSync(remapped)) return remapped;
    }
  }

  return home; // Fallback
}
```

---

## Request Queue System

The queue ensures per-chat ordering while allowing cancellation:

```typescript
import type { Query } from '@anthropic-ai/claude-agent-sdk';

const activeQueries: Map<number, Query> = new Map();
const activeAbortControllers: Map<number, AbortController> = new Map();
const pendingQueues: Map<number, Array<QueuedRequest<unknown>>> = new Map();
const processingFlags: Map<number, boolean> = new Map();
const cancelledChats: Set<number> = new Set();

export function setActiveQuery(chatId: number, q: Query): void {
  activeQueries.set(chatId, q);
}

export function isProcessing(chatId: number): boolean {
  return processingFlags.get(chatId) === true;
}

export async function queueRequest<T>(
  chatId: number,
  message: string,
  handler: () => Promise<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const request = { message, handler, resolve, reject };

    let queue = pendingQueues.get(chatId);
    if (!queue) {
      queue = [];
      pendingQueues.set(chatId, queue);
    }
    queue.push(request);

    processQueue(chatId);
  });
}

async function processQueue(chatId: number): Promise<void> {
  if (processingFlags.get(chatId)) return;

  const queue = pendingQueues.get(chatId);
  if (!queue || queue.length === 0) return;

  processingFlags.set(chatId, true);
  const request = queue.shift()!;

  try {
    const result = await request.handler();
    request.resolve(result);
  } catch (error) {
    request.reject(error);
  } finally {
    processingFlags.set(chatId, false);
    clearActiveQuery(chatId);
    clearCancelled(chatId);

    if (queue.length > 0) processQueue(chatId);
  }
}

// Cancel uses query.interrupt() - NOT controller.abort() (which crashes SDK)
export async function cancelRequest(chatId: number): Promise<boolean> {
  const q = activeQueries.get(chatId);

  if (q) {
    cancelledChats.add(chatId);
    await q.interrupt();  // Graceful interruption
    clearActiveQuery(chatId);
    return true;
  }

  return false;
}

export function isCancelled(chatId: number): boolean {
  return cancelledChats.has(chatId);
}
```

---

## Message Handling Flow

### Main Message Handler

```typescript
export async function handleMessage(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  const text = ctx.message?.text;
  const messageId = ctx.message?.message_id;
  const messageDate = ctx.message?.date;

  if (!chatId || !text || !messageId || !messageDate) return;

  // Filter stale messages (sent before bot started)
  if (isStaleMessage(messageDate)) return;

  // Check for duplicate messages (Telegram retries)
  if (isDuplicate(messageId)) return;
  markProcessed(messageId);

  // Check for ForceReply responses (e.g., project path input)
  const replyTo = ctx.message?.reply_to_message;
  if (replyTo && replyTo.from?.is_bot) {
    const replyText = replyTo.text || '';
    if (replyText.includes('Set Project Directory')) {
      await handleProjectReply(ctx, chatId, text);
      return;
    }
  }

  // Check for active session
  const session = sessionManager.getSession(chatId);
  if (!session) {
    await ctx.reply('⚠️ No project set. Use /project to open a project first.');
    return;
  }

  // Show queue position if already processing
  if (isProcessing(chatId)) {
    const position = getQueuePosition(chatId) + 1;
    await ctx.reply(`⏳ Queued (position ${position})`);
  }

  // Queue and process
  await queueRequest(chatId, text, async () => {
    if (config.STREAMING_MODE === 'streaming') {
      await handleStreamingResponse(ctx, chatId, text);
    } else {
      await handleWaitResponse(ctx, chatId, text);
    }
  });
}
```

### Streaming Response Handler

```typescript
async function handleStreamingResponse(
  ctx: Context,
  chatId: number,
  message: string
): Promise<void> {
  await messageSender.startStreaming(ctx);

  const abortController = new AbortController();
  setAbortController(chatId, abortController);

  try {
    const response = await sendToAgent(chatId, message, {
      onProgress: (progressText) => {
        messageSender.updateStream(ctx, progressText);
      },
      onToolStart: (toolName, input) => {
        messageSender.updateToolOperation(chatId, toolName, input);
      },
      onToolEnd: () => {
        messageSender.clearToolOperation(chatId);
      },
      abortController,
    });

    await messageSender.finishStreaming(ctx, response.text);
  } catch (error) {
    await messageSender.cancelStreaming(ctx);
    throw error;
  }
}
```

---

## Streaming Responses

### MessageSender Class

```typescript
interface StreamState {
  chatId: number;
  messageId: number | null;
  content: string;
  lastUpdate: number;
  updateScheduled: boolean;
  typingInterval: NodeJS.Timeout | null;
  // Terminal UI mode
  terminalMode: boolean;
  currentOperation: { name: string; detail?: string } | null;
}

export class MessageSender {
  private streamStates: Map<number, StreamState> = new Map();

  async startStreaming(ctx: Context): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const initialText = '▌';  // Cursor indicator
    const message = await ctx.reply(initialText);

    // Start typing indicator (expires every 5s)
    const typingInterval = setInterval(() => {
      ctx.api.sendChatAction(chatId, 'typing').catch(() => {});
    }, 4000);

    const state: StreamState = {
      chatId,
      messageId: message.message_id,
      content: '',
      lastUpdate: Date.now(),
      updateScheduled: false,
      typingInterval,
      terminalMode: isTerminalUIEnabled(chatId),
      currentOperation: null,
    };

    this.streamStates.set(chatId, state);
  }

  async updateStream(ctx: Context, content: string): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const state = this.streamStates.get(chatId);
    if (!state || !state.messageId) return;

    state.content = content;

    // Debounce updates to avoid rate limits
    const timeSinceLastUpdate = Date.now() - state.lastUpdate;

    if (timeSinceLastUpdate >= config.STREAMING_DEBOUNCE_MS) {
      await this.flushUpdate(ctx, state);
    } else if (!state.updateScheduled) {
      state.updateScheduled = true;
      setTimeout(async () => {
        state.updateScheduled = false;
        await this.flushUpdate(ctx, state);
      }, config.STREAMING_DEBOUNCE_MS - timeSinceLastUpdate);
    }
  }

  private async flushUpdate(ctx: Context, state: StreamState): Promise<void> {
    if (!state.messageId) return;

    const displayContent = state.content.substring(0, config.MAX_MESSAGE_LENGTH - 10) + ' ▌';

    try {
      await ctx.api.editMessageText(
        state.chatId,
        state.messageId,
        displayContent,
        { parse_mode: undefined }  // Plain text during streaming
      );
      state.lastUpdate = Date.now();
    } catch (error) {
      // Ignore "message not modified" errors
      if (!error.message.includes('message is not modified')) {
        console.error('Error updating stream:', error);
      }
    }
  }

  async finishStreaming(ctx: Context, finalContent: string): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const state = this.streamStates.get(chatId);
    if (!state) return;

    // Stop typing indicator
    if (state.typingInterval) {
      clearInterval(state.typingInterval);
    }

    // Check if should use Telegraph
    if (shouldUseTelegraph(finalContent)) {
      const pageUrl = await createTelegraphPage('Claude Response', finalContent);
      if (pageUrl) {
        await ctx.api.editMessageText(
          chatId,
          state.messageId!,
          `📄 [Open in Instant View](${pageUrl})`,
          { parse_mode: 'MarkdownV2' }
        );
        this.streamStates.delete(chatId);
        return;
      }
    }

    // Convert to MarkdownV2 and send
    const parts = processMessageForTelegram(finalContent);
    await ctx.api.editMessageText(chatId, state.messageId!, parts[0], { parse_mode: 'MarkdownV2' });

    for (let i = 1; i < parts.length; i++) {
      await ctx.reply(parts[i], { parse_mode: 'MarkdownV2' });
    }

    this.streamStates.delete(chatId);
  }
}

export const messageSender = new MessageSender();
```

---

## Telegraph Integration

### When to Use Telegraph

```typescript
const TELEGRAPH_THRESHOLD = 2500;
const TABLE_PATTERN = /\|.*\|.*\|/;

export function shouldUseTelegraph(content: string): boolean {
  // Long content
  if (content.length > TELEGRAPH_THRESHOLD) return true;
  // Contains tables (not supported in MarkdownV2)
  if (TABLE_PATTERN.test(content)) return true;
  return false;
}
```

### Creating Telegraph Pages

```typescript
import Telegraph from 'telegra.ph';

let telegraphClient: Telegraph | null = null;

export async function initTelegraph(): Promise<void> {
  const accountFile = '.telegraph-account.json';

  if (fs.existsSync(accountFile)) {
    const account = JSON.parse(fs.readFileSync(accountFile, 'utf-8'));
    telegraphClient = new Telegraph(account.access_token);
  } else {
    telegraphClient = new Telegraph('');
    const account = await telegraphClient.createAccount('BotName', 'Bot', 'https://example.com');
    telegraphClient.token = account.access_token!;
    fs.writeFileSync(accountFile, JSON.stringify(account), { mode: 0o600 });
  }
}

export async function createTelegraphPage(title: string, markdown: string): Promise<string | null> {
  if (!telegraphClient) await initTelegraph();

  const content = markdownToNodes(markdown);
  const page = await telegraphClient.createPage(title, content, 'Claude Agent');
  return page.url;
}
```

### Markdown to Telegraph Nodes

Telegraph supports limited HTML tags. Convert markdown to Telegraph's node format:

```typescript
type TelegraphNode = string | {
  tag: 'p' | 'h3' | 'h4' | 'b' | 'i' | 'code' | 'pre' | 'a' | 'ul' | 'ol' | 'li' | 'blockquote' | 'hr';
  attrs?: { href?: string };
  children?: TelegraphNode[];
};

function markdownToNodes(markdown: string): TelegraphNode[] {
  const nodes: TelegraphNode[] = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  let codeBlockContent = '';

  for (const line of lines) {
    // Code block handling
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        nodes.push({ tag: 'pre', children: [{ tag: 'code', children: [codeBlockContent] }] });
        inCodeBlock = false;
        codeBlockContent = '';
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }

    // Headers
    if (line.startsWith('## ')) {
      nodes.push({ tag: 'h3', children: parseInline(line.slice(3)) });
    } else if (line.startsWith('### ')) {
      nodes.push({ tag: 'h4', children: parseInline(line.slice(4)) });
    }
    // Lists
    else if (line.match(/^[-*+]\s+/)) {
      // Handle list items...
    }
    // Regular paragraph
    else if (line.trim()) {
      nodes.push({ tag: 'p', children: parseInline(line) });
    }
  }

  return nodes;
}

function parseInline(text: string): TelegraphNode[] {
  // Parse **bold**, *italic*, `code`, [links](url)
  // Returns array of text and node objects
}
```

---

## Voice & TTS Features

### Voice Transcription (Groq Whisper)

```typescript
const GROQ_WHISPER_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';

export async function transcribeFile(filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);
  formData.append('model', GROQ_WHISPER_MODEL);
  formData.append('language', 'en');

  const response = await fetch(GROQ_WHISPER_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.GROQ_API_KEY}` },
    body: formData,
  });

  const result = await response.json();
  return result.text.trim();
}
```

### Voice Handler Flow

```typescript
export async function handleVoice(ctx: Context): Promise<void> {
  const voice = ctx.message?.voice;
  if (!voice) return;

  // Download from Telegram
  const file = await ctx.api.getFile(voice.file_id);
  const fileUrl = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

  const tempPath = path.join(os.tmpdir(), `voice_${Date.now()}.ogg`);
  await downloadFileSecure(fileUrl, tempPath);

  // Transcribe
  const transcript = await transcribeFile(tempPath);

  // Show transcript
  await messageSender.sendMessage(ctx, `👤 ${transcript}`);

  // Feed to agent
  await queueRequest(chatId, transcript, async () => {
    const response = await sendToAgent(chatId, transcript, { /* options */ });
    await messageSender.sendMessage(ctx, response.text);
  });

  // Cleanup
  fs.unlinkSync(tempPath);
}
```

### Text-to-Speech (OpenAI)

```typescript
import OpenAI from 'openai';

let openai: OpenAI | null = null;

export async function generateSpeech(text: string): Promise<Buffer> {
  if (!openai) {
    openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }

  const response = await openai.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: 'coral',
    input: text,
    response_format: 'opus',
  });

  return Buffer.from(await response.arrayBuffer());
}

// Send as voice message
export async function maybeSendVoiceReply(ctx: Context, text: string): Promise<void> {
  if (!config.TTS_ENABLED || !isTTSEnabledForChat(chatId)) return;

  // Truncate long text
  const truncated = text.substring(0, config.TTS_MAX_CHARS);
  const audioBuffer = await generateSpeech(truncated);

  await ctx.replyWithVoice(new InputFile(audioBuffer, 'response.ogg'));
}
```

---

## Security Patterns

### Secure File Downloads

Prevents token exposure in process arguments:

```typescript
export function downloadFileSecure(fileUrl: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const curlArgs = [
      '-sS', '-f',
      '--connect-timeout', '10',
      '--max-time', '30',
      '-o', destPath,
      '-K', '-',  // Read URL from stdin
    ];

    const child = spawn('curl', curlArgs);

    // Write URL via stdin to avoid process arg exposure
    const safeUrl = fileUrl.replace(/[\r\n"\\]/g, '');
    child.stdin.write(`url = "${safeUrl}"\n`);
    child.stdin.end();

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`curl failed with code ${code}`));
    });
  });
}
```

### Path Sanitization

Remove sensitive information from logs:

```typescript
export function sanitizePath(p: string): string {
  const home = os.homedir();
  const user = os.userInfo().username;
  return p
    .replace(home, '~')
    .replace(new RegExp(`/Users/${user}`, 'g'), '~')
    .replace(new RegExp(`/home/${user}`, 'g'), '~');
}

export function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return sanitizePath(message);
}
```

### SSRF Protection

```typescript
export function isUrlAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Block private IP ranges
    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i,
    ];

    for (const pattern of privatePatterns) {
      if (pattern.test(parsed.hostname)) return false;
    }

    return true;
  } catch {
    return false;
  }
}
```

### Auth Middleware

```typescript
export async function authMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  const userId = ctx.from?.id;

  if (!userId || !config.ALLOWED_USER_IDS.includes(userId)) {
    await ctx.reply('⛔ You are not authorized.');
    return;
  }

  await next();
}
```

---

## Configuration System

### Zod Schema Validation

```typescript
import { z } from 'zod';
import { config as loadEnv } from 'dotenv';

loadEnv();

const toBool = (val: string) => val.toLowerCase() === 'true';

const envSchema = z.object({
  // Required
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'Telegram bot token is required'),
  ALLOWED_USER_IDS: z
    .string()
    .min(1)
    .transform((val) => val.split(',').map((id) => parseInt(id.trim(), 10))),

  // Optional with defaults
  WORKSPACE_DIR: z.string().default(process.env.HOME || '.'),
  CLAUDE_EXECUTABLE_PATH: z.string().default('claude'),
  STREAMING_MODE: z.enum(['streaming', 'wait']).default('streaming'),
  STREAMING_DEBOUNCE_MS: z.string().default('500').transform(Number),
  MAX_MESSAGE_LENGTH: z.string().default('4000').transform(Number),

  // TTS
  TTS_ENABLED: z.string().default('true').transform(toBool),
  TTS_PROVIDER: z.enum(['groq', 'openai']).default('openai'),
  TTS_VOICE: z.string().default('coral'),

  // Security
  DANGEROUS_MODE: z.string().default('false').transform(toBool),

  // API Keys (optional)
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.message);
  process.exit(1);
}

export const config = parsed.data;
```

### Example .env File

```env
# Required
TELEGRAM_BOT_TOKEN=your_bot_token
ALLOWED_USER_IDS=123456789,987654321

# Claude
CLAUDE_EXECUTABLE_PATH=claude
DANGEROUS_MODE=false

# Streaming
STREAMING_MODE=streaming
STREAMING_DEBOUNCE_MS=500
MAX_MESSAGE_LENGTH=4000

# TTS
TTS_ENABLED=true
TTS_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Voice
GROQ_API_KEY=gsk_...
VOICE_SHOW_TRANSCRIPT=true
```

---

## Error Handling

### Graceful Degradation

```typescript
// MarkdownV2 → Plain text fallback
async function sendMessage(ctx: Context, text: string): Promise<void> {
  try {
    const converted = convertToTelegramMarkdown(text);
    await ctx.reply(converted, { parse_mode: 'MarkdownV2' });
  } catch (error) {
    console.error('MarkdownV2 failed, falling back to plain text:', error);
    await ctx.reply(text, { parse_mode: undefined });
  }
}

// Telegraph → Inline chunks fallback
async function finishStreaming(ctx: Context, content: string): Promise<void> {
  if (shouldUseTelegraph(content)) {
    const pageUrl = await createTelegraphPage('Response', content);
    if (pageUrl) {
      await ctx.reply(`[Open in Instant View](${pageUrl})`);
      return;
    }
    // Telegraph failed - fall through to chunking
  }

  // Send as chunks
  const parts = splitMessage(content);
  for (const part of parts) {
    await ctx.reply(part);
  }
}
```

### Cancellation Detection

```typescript
// In agent.ts - detect user-initiated cancellation
if (responseMessage.type === 'result') {
  if (responseMessage.subtype === 'error_during_execution' && isCancelled(chatId)) {
    // User cancelled - show clean message
    fullText = '✅ Successfully cancelled.';
  } else if (responseMessage.subtype !== 'success') {
    fullText = `Error: ${responseMessage.subtype}`;
  }
}
```

---

## Complete Code Examples

### Minimal Bot Setup

```typescript
// index.ts
import { Bot } from 'grammy';
import { run } from '@grammyjs/runner';
import { query } from '@anthropic-ai/claude-agent-sdk';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
const sessions = new Map<number, string>();  // chatId → workingDirectory

bot.command('project', async (ctx) => {
  const path = ctx.message?.text?.split(' ').slice(1).join(' ') || process.env.HOME;
  sessions.set(ctx.chat.id, path);
  await ctx.reply(`Project set: ${path}`);
});

bot.on('message:text', async (ctx) => {
  const chatId = ctx.chat.id;
  const cwd = sessions.get(chatId);

  if (!cwd) {
    await ctx.reply('Use /project <path> first');
    return;
  }

  const response = query({
    prompt: ctx.message.text,
    options: {
      cwd,
      tools: ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'],
      permissionMode: 'acceptEdits',
    },
  });

  let fullText = '';
  for await (const msg of response) {
    if (msg.type === 'assistant') {
      for (const block of msg.message.content) {
        if (block.type === 'text') fullText += block.text;
      }
    }
  }

  await ctx.reply(fullText || 'Done.');
});

run(bot);
```

### Production Bot with All Features

See the full Claudegram implementation for:

- Session persistence
- Request queuing with cancellation
- Streaming responses
- Telegraph integration
- Voice transcription & TTS
- Terminal UI mode
- Error handling & fallbacks

---

## Key Takeaways

1. **Use @grammyjs/runner** for concurrent update processing with per-chat ordering
2. **Place /cancel before sequentialize** middleware so it can interrupt running queries
3. **Store Claude session IDs** to enable conversation continuity across messages
4. **Use query.interrupt()** not controller.abort() for graceful cancellation
5. **Debounce streaming updates** to avoid Telegram rate limits (~1 edit/second)
6. **Telegraph for long responses** (>2500 chars) with fallback to chunked inline
7. **Validate all config with Zod** at startup to fail fast
8. **Sanitize paths in logs** to avoid leaking usernames/home directories
9. **Use stdin for sensitive URLs** in curl to prevent process arg exposure
10. **Always have fallbacks** (MarkdownV2 → plain, Telegraph → chunks)

---

## Resources

- [Grammy Documentation](https://grammy.dev/)
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegraph API](https://telegra.ph/api)
- [Zod Documentation](https://zod.dev/)
