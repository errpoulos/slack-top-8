import type { App } from '@slack/bolt';
import { getTop8 } from './db';
import { buildEditModal, EDIT_MODAL_CALLBACK } from './modals';

function formatTop8(header: string, friendIds: string[]): string {
  const slots = Array.from({ length: 8 }, (_, i) =>
    friendIds[i] ? `${i + 1}. <@${friendIds[i]}>` : `${i + 1}. —`
  );
  // Two columns: odd positions left, even positions right
  const rows = Array.from({ length: 4 }, (_, i) => `${slots[i * 2]}   ${slots[i * 2 + 1]}`);
  return `${header}\n${rows.join('\n')}`;
}

export function registerCommands(app: App): void {
  app.command('/showtop8', async ({ command, ack, respond, client }) => {
    await ack();

    const arg = command.text.trim();

    let targetId: string;
    let header: string;

    if (arg) {
      const match = arg.match(/^<@([A-Z0-9]+)(?:\|[^>]*)?>$/);
      if (!match) {
        await respond({ text: 'Usage: `/showtop8` or `/showtop8 @someone`', response_type: 'ephemeral' });
        return;
      }
      targetId = match[1];
      header = `*<@${targetId}>'s Top 8:*`;
    } else {
      targetId = command.user_id;
      header = '*Your Top 8:*';
    }

    const entries = getTop8(targetId);
    const friendIds = entries.map((e) => e.friend_id);

    if (friendIds.length === 0 && targetId !== command.user_id) {
      const res = await client.users.info({ user: targetId });
      const name = res.user?.profile?.display_name || res.user?.real_name || targetId;
      await respond({ text: `*${name}* hasn't set up their Top 8 yet.`, response_type: 'ephemeral' });
      return;
    }

    await respond({ text: formatTop8(header, friendIds), response_type: 'ephemeral' });
  });

  app.command('/settop8', async ({ command, ack, client }) => {
    await ack();
    await client.views.open({
      trigger_id: command.trigger_id,
      view: buildEditModal(command.user_id),
    });
  });
}
