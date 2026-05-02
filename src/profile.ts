import { WebClient } from '@slack/web-api';
import { getTop8, getUserTokenRow, setUserToken } from './db';

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

async function refreshAccessToken(
  userId: string,
  refreshToken: string,
  botClient: WebClient
): Promise<string | null> {
  try {
    const result = (await (botClient.oauth.v2.access as any)({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })) as { authed_user?: { access_token?: string; refresh_token?: string } };

    const newAccess = result.authed_user?.access_token;
    const newRefresh = result.authed_user?.refresh_token ?? refreshToken;
    if (!newAccess) return null;

    setUserToken(userId, newAccess, newRefresh);
    return newAccess;
  } catch (err) {
    console.warn(`[top8] Token refresh failed for ${userId}:`, err);
    return null;
  }
}

export async function maybeSyncProfileField(userId: string, botClient: WebClient): Promise<void> {
  const tokenRow = getUserTokenRow(userId);
  if (!tokenRow) return;

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

  let accessToken = tokenRow.accessToken;

  const trySet = async (token: string): Promise<string | null> => {
    try {
      await new WebClient(token).users.profile.set({
        profile: JSON.stringify({ fields: { [fieldId]: { value, alt: '' } } }),
      });
      return null;
    } catch (err: unknown) {
      return (err as { data?: { error?: string } })?.data?.error ?? String(err);
    }
  };

  let error = await trySet(accessToken);

  // On token_expired, refresh and retry once
  if (error === 'token_expired' && tokenRow.refreshToken) {
    const newToken = await refreshAccessToken(userId, tokenRow.refreshToken, botClient);
    if (newToken) {
      error = await trySet(newToken);
    }
  }

  if (error) {
    console.warn(`[top8] Profile sync failed for ${userId}:`, error);
  }
}
