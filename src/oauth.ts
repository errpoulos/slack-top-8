import http from 'http';
import { WebClient } from '@slack/web-api';
import { setUserToken } from './db';
import { consumeNonce } from './auth';
import { maybeSyncProfileField } from './profile';
import { buildHomeView } from './home';

function htmlPage(body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;max-width:480px">${body}</body></html>`;
}

export function startOAuthServer(botClient: WebClient): http.Server {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const redirectUri = process.env.OAUTH_REDIRECT_URI ?? `http://localhost:${port}/oauth/callback`;

  const server = http.createServer(async (req, res) => {
    // One-time bot installation flow
    if (req.url === '/install') {
      const params = new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID ?? '',
        scope: 'commands,users:read,chat:write,users.profile:read',
        redirect_uri: `http://localhost:${port}/bot-callback`,
      });
      res.writeHead(302, { Location: `https://slack.com/oauth/v2/authorize?${params}` });
      res.end();
      return;
    }

    if (req.url?.startsWith('/bot-callback')) {
      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      if (!code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlPage('<p>Installation cancelled.</p>'));
        return;
      }
      try {
        const result = (await (botClient.oauth.v2.access as any)({
          client_id: process.env.SLACK_CLIENT_ID!,
          client_secret: process.env.SLACK_CLIENT_SECRET!,
          code,
          redirect_uri: `http://localhost:${port}/bot-callback`,
        })) as { access_token?: string; bot_user_id?: string };
        const token = result.access_token;
        if (!token) throw new Error('No access_token in response');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlPage(
          `<p>✅ App installed! Copy this into your <code>.env</code> as <code>SLACK_BOT_TOKEN</code>, then restart:</p>` +
          `<pre style="background:#f4f4f4;padding:1rem;border-radius:4px;word-break:break-all">${token}</pre>`
        ));
      } catch (err) {
        console.error('[oauth] Bot install failed:', err);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(htmlPage('<p>Installation failed. Check the terminal for details.</p>'));
      }
      return;
    }

    if (!req.url?.startsWith('/oauth/callback')) {
      res.writeHead(404);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://localhost:${port}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlPage('<p>Authorization cancelled. You can close this window.</p>'));
      return;
    }

    const pending = consumeNonce(state);
    if (!pending) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(htmlPage('<p>This link has expired. Please try again from Slack.</p>'));
      return;
    }

    const { userId, codeVerifier } = pending;

    try {
      // code_verifier is not in the SDK's types yet, so cast to any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (await (botClient.oauth.v2.access as any)({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      })) as { authed_user?: { access_token?: string; refresh_token?: string } };

      const userToken = result.authed_user?.access_token;
      if (!userToken) throw new Error('No user token in OAuth response');
      const refreshToken = result.authed_user?.refresh_token ?? null;

      setUserToken(userId, userToken, refreshToken);

      // Sync profile and refresh home concurrently
      await Promise.all([
        maybeSyncProfileField(userId, botClient),
        buildHomeView(botClient, userId).then((view) =>
          botClient.views.publish({ user_id: userId, view })
        ),
      ]);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(htmlPage('<p>Connected! Your Top 8 now appears on your Slack profile. You can close this window.</p>'));
    } catch (err) {
      console.error('[oauth] Token exchange failed:', err);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(htmlPage('<p>Something went wrong. Please try again.</p>'));
    }
  });

  server.listen(port, () => {
    console.log(`[oauth] Callback server listening on http://localhost:${port}`);
  });

  return server;
}
