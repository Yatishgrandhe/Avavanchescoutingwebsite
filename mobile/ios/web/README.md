# Avalanche Scouting – Web App (HTML/CSS/JS)

This folder is a **full HTML/CSS/JS version** of the Avalanche Scouting app, with the same styling and features as the website.

## Contents

- **index.html** – Single entry; loads styles and app.
- **styles.css** – Avalanche theme (navy `#0D1445`, blue `#1A2B7C`, orange accent), aligned with the website.
- **app.js** – Supabase auth, Discord OAuth, guild verification, hash router, and all pages.
- **image.png** – Avalanche logo (same as `../image.png` and website `public/image.png`).

## Pages

- **Login** – Sign in with Discord; redirects to Supabase OAuth. After callback, verifies Avalanche guild via `/api/verify-guild`.
- **Dashboard** – Stats (matches, teams, data points, coverage), quick actions, recent activity, teams list.
- **Scout** – Match scouting form (team, match ID, alliance, auto/teleop/endgame, notes); submits to `scouting_data`.
- **Analysis** – Teams tab (aggregate stats) and Data tab (scouting_data list with search).
- **Team detail** – Match history; link to Team history.
- **Team history** – Past competitions for a team (`past_teams` / `past_competitions`).
- **Pit Scouting** – Form with team, robot name, drive type, **robot image upload** (file input → `POST /api/upload-robot-image`), notes; saves to `pit_scouting_data` with `robot_image_url` and `photos`.
- **Pit Data** – List of pit records with thumbnails from `robot_image_url`; tap for detail.
- **Pit detail** – Single pit record with full-size image and fields.
- **Pick List** – List from `GET /api/pick-lists` (Bearer token).
- **Past Competitions** – List from `GET /api/past-competitions`; tap for detail.
- **Learn Game** – Static content (overview, scoring, rules).
- **Auth error** – Shown when guild check fails; “Back to Login”.

## How to run

1. **Served over HTTP (recommended for login)**  
   OAuth redirect must point to this app. Serve this folder from the **same origin** as your API (e.g. `https://avalanchescouting.vercel.app/mobile/` or a path under it), or run a local server and add that URL to Supabase Redirect URLs.

   - Local: from repo root,  
     `npx serve mobile/ios/web -p 3001`  
     then add `http://localhost:3001` (or your URL) to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.
   - Vercel: deploy the `web` folder (e.g. as `mobile` or `app`) so the app is at `https://avalanchescouting.vercel.app/mobile/` (or similar). Use that full URL (including `index.html#/dashboard`) as the redirect URL in Supabase and in the app’s `getRedirectUrl()`.

2. **Open index.html directly**  
   Works for navigation and data, but **Discord login will not work** (redirect would go to `file://`). Use a local or deployed server for full auth.

## Config

- Supabase URL and anon key are in `app.js` (CONFIG). API base is `https://avalanchescouting.vercel.app`.
- Guild verification uses `POST /api/verify-guild` with Bearer (Supabase JWT) and `providerToken` (Discord OAuth token).
- Robot image upload uses `POST /api/upload-robot-image` (multipart: `image`, `teamNumber`, `teamName`). The API uses Google Drive as primary and Supabase Storage bucket `robot-images` as backup.

## Styling

Matches the website: background `#0D1445`, cards `#1A2B7C`, primary blue, Discord blue `#5865F2`, orange accent, Inter/Poppins fonts, same card/button/form styles.
