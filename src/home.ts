import type { WebClient } from '@slack/web-api';
import type { HomeView } from '@slack/bolt';
import { getTop8 } from './db';
import type { FriendInfo } from './types';

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

async function resolveFriends(client: WebClient, friendIds: string[]): Promise<FriendInfo[]> {
  const results = await Promise.all(
    friendIds.map((id) =>
      client.users.info({ user: id }).then((res) => ({
        id,
        name: res.user?.profile?.display_name || res.user?.real_name || id,
        avatar: res.user?.profile?.image_48 ?? '',
      }))
    )
  );
  return results;
}

export async function buildHomeView(client: WebClient, userId: string): Promise<HomeView> {
  const entries = getTop8(userId);
  const friendMap = new Map<number, FriendInfo>();

  if (entries.length > 0) {
    const friends = await resolveFriends(client, entries.map((e) => e.friend_id));
    entries.forEach((e, i) => friendMap.set(e.position, friends[i]));
  }

  const friendBlocks = ORDINALS.map((ordinal, i) => {
    const pos = i + 1;
    const friend = friendMap.get(pos);
    if (friend) {
      return {
        type: 'section' as const,
        text: {
          type: 'mrkdwn' as const,
          text: `*${pos}.* <@${friend.id}>`,
        },
        accessory: friend.avatar
          ? {
              type: 'image' as const,
              image_url: friend.avatar,
              alt_text: friend.name,
            }
          : undefined,
      };
    }
    return {
      type: 'section' as const,
      text: {
        type: 'mrkdwn' as const,
        text: `*${pos}.* —`,
      },
    };
  });

  return {
    type: 'home',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '⭐ Your Top 8' },
      },
      { type: 'divider' },
      ...friendBlocks,
      { type: 'divider' },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'open_edit_modal',
            text: { type: 'plain_text', text: '✏️ Edit Your Top 8' },
            style: 'primary',
          },
        ],
      },
    ],
  };
}
