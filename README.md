# Slack Top 8

Remember MySpace Top 8? This Slack app brings it back.

Add up to 8 favourite colleagues to your list. Anyone in your workspace can look up anyone else's Top 8 — great for finding out who has who in their corner.

---

## How it works

### App Home
Open the app and your Top 8 is front and centre, complete with profile pictures. Hit **Edit Your Top 8** to pick your people.

![App Home showing a user's Top 8 with avatars](https://via.placeholder.com/600x300?text=App+Home+screenshot)

### Slash commands

| Command | What it does |
|---|---|
| `/settop8` | Opens the edit modal to update your list |
| `/showtop8 @someone` | Shows that person's Top 8, just for you |

---

## Built with

- [Slack Bolt for JavaScript](https://slack.dev/bolt-js/) — event handling and modals
- [Socket Mode](https://api.slack.com/apis/connections/socket) — no public URL required
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — lightweight local persistence
- TypeScript

## Stack

```
src/
  index.ts      # Bolt app init and handler registration
  db.ts         # SQLite schema and CRUD
  home.ts       # App Home Block Kit view
  modals.ts     # Edit modal and submission handler
  commands.ts   # /settop8 and /showtop8 slash commands
  types.ts      # Shared types
```
