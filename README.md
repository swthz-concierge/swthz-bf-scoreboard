# SWTHZ Black Friday Scoreboard: Setup (about 20 minutes)

**How it works:** A staffer texts `+1 PV` to your Twilio number. A Twilio Function logs it in Twilio Sync and texts back the new standings. The scoreboard page checks for new scores every 3 seconds.

```
Staff phone ──SMS──▶ Twilio number ──▶ /sms  (Function) ──▶ Sync list
                                                              │
Monitor / phone / GitHub Pages ◀── polls every 3s ── /scores ◀─────┘
```

## 1. Create a Sync Service
Console → **Sync → Services → Create**. Name it `swthz-bf` and copy the **SID** (starts with `IS…`).

## 2. Create the Functions Service
Console → **Functions and Assets → Services → Create Service**. Name it `swthz-bf`.

Add these files (use **Add +** to create each one, then paste the code in):

| Path | Visibility | File |
|---|---|---|
| `/helpers` | **Private** | `functions/helpers.private.js` |
| `/sms` | **Protected** | `functions/sms.js` |
| `/scores` | **Public** | `functions/scores.js` |
| `/reset` | **Public** (key-protected) | `functions/reset.js` |
| `/roster.json` (Asset) | **Private** | `assets/roster.private.json` (copy `roster.example.json`; never commit real numbers) |
| `/index.html` (Asset) | **Public** | `index.html` (only if you host the board on Twilio) |

## 3. Environment variables
Go to Settings → **Environment Variables**:

| Key | Example |
|---|---|
| `SYNC_SERVICE_SID` | `ISxxxxxxxx…` |
| `GOAL_PV` / `GOAL_CH` / `GOAL_SR` | `40` (leave blank to hide the goal bars) |
| `DISPLAY_NUMBER` | `(480) 555-0199`, the Twilio number staff text to |
| `ADMIN_KEY` | any long random word, used for resetting |
| `BOARD_TITLE` | `SWTHZ Black Friday Showdown` |

Under Settings → **Dependencies**, make sure `twilio` is listed (it is by default). Then click **Deploy All**.

## 4. Edit the roster
Copy `assets/roster.example.json` into the private `/roster.json` asset in Twilio. List every staffer's phone number in **+1XXXXXXXXXX** format, with their name, home studio (`PV`, `CH` or `SR`) and an optional role:
- no role: staff, who can log sales
- `"role": "manager"`: can also set **their own** studio's total
- `"role": "admin"`: can set **any** studio's total (for you and Christie)

Texts from any number not on the roster are rejected. Never commit real numbers to this public repo.

## 5. Point your Twilio number at it
Console → **Phone Numbers → Active Numbers →** your number → **Messaging** → "A message comes in" → **Function** → service `swthz-bf` → `/sms`. Save.

> US numbers can only send replies through a registered A2P 10DLC campaign (or a verified toll-free number). If the number already texts members, you're covered. If it isn't registered, incoming texts still update the board, but staff won't get a reply.

## 6. Open the scoreboard
- **On Twilio:** `https://swthz-bf-XXXX.twil.io/index.html`
- **On GitHub Pages:** `https://swthz-concierge.github.io/swthz-bf-scoreboard/`. Set `API_BASE` at the top of the script in `index.html` to your `https://swthz-bf-XXXX.twil.io` URL (or add `?api=https://swthz-bf-XXXX.twil.io` to the link)
- **Per-studio monitor:** add `?loc=PV`, `?loc=CH` or `?loc=SR` so the studio's own card is outlined
- **Preview with fake data:** add `?demo`

## Text commands for staff
| Text | What it does |
|---|---|
| `+1 PV` · `+2 Chandler` · `1 Salt River` · `PV +1` | Adds sales (aliases: Paradise, Scottsdale, SR, CH…) |
| `-1 PV` | Fixes a mistake |
| `UNDO` | Removes your own last entry |
| `SCORE` | Texts back the current standings |
| `153` *(managers)* | Sets your studio's total to 153 for end-of-day corrections. The change goes on the board, not on anyone's personal tally |
| `SET PV 153` *(admins)* | Sets any studio's total |
| `RESET ALL` *(admins)* | Wipes the whole board back to zero (great for testing) |

There's a limit of 20 per text, so a typo like `+100` gets rejected.

## Before and after the sale
Do a test run, then text `RESET ALL` from an admin phone, or visit:
`https://swthz-bf-XXXX.twil.io/reset?key=YOUR_ADMIN_KEY`
