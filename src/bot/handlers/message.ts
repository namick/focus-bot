import { Context } from 'grammy';
import { captureNote } from '../../services/note-capture.js';

export async function handleTextMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text;
  if (!text) return;

  try {
    const result = await captureNote(text);
    await ctx.reply(`Saved: ${result.title}`);
  } catch (error) {
    console.error('Note capture failed:', error);
    await ctx.reply('Failed to save note. Please try again.');
  }
}
