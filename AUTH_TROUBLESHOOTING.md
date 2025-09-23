# Authentication Troubleshooting Guide

## "Authentication Error: There is a problem with the server configuration"

This error typically occurs when NextAuth.js is missing required environment variables or has configuration issues.

## Step 1: Check Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```

## Step 2: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Get Your Discord OAuth Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to **OAuth2** → **General**
4. Copy:
   - **Client ID** → `DISCORD_CLIENT_ID`
   - **Client Secret** → `DISCORD_CLIENT_SECRET`

## Step 4: Generate NextAuth Secret

Generate a random secret for `NEXTAUTH_SECRET`:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 5: Configure Discord Redirect URI

In your Discord application settings, add these redirect URIs:

- **Development**: `http://localhost:3000/api/auth/callback/discord`
- **Production**: `https://your-domain.vercel.app/api/auth/callback/discord`

## Step 6: Test the Configuration

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Check the console for any error messages about missing environment variables

3. Try to sign in with Discord

## Common Issues and Solutions

### Issue 1: "Missing required environment variables"
**Solution**: Make sure all environment variables are set in `.env.local`

### Issue 2: "Invalid redirect URI"
**Solution**: Check that your Discord redirect URI matches exactly:
- `http://localhost:3000/api/auth/callback/discord` (development)
- `https://your-domain.vercel.app/api/auth/callback/discord` (production)

### Issue 3: "Invalid client secret"
**Solution**: 
- Double-check your Discord client secret
- Make sure there are no extra spaces or characters
- Regenerate the client secret if needed

### Issue 4: "Supabase connection error"
**Solution**:
- Verify your Supabase URL and keys are correct
- Check that your Supabase project is active
- Ensure the service role key has proper permissions

### Issue 5: "NEXTAUTH_SECRET is not set"
**Solution**: Generate a random secret and add it to your `.env.local` file

## Testing Your Setup

1. **Check Environment Variables**:
   ```bash
   # In your terminal, run:
   node -e "console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? 'SET' : 'MISSING')"
   ```

2. **Test Discord OAuth**:
   - Go to `http://localhost:3000/auth/signin`
   - Click "Sign in with Discord"
   - You should be redirected to Discord

3. **Check Browser Console**:
   - Open browser developer tools
   - Look for any error messages in the console

## Production Deployment

For Vercel deployment, add these environment variables in your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add all the variables from your `.env.local` file
4. Update `NEXTAUTH_URL` to your production domain

## Still Having Issues?

1. Check the browser console for specific error messages
2. Check the server console for NextAuth debug information
3. Verify all environment variables are correctly set
4. Ensure your Discord application is properly configured
5. Make sure your Supabase project is active and accessible

## Quick Fix Commands

```bash
# Restart development server
npm run dev

# Check if .env.local exists
ls -la .env.local

# Generate new NextAuth secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
