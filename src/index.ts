import 'dotenv/config';
import { App } from '@slack/bolt';
import { buildHomeView } from './home';
import { buildEditModal, handleEditModalSubmit, EDIT_MODAL_CALLBACK } from './modals';
import { registerCommands } from './commands';
import { storeInstallation, fetchInstallation, deleteInstallation } from './db';

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  scopes: ['commands', 'users:read', 'chat:write', 'users.profile:read'],
  installationStore: {
    storeInstallation,
    fetchInstallation,
    deleteInstallation,
  },
});

app.event('app_home_opened', async ({ event, body, client }) => {
  if (event.tab !== 'home') return;
  const teamId = body.team_id;
  const view = await buildHomeView(client, teamId, event.user);
  await client.views.publish({ user_id: event.user, view });
});

app.action('open_edit_modal', async ({ ack, body, client }) => {
  await ack();
  const teamId = body.team?.id ?? '';
  const userId = body.user.id;
  await client.views.open({
    trigger_id: (body as { trigger_id: string }).trigger_id,
    view: buildEditModal(teamId, userId),
  });
});

app.view(EDIT_MODAL_CALLBACK, async ({ ack, body, view, client }) => {
  const teamId = body.team?.id ?? '';
  const userId = body.user.id;
  const error = await handleEditModalSubmit(teamId, userId, view.state.values as never, client);
  if (error) {
    await ack({ response_action: 'errors', errors: { friend_1: error } });
  } else {
    await ack();
  }
});

registerCommands(app);

(async () => {
  await app.start(process.env.PORT ?? 3000);
  console.log('⚡ Slack Top 8 app is running');
})();
