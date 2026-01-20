# Check Avalanche Guild Edge Function

This Edge Function verifies that users signing up are members of the Avalanche Discord server (Guild ID: 1241008226598649886).

## Setup Instructions

### 1. Deploy the Function

You have two options:

#### Option A: Using Supabase CLI (Recommended)
```bash
# The Supabase CLI is already installed at ~/.local/bin/supabase
# Add it to your PATH (add this to your ~/.zshrc or ~/.bashrc):
export PATH="$HOME/.local/bin:$PATH"

# Login to Supabase (opens browser for authentication)
supabase login

# Link to your project
supabase link --project-ref ylzahxkfmklwcgkogeff

# Deploy the function WITHOUT JWT verification (required for Auth Hooks)
supabase functions deploy check-avalanche-guild --no-verify-jwt

# Or use the deployment script:
./deploy-function.sh
```

#### Option B: Using Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to: **Edge Functions** > **Create a new function**
3. Name it: `check-avalanche-guild`
4. Copy the contents of `index.ts` into the function editor
5. **IMPORTANT:** Before deploying, make sure **"Enforce JWT verification"** is **DISABLED** (unchecked)
   - Auth Hooks use system-level signatures, not standard JWTs
   - If JWT verification is enabled, you'll get "Hook requires authorization token" error
6. Click **Deploy**

### 2. Set Environment Variables

You need to set the Discord Bot Token as a secret:

#### Using Supabase CLI:
```bash
supabase secrets set DISCORD_BOT_TOKEN=your-discord-bot-token
supabase secrets set DISCORD_GUILD_ID=1241008226598649886
# Note: Auth hook secret is set in Auth Hook configuration, not as an Edge Function secret
```

#### Using Supabase Dashboard:
1. Go to: **Project Settings** > **Edge Functions** > **Secrets**
2. Add secret: `DISCORD_BOT_TOKEN` = your Discord bot token
3. Add secret: `DISCORD_GUILD_ID` = 1241008226598649886
   - Note: The auth hook secret is set in Step 5 (Auth Hook configuration), NOT here

### 3. Get Discord Bot Token

1. Go to https://discord.com/developers/applications
2. Select your Discord application (or create a new one)
3. Go to **Bot** section
4. Click **Reset Token** or **Copy** to get your bot token
5. Make sure the bot has the following permissions:
   - **Read Members** (or **View Server Members**)
   - **Read Guilds** (optional, for user token method)

### 4. Invite Bot to Discord Server

1. In Discord Developer Portal, go to **OAuth2** > **URL Generator**
2. Select scopes: `bot`
3. Select bot permissions: `Read Members` (or `View Server Members`)
4. Copy the generated URL and open it in your browser
5. Select your Avalanche Discord server and authorize the bot

### 5. Configure the Auth Hook

1. Go to Supabase Dashboard: **Authentication** > **Hooks**
2. Find **Before User Created** hook
3. Enable it
4. Set the URL to:
   ```
   https://ylzahxkfmklwcgkogeff.supabase.co/functions/v1/check-avalanche-guild
   ```
5. **Set the Secret** (REQUIRED - Standard Webhooks format):
   - In the "Secret" field, enter this EXACT value:
   ```
   v1,whsec_rDpsc0wRaT2Th18OWNg+/AAMPwVeHfiZhoxmeC76wUc=
   ```
   - This follows the Standard Webhooks format: `v1,whsec_<base64_encoded_secret>`
   - Supabase will automatically verify this secret before calling your function
6. Save the configuration

## How It Works

1. When a user tries to sign up with Discord OAuth, the hook is triggered
2. The function extracts the Discord user ID from the OAuth metadata
3. It checks if the user is a member of the Avalanche Discord server (ID: 1241008226598649886)
4. If the user is a member, user creation is allowed (returns 200)
5. If the user is NOT a member, user creation is blocked (returns 403)

## Testing

### Test Locally (if you have Supabase CLI):
```bash
# Start local Supabase
supabase start

# Serve the function locally
supabase functions serve check-avalanche-guild --env-file .env.local
```

### Test in Production:
1. Try signing up with a Discord account that is NOT in the Avalanche server
2. You should see an error: "You must be a member of the Avalanche Discord server to sign up"
3. Join the Avalanche Discord server
4. Try signing up again - it should work

## Troubleshooting

- **"Hook requires authorization token" Error**: 
  - The Edge Function has JWT verification enabled, but Auth Hooks don't use standard JWTs
  - **Fix:** Go to Edge Functions > check-avalanche-guild > Settings, and disable "Enforce JWT verification"
  - Or redeploy with: `supabase functions deploy check-avalanche-guild --no-verify-jwt`
- **403 Error**: User is not a member of the Discord server
- **400 Error**: No Discord user ID found (user didn't sign in with Discord)
- **500 Error**: Check function logs in Supabase Dashboard > Edge Functions > Logs
- **404 Error**: Edge Function not deployed or wrong URL in Auth Hook configuration

## Notes

- The function uses two methods to check membership:
  1. User's OAuth token (if available)
  2. Bot token (more reliable, recommended)
- If `DISCORD_BOT_TOKEN` is not set, the function will allow all users (with a warning in logs)
- Make sure your Discord bot is in the Avalanche server and has proper permissions
