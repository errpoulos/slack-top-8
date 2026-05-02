import 'dotenv/config';
import { WebClient } from '@slack/web-api';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

(async () => {
  try {
    const res = await (client.team.profile as any).get();
    const fields = res.profile?.fields ?? [];
    if (fields.length === 0) {
      console.log('No custom profile fields found.');
    } else {
      console.log('Custom profile fields:');
      fields.forEach((f: { id: string; label: string; type: string }) => {
        console.log(`  id=${f.id}  label="${f.label}"  type=${f.type}`);
      });
    }
  } catch (err: any) {
    console.error('Failed:', err?.data?.error ?? err);
  }
})();
