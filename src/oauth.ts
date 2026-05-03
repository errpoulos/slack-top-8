import http from 'http';
import { WebClient } from '@slack/web-api';

function htmlPage(body: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;max-width:480px">${body}</body></html>`;
}

export function startOAuthServer(botClient: WebClient): http.Server {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  const server = http.createServer(async (req, res) => {
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
        })) as { access_token?: string };
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

    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    console.log(`[oauth] Callback server listening on http://localhost:${port}`);
  });

  return server;
}
