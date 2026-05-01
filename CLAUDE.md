# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start with hot-reload via tsx (Socket Mode, no public URL needed)
npm run build    # compile to dist/ with tsup
npm start        # run compiled output
npx tsc --noEmit # type-check without emitting
```

## Architecture

A Slack app built with Bolt for JavaScript (TypeScript) using Socket Mode. Three user-facing surfaces:

1. **App Home tab** — rendered on `app_home_opened`, shows the user's Top 8 list with avatars and an Edit button
2. **Edit modal** — opens from the Edit button; 8 optional `users_select` inputs, pre-populated from DB; submits to `edit_top8_modal` callback
3. **`/top8` slash command** — `/top8` shows your list, `/top8 @user` shows someone else's

### File roles
- `src/index.ts` — Bolt app init, event/action/view handler registration
- `src/db.ts` — `better-sqlite3` setup, schema, `getTop8()` / `setTop8()` (synchronous)
- `src/home.ts` — Block Kit view builder for App Home tab (resolves display names via `users.info`)
- `src/modals.ts` — Edit modal builder + submission handler (validates no self-add, persists, refreshes home)
- `src/commands.ts` — `/top8` command handler

### Database
SQLite file at `DATABASE_PATH` (defaults to `./top8.db`). Single table:
```sql
top8(user_id TEXT, position INTEGER 1-8, friend_id TEXT, PRIMARY KEY (user_id, position))
```

## Slack App Setup

Create an app at api.slack.com/apps with:
- **Socket Mode** enabled → generates `SLACK_APP_TOKEN` (`xapp-...`, needs `connections:write` scope)
- **Bot scopes**: `commands`, `users:read`, `chat:write`
- **Event subscriptions**: `app_home_opened`
- **Slash command**: `/top8`
- **App Home**: Home tab enabled

Copy `.env.example` → `.env` and fill in the three tokens.
