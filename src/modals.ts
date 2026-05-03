import type { ModalView } from '@slack/bolt';
import type { WebClient } from '@slack/web-api';
import { getTop8, setTop8 } from './db';
import { buildHomeView } from './home';

export const EDIT_MODAL_CALLBACK = 'edit_top8_modal';

export function buildEditModal(teamId: string, userId: string): ModalView {
  const entries = getTop8(teamId, userId);
  const currentFriends = new Map(entries.map((e) => [e.position, e.friend_id]));

  const inputs = Array.from({ length: 8 }, (_, i) => {
    const pos = i + 1;
    const existing = currentFriends.get(pos);
    return {
      type: 'input' as const,
      block_id: `friend_${pos}`,
      optional: true,
      label: { type: 'plain_text' as const, text: `Friend #${pos}` },
      element: {
        type: 'users_select' as const,
        action_id: `friend_${pos}_select`,
        placeholder: { type: 'plain_text' as const, text: 'Pick a friend' },
        ...(existing ? { initial_user: existing } : {}),
      },
    };
  });

  return {
    type: 'modal',
    callback_id: EDIT_MODAL_CALLBACK,
    title: { type: 'plain_text', text: 'Edit Your Top 8' },
    submit: { type: 'plain_text', text: 'Save' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: inputs,
  };
}

export async function handleEditModalSubmit(
  teamId: string,
  userId: string,
  values: Record<string, Record<string, { selected_user?: string | null }>>,
  client: WebClient
): Promise<string | null> {
  const friendIds: string[] = [];

  for (let pos = 1; pos <= 8; pos++) {
    const selected = values[`friend_${pos}`]?.[`friend_${pos}_select`]?.selected_user;
    if (selected) {
      if (selected === userId) {
        return `Friend #${pos}: You can't add yourself to your own Top 8.`;
      }
      friendIds.push(selected);
    }
  }

  setTop8(teamId, userId, friendIds);

  const view = await buildHomeView(client, teamId, userId);
  await client.views.publish({ user_id: userId, view });

  return null;
}
