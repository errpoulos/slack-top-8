import 'dotenv/config';
import http from 'http';

const CLIENT_ID = process.env.SLACK_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET ?? '';
const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/bot-callback`;

const server = http.createServer(async (req, res) => {
  if (req.url === '/install') {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: 'commands,users:read,chat:write,users.profile:read',
      redirect_uri: REDIRECT_URI,
    });
    res.writeHead(302, { Location: `https://slack.com/oauth/v2/authorize?${params}` });
    res.end();
    return;
  }

  if (req.url?.startsWith('/bot-callback')) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<p>Cancelled.</p>');
      return;
    }

    const body = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    });

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await response.json() as { ok: boolean; access_token?: string; error?: string };

    if (!data.ok || !data.access_token) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<p>Error: ${data.error}</p>`);
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(
      `<html><body style="font-family:sans-serif;padding:2rem;max-width:600px">` +
      `<p>✅ Done! Add this to your <code>.env</code> as <code>SLACK_BOT_TOKEN</code>:</p>` +
      `<pre style="background:#f4f4f4;padding:1rem;border-radius:4px;word-break:break-all">${data.access_token}</pre>` +
      `<p>Then run <code>npm run dev</code>.</p></body></html>`
    );
    server.close();
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`\nOpen this in your browser to install the app:\n\n  http://localhost:${PORT}/install\n`);
});
