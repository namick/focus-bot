import { Context } from 'grammy';
import { captureNote } from '../../services/note-capture.js';
import { processNote } from '../../services/note-enrichment.js';

export async function handleTextMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text;
  if (!text || !ctx.chat) return;

  try {
    await ctx.api.sendChatAction(ctx.chat.id, 'typing');
    const result = await captureNote(text);
    await ctx.react('👍');

    // Fire-and-forget: async enrichment (does not block user)
    const messageId = ctx.message?.message_id;
    processNote(result.filePath, result.urls, messageId ? {
      chatId: ctx.chat.id,
      messageId,
      api: ctx.api,
    } : undefined).catch((error) => {
      console.error('[enrichment] Failed:', error);
    });
  } catch (error) {
    console.error('Note capture failed:', error);
    await ctx.reply('Failed to save note. Please try again.');
  }
}
