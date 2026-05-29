# Deploy RIDA.FN booking API on Railway

## Part A — Create the Railway service (dashboard)

1. Open [railway.com/new](https://railway.com/new) and sign in with GitHub.
2. Click **Deploy from GitHub repo** → choose **rida.fn** (or your fork).
3. Railway creates a service. Open it → **Settings**:
   - **Root Directory**: leave empty (repo root).
   - **Config file**: `railway.toml` (auto-detected).
4. Open **Variables** → **RAW Editor** and paste (replace with your real values):

```env
BOT_TOKEN=your_new_token_from_botfather
MASTER_CHAT_ID=7811117912
ALLOWED_ORIGINS=https://gen-lang-client-0122413605.web.app
```

5. **Networking** → **Generate Domain** → copy the URL (e.g. `https://rida-fn-production.up.railway.app`).

6. Test in browser: `https://YOUR-DOMAIN.up.railway.app/`  
   You should see: `{"status":"ok",...}`

---

## Part B — Persistent bookings (volume)

Without a volume, bookings are lost when Railway redeploys.

1. In your Railway **service** → **Volumes** → **Add Volume**.
2. **Mount path**: `/app/data`  
   (Railway runs your app from `/app`; this matches the default data folder.)
3. Click **Add**. Railway sets `RAILWAY_VOLUME_MOUNT_PATH=/app/data` automatically.
4. **Redeploy** the service (Deployments → ⋮ → Redeploy).
5. In **Deploy Logs**, confirm you see:  
   `✅ Railway volume mounted at /app/data`

Bookings are stored at `/app/data/bookings.json` on the volume.

---

## Part C — Connect the website (Firebase)

On your PC, in the project folder:

```powershell
cd C:\Users\muxar\OneDrive\Desktop\rida.fn

$env:VITE_BOOKING_API_URL="https://YOUR-DOMAIN.up.railway.app"
npm run build
firebase deploy --only hosting
```

Replace `YOUR-DOMAIN` with your Railway domain from Part A step 5.

---

## Part D — Telegram bot commands

| Command | Who | Action |
|---------|-----|--------|
| `/start` | Anyone | Welcome + website link |
| `/free` | Anyone | Free time slots |
| `/bookings` | Master (`MASTER_CHAT_ID`) | List bookings |
| `/cancel <id>` | Master | Cancel and free a slot |

**Get your chat ID:** message [@userinfobot](https://t.me/userinfobot) or [@GetIDsBot](https://t.me/GetIDsBot).

**Security:** never commit `BOT_TOKEN`. If it was shared publicly, revoke it in [@BotFather](https://t.me/BotFather) and create a new one.

---

## Optional — Railway CLI (Windows)

```powershell
npm install -g @railway/cli
railway login
cd C:\Users\muxar\OneDrive\Desktop\rida.fn
railway link
railway volume add --mount-path /app/data
railway up
```

Or run: `npm run railway:setup` for guided steps.
