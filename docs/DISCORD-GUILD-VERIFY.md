# Discord Guild Verification (No Bot)

Guild membership is checked using **the user's own Discord OAuth token** and the [Discord API `GET /users/@me/guilds`](https://discord.com/developers/docs/resources/user#get-current-user-guilds). **No Discord bot or bot token is required.**

## Flow

1. **Sign-in** requests the `guilds` scope: `identify email guilds` (see `pages/auth/signin.tsx`).
2. After Discord OAuth, Supabase creates the user and the **auth callback** (`pages/auth/callback.tsx`) runs.
3. The callback sends `session.provider_token` (Discord access token) to **`POST /api/verify-guild`**.
4. **`/api/verify-guild`**:
   - Validates the Supabase JWT and gets the user.
   - Calls `GET https://discord.com/api/v10/users/@me/guilds` with `Authorization: Bearer <provider_token>`.
   - If the Avalanche guild ID is in the list → `{ inGuild: true }`.
   - If not → deletes the user with `auth.admin.deleteUser`, returns `{ inGuild: false }`.
5. The callback: if `inGuild` is false, signs out and redirects to `/auth/error` with the Avalanche message.

## Requirements

- **Discord OAuth `guilds` scope** so `/users/@me/guilds` works. This is set in `signInWithOAuth` options.
- **Supabase**: `SUPABASE_SERVICE_ROLE_KEY` for `auth.admin.deleteUser` in the API.
- **Optional**: `AVALANCHE_GUILD_ID` (default `1241008226598649886`).

## Disable the old Auth Hook

If you previously used the **Before User Created** hook with the `check-avalanche-guild` Edge Function:

1. Supabase Dashboard → **Authentication** → **Hooks**
2. Find **Before User Created**
3. **Disable** it and clear the HTTP URL (or remove the hook).

You can also remove the `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` secrets from Edge Functions; they are no longer used.
