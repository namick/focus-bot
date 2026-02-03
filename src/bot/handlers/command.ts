import { Context } from 'grammy';

const helpMessage = `Welcome to Focus Bot!

I capture your thoughts and save them as notes in your Obsidian vault.

How to use:
- Just send me any text message
- I'll generate a title and tags automatically
- The note will be saved to your vault

Commands:
/start - Show this help message`;

export async function handleStart(ctx: Context): Promise<void> {
  await ctx.reply(helpMessage);
}
