import { WebClient } from '@slack/web-api';
import { getTop8, getUserToken } from './db';

let cachedFieldId: string | null | undefined;

async function resolveFieldId(botClient: WebClient): Promise<string | null> {
  if (process.env.TOP8_PROFILE_FIELD_ID) return process.env.TOP8_PROFILE_FIELD_ID;
  if (cachedFieldId !== undefined) return cachedFieldId;

  try {
    const res = await (botClient.team.profile as {
      get: () => Promise<{ profile?: { fields?: { id?: string; label?: string }[] } }>;
    }).get();
    const field = res.profile?.fields?.find((f) => f.label === 'Top 8');
    cachedFieldId = field?.id ?? null;
  } catch {
    cachedFieldId = null;
  }

  if (!cachedFieldId) {
    console.warn(
      '[top8] "Top 8" profile field not found. ' +
        'Create it in workspace Settings → Profile & Account → Edit Profile Fields, ' +
        'then optionally set TOP8_PROFILE_FIELD_ID in .env to skip this lookup.'
    );
  }

  return cachedFieldId;
}

export async function maybeSyncProfileField(userId: string, botClient: WebClient): Promise<void> {
  const token = getUserToken(userId);
  if (!token) return;

  const fieldId = await resolveFieldId(botClient);
  if (!fieldId) return;

  const entries = getTop8(userId);
  let value = '';

  if (entries.length > 0) {
    const names = await Promise.all(
      entries.map((e) =>
        botClient.users.info({ user: e.friend_id }).then(
          (res) => res.user?.profile?.display_name || res.user?.real_name || e.friend_id
        )
      )
    );
    value = names.map((name, i) => `${i + 1}. ${name}`).join('  ');
  }

  const userClient = new WebClient(token);
  try {
    await userClient.users.profile.set({
      // No 'user' param — the user token authenticates as the user themselves
      profile: JSON.stringify({ fields: { [fieldId]: { value, alt: '' } } }),
    });
  } catch (err: unknown) {
    const code = (err as { data?: { error?: string } })?.data?.error ?? String(err);
    console.warn(`[top8] Profile sync failed for ${userId}:`, code);
  }
}
