# Discord OAuth Setup Guide

This guide will help you set up Discord OAuth authentication for your Avalanche Scouting website.

## 1. Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give your application a name (e.g., "Avalanche Scouting")
4. Click "Create"

## 2. Configure OAuth2 Settings

1. In your Discord application, go to the "OAuth2" section
2. Click "General"
3. Add the following redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/discord`
   - For production: `https://your-domain.vercel.app/api/auth/callback/discord`

## 3. Get Your Credentials

1. In the "OAuth2" > "General" section, copy your:
   - **Client ID**
   - **Client Secret** (click "Reset Secret" if needed)

## 4. Set Environment Variables

### For Local Development:
Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```

### For Vercel Deployment:
1. Go to your Vercel project dashboard
2. Navigate to "Settings" > "Environment Variables"
3. Add the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_URL` (set to your production domain)
   - `NEXTAUTH_SECRET`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`

## 5. Supabase Database Setup

Make sure your Supabase database has the required tables for NextAuth:

```sql
-- Users table (created by NextAuth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT UNIQUE,
  email_verified TIMESTAMP WITH TIME ZONE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table (created by NextAuth)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Sessions table (created by NextAuth)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verification tokens table (created by NextAuth)
CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 6. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000/auth/signin`
3. Click "Sign in with Discord"
4. You should be redirected to Discord for authentication
5. After successful authentication, you'll be redirected back to your app

## 7. Troubleshooting

### Common Issues:

1. **"Invalid redirect URI"**: Make sure the redirect URI in Discord matches exactly what's in your environment variables
2. **"Invalid client secret"**: Double-check your Discord client secret
3. **Database errors**: Ensure your Supabase database has the required NextAuth tables
4. **CORS issues**: Make sure your NEXTAUTH_URL is set correctly for your environment

### Debug Mode:
Set `NEXTAUTH_DEBUG=true` in your environment variables to enable debug logging.

## 8. Security Notes

- Never commit your `.env.local` file to version control
- Use strong, unique values for `NEXTAUTH_SECRET`
- Regularly rotate your Discord client secret
- Use HTTPS in production
- Set up proper CORS policies in your Supabase project
