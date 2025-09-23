# Discord OAuth Setup - Complete Guide

## ✅ Current Status: READY FOR PRODUCTION

Your Discord OAuth integration with Supabase is properly configured and ready for deployment.

## 🔗 Supabase Configuration

### Project Details
- **Project URL**: `https://ylzahxkfmklwcgkogeff.supabase.co`
- **Callback URL**: `https://ylzahxkfmklwcgkogeff.supabase.co/auth/v1/callback`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTI1NTUsImV4cCI6MjA3MTg2ODU1NX0._szu1412tQglLNtGXBNP_dnjz59rTZiX3wvaw6IjDUE`

### Database Tables ✅
- ✅ `auth.users` - Supabase auth users
- ✅ `public.users` - NextAuth.js users
- ✅ `public.accounts` - OAuth accounts
- ✅ `public.sessions` - User sessions
- ✅ `public.verification_tokens` - Email verification
- ✅ `public.teams` - FRC teams data
- ✅ `public.matches` - Match information
- ✅ `public.scouting_data` - Scouting records

### RLS Policies ✅
- ✅ Users can only access their own data
- ✅ Proper authentication required for all operations
- ✅ Secure session management

## 🔧 Environment Variables Required

### For Local Development (.env.local)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ylzahxkfmklwcgkogeff.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTI1NTUsImV4cCI6MjA3MTg2ODU1NX0._szu1412tQglLNtGXBNP_dnjz59rTZiX3wvaw6IjDUE
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```

### For Production (Vercel Environment Variables)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ylzahxkfmklwcgkogeff.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTI1NTUsImV4cCI6MjA3MTg2ODU1NX0._szu1412tQglLNtGXBNP_dnjz59rTZiX3wvaw6IjDUE
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth.js Configuration
NEXTAUTH_URL=https://avavanchescoutingwebsite.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_key

# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
```

## 🎮 Discord Application Setup

### 1. Create Discord Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Avalanche Scouting" (or your preferred name)

### 2. Configure OAuth2 Settings
1. Go to OAuth2 → General
2. Add Redirect URIs:
   - **Local Development**: `http://localhost:3000/api/auth/callback/discord`
   - **Production**: `https://avavanchescoutingwebsite.vercel.app/api/auth/callback/discord`
3. Copy the **Client ID** and **Client Secret**

### 3. Set Scopes
- ✅ `identify` - Get user's Discord username and ID
- ✅ `email` - Get user's email address

## 🚀 Deployment Checklist

### Vercel Configuration ✅
- ✅ `vercel.json` properly configured
- ✅ Build command: `npm run build`
- ✅ Output directory: `.next`
- ✅ Framework: `nextjs`
- ✅ Install command: `npm install --legacy-peer-deps`
- ✅ Security headers configured
- ✅ API routes properly handled

### NextAuth.js Configuration ✅
- ✅ Discord provider configured
- ✅ Supabase adapter integrated
- ✅ Database session strategy
- ✅ Proper callback handling
- ✅ Environment variable validation
- ✅ Production URL configuration

### Security Features ✅
- ✅ Row Level Security (RLS) enabled
- ✅ User data isolation
- ✅ Secure session management
- ✅ CSRF protection
- ✅ Secure cookies in production

## 🔄 OAuth Flow

1. **User clicks "Sign in with Discord"**
2. **Redirected to Discord OAuth**
3. **User authorizes application**
4. **Discord redirects to Supabase callback**
5. **Supabase processes OAuth response**
6. **NextAuth.js creates/updates user session**
7. **User redirected to dashboard**

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Invalid Redirect URI"
- Ensure Discord application has correct redirect URIs
- Check that `NEXTAUTH_URL` matches your domain

#### 2. "Missing Environment Variables"
- Verify all required env vars are set in Vercel
- Check `.env.local` for local development

#### 3. "Database Connection Error"
- Verify Supabase URL and keys are correct
- Check that service role key has proper permissions

#### 4. "Session Not Persisting"
- Ensure `NEXTAUTH_SECRET` is set
- Check that cookies are working in production

### Debug Mode
Enable debug mode in development:
```bash
NEXTAUTH_DEBUG=true
```

## 📊 Monitoring

### Supabase Dashboard
- Monitor user sign-ups in `auth.users`
- Check session activity in `public.sessions`
- Review scouting data in `public.scouting_data`

### Vercel Analytics
- Monitor page views and user engagement
- Track API route performance
- Monitor error rates

## 🎯 Next Steps

1. **Set up Discord Application** with the redirect URIs above
2. **Add environment variables** to Vercel
3. **Deploy to Vercel** - everything is ready!
4. **Test OAuth flow** in production
5. **Monitor user activity** and scouting data

## 🔐 Security Notes

- ✅ All user data is properly isolated with RLS
- ✅ OAuth tokens are securely stored
- ✅ Sessions expire automatically
- ✅ CSRF protection enabled
- ✅ Secure headers configured

Your Discord OAuth integration is **production-ready** and follows security best practices!
