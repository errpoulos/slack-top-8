import type { App } from '@slack/bolt';
import { getTop8 } from './db';

function formatTop8(ownerMention: string, friendIds: string[]): string {
  const lines: string[] = [`*${ownerMention}'s Top 8:*`];
  for (let i = 0; i < 8; i++) {
    const friend = friendIds[i] ? `<@${friendIds[i]}>` : '—';
    lines.push(`${i + 1}. ${friend}`);
  }
  return lines.join('\n');
}

export function registerCommands(app: App): void {
  app.command('/top8', async ({ command, ack, respond, client }) => {
    await ack();

    const arg = command.text.trim();

    let targetId: string;
    let ownerMention: string;

    if (arg) {
      // Strip <@USERID> or <@USERID|name> mention format
      const match = arg.match(/^<@([A-Z0-9]+)(?:\|[^>]*)?>$/);
      if (!match) {
        await respond({ text: 'Usage: `/top8` or `/top8 @someone`', response_type: 'ephemeral' });
        return;
      }
      targetId = match[1];
      ownerMention = `<@${targetId}>`;
    } else {
      targetId = command.user_id;
      ownerMention = 'Your';
    }

    const entries = getTop8(targetId);
    const friendIds = entries.map((e) => e.friend_id);

    if (friendIds.length === 0 && targetId !== command.user_id) {
      const res = await client.users.info({ user: targetId });
      const name = res.user?.profile?.display_name || res.user?.real_name || targetId;
      await respond({ text: `*${name}* hasn't set up their Top 8 yet.`, response_type: 'ephemeral' });
      return;
    }

    await respond({ text: formatTop8(ownerMention, friendIds), response_type: 'ephemeral' });
  });
}
