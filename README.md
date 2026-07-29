# KaMaSe — deploy guide

A shared grocery & kitchen app for one household. Same stack as your baby app:
**Supabase** (data + realtime) · **GitHub** (code) · **Vercel** (hosting).
Model: one shared household — anyone with the link is you, Maren and a guest. No logins.

You'll do the account clicks; the code is all here and already builds.

---

## 1. Supabase (the database)

1. Go to supabase.com → **New project**. Pick a name and a region near you (Stockholm/Frankfurt). Save the database password somewhere.
2. When it's ready, open **SQL Editor** → **New query**. Paste everything from `supabase/schema.sql` → **Run**. (Creates one table, opens it to the anon key, turns on realtime.)
3. Open **Project Settings → API**. Copy two values for later:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`  (this one is meant to be public — safe in the browser)

## 2. GitHub (the code)

1. Create a new **empty** repo at github.com (e.g. `kamase`), private is fine.
2. Push this folder to it:
   ```bash
   cd kamase
   git init
   git add .
   git commit -m "KaMaSe"
   git branch -M main
   git remote add origin https://github.com/YOU/kamase.git
   git push -u origin main
   ```

## 3. Vercel (the hosting)

1. vercel.com → **Add New → Project** → import the `kamase` repo. It auto-detects Vite; leave the build settings as-is.
2. Before deploying, open **Environment Variables** and add three:

   | Name | Value | Notes |
   |---|---|---|
   | `VITE_SUPABASE_URL` | your Project URL | from Supabase step 3 |
   | `VITE_SUPABASE_ANON_KEY` | your anon public key | from Supabase step 3 |
   | `ANTHROPIC_API_KEY` | your `sk-ant-…` key | **secret** — no `VITE_` prefix, so it stays server-side |

3. **Deploy.** You get a URL like `kamase.vercel.app`.

## 4. Put it on your phones

Open the URL in Safari (iOS) or Chrome (Android) → Share → **Add to Home Screen**. It opens full-screen like a native app, with the KaMaSe icon. Do it on both phones — you now share one live list.

---

## How it's wired (for reference)

- **`src/App.jsx`** — the whole app. Its storage layer calls `src/sync.js` instead of browser storage.
- **`src/sync.js`** — reads/writes one JSON row in Supabase and subscribes to realtime changes so the other phone updates instantly. The app's own timestamp-merge means edits from both of you converge safely.
- **`api/ai.js`** — a Vercel serverless function. The browser calls `/api/ai`; this function adds your secret Anthropic key and forwards to the API. Powers receipt scanning, barcode reading, recipe suggestions and the saving plan. **The key never reaches the browser.**
- **`supabase/schema.sql`** — the one-time database setup.

## Getting the Anthropic key

console.anthropic.com → API keys → create key. Note it's billed per use; receipt scans are cheap but not free.

## Run it locally first (optional)

```bash
cp .env.example .env.local   # fill in your three values
npm install
npm run dev                  # note: /api/ai needs `vercel dev` instead of `npm run dev`
```
For the AI proxy to work locally, use `npx vercel dev` (after `npm i -g vercel`) so the `api/` function runs too. Plain `npm run dev` runs everything except scanning.
