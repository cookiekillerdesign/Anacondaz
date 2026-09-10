# ANACONDAZ — Vite + Vercel + Supabase

Static 3-page site (home / discography / booking) with GSAP + Lenis animations,
Spotify embeds, and a Supabase-backed booking form + editable discography/tour data.
Works fully on static fallback data with **zero Supabase setup** — Supabase is optional enhancement.

## 1. Install

```bash
npm install
```

## 2. Supabase (optional but recommended)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste and run `supabase/schema.sql`. This creates:
   - `releases` — discography, public read, editable in Table Editor (add rows = new albums show on the site, no redeploy).
   - `tour_dates` — upcoming shows, public read.
   - `booking_requests` — organizer form submissions, public **insert only** (not readable by the anon key — view them in the Supabase dashboard).
3. Copy `.env.example` to `.env.local` and fill in **Project Settings → API**:
   ```bash
   cp .env.example .env.local
   ```
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

Without these two variables the site runs on the hardcoded fallback data in
`src/pages/*.js` and the booking form falls back to a `mailto:` link — nothing breaks.

## 3. Run locally

```bash
npm run dev
```

## 4. Deploy to Vercel

```bash
npx vercel
```

Or connect the repo in the Vercel dashboard. `vercel.json` pins the build
explicitly (`npm run build` → `dist`, `framework: null` = "Other" preset, no
auto-detection guesswork). Add the two `VITE_SUPABASE_*` variables under
**Project → Settings → Environment Variables** (Production + Preview), then
redeploy.

### If the import still fails

- **Repo root must contain `package.json` and `vercel.json` directly** — not
  nested inside a subfolder (a common issue when uploading an extracted zip).
  If your repo has this project inside a subfolder, set that folder as the
  **Root Directory** in Project Settings → General.
- If Vercel shows a *different* build error (not about `vercel.json`), it's
  almost always one of: wrong Node version (this project needs Node ≥18 —
  check Project Settings → General → Node.js Version), or a stale cached
  "Framework Preset" from an earlier failed import (Project Settings →
  General → Framework Preset → set to **Other**, matching `framework: null`
  above).
- `npm install` / `npm run build` succeed cleanly in a fresh clone of this repo
  (verified) — if Vercel's build log shows something else, paste that exact
  log line and it's fixable in seconds.

## Structure

```
index.html            home
discography.html      full discography + Spotify players
booking.html           organizer info + booking form
src/style.css          shared design tokens/styles
src/shared.js          cursor, preloader, page transitions, Lenis, GSAP reveals
src/lib/supabaseClient.js
src/pages/home.js       hero canvas, releases/tour preview
src/pages/discography.js
src/pages/booking.js    form -> Supabase insert, mailto fallback
supabase/schema.sql     tables + RLS + seed data
```

## Editing content without touching code

- **New release**: insert a row into `releases` (Supabase Table Editor) with the
  Spotify album ID from its `open.spotify.com/album/<ID>` URL.
- **New tour date**: insert a row into `tour_dates`.
- **Booking leads**: `booking_requests` table, or wire a Supabase Edge Function /
  Zapier integration on insert to notify Slack/email.
