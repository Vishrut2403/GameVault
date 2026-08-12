# Troubleshooting

## Backend won't start

**`ECONNREFUSED` / `Connection refused`**
```bash
sudo systemctl start postgresql
```

**`Database gamevault does not exist`**
```bash
psql -U postgres
CREATE DATABASE gamevault;
\q
```

**`Invalid prisma.user invocation`**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

---

## Frontend won't start

**`VITE_API_URL is not defined`**
Create `frontend/.env` with:
```
VITE_API_URL=http://localhost:3001
```

**`Cannot GET /`**
Start the backend first.

---

## Steam OAuth

**`Invalid return URL`**
`STEAM_RETURN_URL` in `.env` must be exactly `http://localhost:3001/api/auth/callback`. Restart backend after changing.

**`Unauthorized`**
Invalid Steam API key. Get a new one at https://steamcommunity.com/dev/apikey.

---

## HLTB

HLTB shows no data for some games — this is expected. The unofficial API covers most popular titles but not all. The app falls back silently.

To reset stale HLTB data for a wishlist game:
```bash
npx prisma studio
```
Open `steam_wishlist`, find the game, set `hltbMain`, `hltbExtra`, `hltbCompletionist`, `hltbName` to null.

---

## Heatmap / Sessions

**Heatmap empty**
1. Sync your library — sessions are created during sync
2. Hard refresh: `Ctrl+Shift+R`
3. Check browser console for errors

**401 on sessions**
Log out, log back in to get a fresh JWT token.

---

## Database

**Reset everything (deletes all data)**
```bash
cd backend
npx prisma migrate reset
```

**View data in GUI**
```bash
npx prisma studio
```