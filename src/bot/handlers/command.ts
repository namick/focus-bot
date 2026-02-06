import { Context } from 'grammy';

export const helpMessage = `Focus Bot is online.

Send me any text and I'll save it as a note with:
- AI-generated title (becomes the filename)
- Categories from your vault's Categories/ directory
- Topics as [[wiki-links]]
- Key concepts linked in the body

Commands:
/start - Show this message
/health - Bot health and uptime
/status - systemd service status
/logs - Recent log entries
/restart - Restart the bot`;

export async function handleStart(ctx: Context): Promise<void> {
  await ctx.reply(helpMessage);
}
