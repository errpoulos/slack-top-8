# Slack Top 8

A Slack app that brings back the MySpace Top 8 — let workspace members publicly list their 8 favourite colleagues.

## Features

- **App Home tab** — view your Top 8 with profile pictures and edit it via a modal
- **`/top8` slash command** — quickly view your own or anyone else's list
- **Public lists** — anyone in the workspace can look up anyone's Top 8

## Prerequisites

- Node.js 18+
- A Slack workspace where you can install apps

## Slack App Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App → From scratch**.

2. Under **Socket Mode**, enable it. This generates your `SLACK_APP_TOKEN` (`xapp-...`). Give the token the `connections:write` scope.

3. Under **OAuth & Permissions → Bot Token Scopes**, add:
   - `commands`
   - `users:read`
   - `chat:write`

4. Under **Event Subscriptions**, enable events and subscribe to the bot event:
   - `app_home_opened`

5. Under **Slash Commands**, create:
   - Command: `/top8`
   - Description: `View yours or someone else's Top 8`
   - Usage hint: `[@username]`

6. Under **App Home**, enable the **Home Tab**.

7. Install the app to your workspace. Copy the **Bot User OAuth Token** (`xoxb-...`) from **OAuth & Permissions** and the **Signing Secret** from **Basic Information**.

## Installation

```bash
git clone <repo-url>
cd slack-top-8
npm install
cp .env.example .env
```

Edit `.env` with your credentials:

```env
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...
DATABASE_PATH=./top8.db   # optional, defaults to ./top8.db
```

## Running

```bash
# Development (hot-reload)
npm run dev

# Production
npm run build
npm start
```

On first run, `top8.db` is created automatically — no migration step needed.

## Usage

### App Home tab

Open the app's DM in Slack and click the **Home** tab. Your current Top 8 is displayed. Click **Edit Your Top 8** to open a modal where you can pick up to 8 colleagues (one per slot, ordered by preference).

### Slash command

| Command | Result |
|---------|--------|
| `/top8` | Your own Top 8 (visible only to you) |
| `/top8 @alice` | Alice's Top 8 (visible only to you) |

## Project Structure

```
src/
  index.ts      # App entry point, Bolt handler registration
  db.ts         # SQLite schema and CRUD helpers
  home.ts       # App Home Block Kit view
  modals.ts     # Edit modal view and submission handler
  commands.ts   # /top8 slash command
  types.ts      # Shared TypeScript types
```
