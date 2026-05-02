import crypto from 'crypto';

interface PendingAuth {
  userId: string;
  codeVerifier: string;
}

// Short-lived store: nonce -> { userId, codeVerifier }
const pending = new Map<string, PendingAuth>();

export function generateAuthUrl(userId: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  pending.set(nonce, { userId, codeVerifier });
  setTimeout(() => pending.delete(nonce), 10 * 60 * 1000);

  const redirectUri = process.env.OAUTH_REDIRECT_URI ?? 'http://localhost:3000/oauth/callback';
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID ?? '',
    user_scope: 'users.profile:write',
    redirect_uri: redirectUri,
    state: nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://slack.com/oauth/v2/authorize?${params}`;
}

export function consumeNonce(nonce: string): PendingAuth | undefined {
  const entry = pending.get(nonce);
  pending.delete(nonce);
  return entry;
}
