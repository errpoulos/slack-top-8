import crypto from 'crypto';

// Short-lived nonce store: nonce -> userId
const pending = new Map<string, string>();

export function generateAuthUrl(userId: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  pending.set(nonce, userId);
  setTimeout(() => pending.delete(nonce), 10 * 60 * 1000);

  const redirectUri = process.env.OAUTH_REDIRECT_URI ?? 'http://localhost:3000/oauth/callback';
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID ?? '',
    user_scope: 'users.profile:write',
    redirect_uri: redirectUri,
    state: nonce,
  });

  return `https://slack.com/oauth/v2/authorize?${params}`;
}

export function consumeNonce(nonce: string): string | undefined {
  const userId = pending.get(nonce);
  pending.delete(nonce);
  return userId;
}
