# Focus Bot

A Telegram bot that captures quick thoughts and saves them as markdown notes to an Obsidian vault. Messages are analyzed by Claude to generate a title, categories, topics, and inline `[[wiki-links]]`, then written as markdown files with YAML frontmatter. Organization inspired by [Steph Ango's vault](https://stephango.com/vault).

## Features

- Capture messages via Telegram and save to Obsidian
- AI-generated titles, categories, topics, and inline `[[wiki-links]]`
- Categories constrained to hub notes in your vault's `Categories/` directory
- User whitelist for access control
- Automatic restart on failure (systemd)

## Prerequisites

- [Bun](https://bun.sh/) runtime
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- Obsidian vault (or any directory for markdown notes)
- Claude subscription or Anthropic API key

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd focus-bot

# Install dependencies
bun install

# Copy and configure environment
cp .env.example .env
# Edit .env with your values
```

## Configuration

Create a `.env` file with the following variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `ALLOWED_USER_IDS` | Yes | Comma-separated Telegram user IDs |
| `NOTES_DIR` | Yes | Absolute path to your Obsidian vault root (must contain `Categories/`) |
| `ANTHROPIC_API_KEY` | No | API key (uses subscription if not set) |

To find your Telegram user ID, message [@userinfobot](https://t.me/userinfobot).

## Usage

Send any text message to the bot and it will be saved as a note.

### Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Show help message |
| `/health` | Check bot health and uptime |
| `/status` | Show systemd service status |
| `/logs` | Show recent log entries (last 30 lines) |

These commands appear in the Telegram menu when you tap the `/` button.

## Development

```bash
# Run with hot reload
bun run dev
```

## Production Deployment

### Build

```bash
bun run build
```

### Run as systemd Service (Ubuntu/Linux)

Using systemd ensures the bot starts on boot and restarts automatically if it crashes.

#### 1. Install the service file

```bash
# Copy service file to systemd directory
sudo cp focus-bot.service /etc/systemd/system/

# Reload systemd to recognize new service
sudo systemctl daemon-reload
```

#### 2. Enable and start

```bash
# Enable to start on boot
sudo systemctl enable focus-bot

# Start the service now
sudo systemctl start focus-bot

# Verify it's running
sudo systemctl status focus-bot
```

#### 3. Useful commands

```bash
# View live logs
journalctl -u focus-bot -f

# View recent logs
journalctl -u focus-bot --since "1 hour ago"

# Restart after code changes
sudo systemctl restart focus-bot

# Stop the service
sudo systemctl stop focus-bot

# Disable from starting on boot
sudo systemctl disable focus-bot
```

### Service Configuration

The included `focus-bot.service` file:

- Runs as user `n8bot`
- Starts after network is available
- Restarts automatically on failure (5 second delay)
- Loads environment from `.env` file

To customize, edit the service file before installing:

```ini
[Service]
User=your-username                              # Change to your user
WorkingDirectory=/path/to/focus-bot             # Change to your path
ExecStart=/path/to/.bun/bin/bun run start       # Adjust bun path if needed
EnvironmentFile=/path/to/focus-bot/.env         # Adjust .env path
```

## Note Format

Captured notes are saved to `NOTES_DIR/` as markdown with YAML frontmatter. The filename is the AI-generated title (e.g., `Consciousness Sharing to Prove Qualia.md`).

```markdown
---
captured: 2026-02-04T14:34
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

## License

MIT
