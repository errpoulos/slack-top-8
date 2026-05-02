import 'dotenv/config';
import { App } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { buildHomeView } from './home';
import { buildEditModal, handleEditModalSubmit, EDIT_MODAL_CALLBACK } from './modals';
import { registerCommands } from './commands';
import { startOAuthServer } from './oauth';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.event('app_home_opened', async ({ event, client }) => {
  if (event.tab !== 'home') return;
  const view = await buildHomeView(client, event.user);
  await client.views.publish({ user_id: event.user, view });
});

app.action('open_edit_modal', async ({ ack, body, client }) => {
  await ack();
  const userId = body.user.id;
  await client.views.open({
    trigger_id: (body as { trigger_id: string }).trigger_id,
    view: buildEditModal(userId),
  });
});

app.view(EDIT_MODAL_CALLBACK, async ({ ack, body, view, client }) => {
  const userId = body.user.id;
  const error = await handleEditModalSubmit(userId, view.state.values as never, client);
  if (error) {
    await ack({ response_action: 'errors', errors: { friend_1: error } });
  } else {
    await ack();
  }
});

// Link buttons send an action event that must be acked even though the URL opens automatically
app.action('connect_profile', async ({ ack }) => { await ack(); });

registerCommands(app);

(async () => {
  const botClient = new WebClient(process.env.SLACK_BOT_TOKEN);
  startOAuthServer(botClient);
  await app.start();
  console.log('⚡ Slack Top 8 app is running');
})();
