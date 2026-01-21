# Complete Setup Verification Guide for Discord Guild Auth Hook

## Step-by-Step Verification Checklist

### ✅ Step 1: Verify Edge Function is Deployed

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Look for `check-avalanche-guild` in the list
3. **If it's NOT there:**
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   supabase login
   supabase link --project-ref ylzahxkfmklwcgkogeff
   supabase functions deploy check-avalanche-guild --no-verify-jwt
   ```

4. **If it IS there:**
   - Click on `check-avalanche-guild`
   - Go to **Settings** tab
   - **VERIFY:** "Enforce JWT verification" is **DISABLED** (unchecked)
   - If it's enabled, you need to redeploy with `--no-verify-jwt` flag

### ✅ Step 2: Verify Environment Variables (Secrets)

1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. **VERIFY these secrets exist:**
   - `DISCORD_BOT_TOKEN` = (your actual Discord bot token)
   - `DISCORD_GUILD_ID` = `1241008226598649886`

3. **If missing, add them:**
   ```bash
   export PATH="$HOME/.local/bin:$PATH"
   supabase secrets set DISCORD_BOT_TOKEN="your-actual-discord-bot-token"
   supabase secrets set DISCORD_GUILD_ID=1241008226598649886
   ```

### ✅ Step 3: Verify Auth Hook Configuration (MOST IMPORTANT)

1. Go to **Authentication** → **Hooks**
2. Find **"Before User Created"** hook
3. **VERIFY these settings:**

   **a) Hook Status:**
   - ✅ **ENABLED** (toggle should be ON)

   **b) URL:**
   - Must be EXACTLY:
   ```
   https://ylzahxkfmklwcgkogeff.supabase.co/functions/v1/check-avalanche-guild
   ```
   - No trailing slashes
   - No extra spaces
   - Must match your project reference

   **c) Secret:**
   - Must be EXACTLY:
   ```
   v1,whsec_rDpsc0wRaT2Th18OWNg+/AAMPwVeHfiZhoxmeC76wUc=
   ```
   - Copy and paste exactly (no spaces before/after)
   - Must start with `v1,whsec_`

4. **Click "Save"** after making any changes

### ✅ Step 4: Verify Discord Bot Setup

1. Go to https://discord.com/developers/applications
2. Select your Discord application
3. **Verify Bot is in your server:**
   - Go to **OAuth2** → **URL Generator**
   - Select scopes: `bot`
   - Select permissions: `Read Members` or `View Server Members`
   - Copy URL and open in browser
   - Select Avalanche server and authorize

4. **Verify Bot Token:**
   - Go to **Bot** section
   - Copy the token
   - Make sure it matches what you set in Supabase secrets

### ✅ Step 5: Test the Hook is Being Called

1. Go to **Edge Functions** → `check-avalanche-guild` → **Logs**
2. Try to sign in with a Discord account (even one not in the server)
3. **Check the logs immediately:**
   - You should see: "Before User Created Hook triggered"
   - If you DON'T see this, the hook is NOT being called
   - This means the hook configuration is wrong

### ✅ Step 6: Common Issues and Fixes

**Issue: Hook not being called at all**
- ✅ Check hook is ENABLED
- ✅ Check URL is exactly correct
- ✅ Check secret is exactly correct
- ✅ Try disabling and re-enabling the hook

**Issue: "Hook requires authorization token" error**
- ✅ Function has JWT verification enabled
- ✅ Fix: Redeploy with `--no-verify-jwt` flag
- ✅ Or disable in Dashboard → Edge Functions → Settings

**Issue: Everyone can still login**
- ✅ Check Edge Function logs - is it being called?
- ✅ Check if DISCORD_BOT_TOKEN is set correctly
- ✅ Check if bot is actually in the Discord server
- ✅ Check if bot has "Read Members" permission

**Issue: Function returns 500 error**
- ✅ Check DISCORD_BOT_TOKEN is valid
- ✅ Check bot is in the server
- ✅ Check bot has proper permissions
- ✅ Check Edge Function logs for specific error

### ✅ Step 7: Force Redeploy Everything

If nothing works, force a complete redeploy:

```bash
export PATH="$HOME/.local/bin:$PATH"

# 1. Login
supabase login

# 2. Link project
supabase link --project-ref ylzahxkfmklwcgkogeff

# 3. Deploy function (with --no-verify-jwt)
supabase functions deploy check-avalanche-guild --no-verify-jwt

# 4. Set secrets (replace with your actual token)
supabase secrets set DISCORD_BOT_TOKEN="your-actual-discord-bot-token"
supabase secrets set DISCORD_GUILD_ID=1241008226598649886

# 5. Verify secrets are set
supabase secrets list
```

Then in Dashboard:
1. Go to **Authentication** → **Hooks** → **Before User Created**
2. **Disable** the hook
3. **Save**
4. **Enable** the hook again
5. Set URL: `https://ylzahxkfmklwcgkogeff.supabase.co/functions/v1/check-avalanche-guild`
6. Set Secret: `v1,whsec_rDpsc0wRaT2Th18OWNg+/AAMPwVeHfiZhoxmeC76wUc=`
7. **Save**

### ✅ Step 8: Test with Non-Guild Member

1. Use a Discord account that is **NOT** in the Avalanche server
2. Try to sign in
3. **Expected result:** Should see error: "You're not in the Avalanche server..."
4. **If they can still login:** The hook is not working - check logs

## Quick Verification Commands

```bash
# Check if function is deployed
supabase functions list

# Check secrets
supabase secrets list

# View function logs (real-time)
supabase functions logs check-avalanche-guild --follow
```

## Still Not Working?

1. Check **Edge Function Logs** in Dashboard - this will show if the function is being called
2. Check **Auth Logs** in Dashboard → Authentication → Logs
3. Verify the hook URL is accessible (should return JSON when called)
4. Make sure you're testing with a **NEW** Discord account (not one that already exists in your database)
