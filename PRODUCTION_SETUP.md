# Production Setup Guide

## 🚀 **For Production Deployment on Vercel**

### **Step 1: Configure Environment Variables in Vercel**

Go to your [Vercel Dashboard](https://vercel.com/dashboard) and add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://ylzahxkfmklwcgkogeff.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTI1NTUsImV4cCI6MjA3MTg2ODU1NX0._szu1412tQglLNtGXBNP_dnjz59rTZiX3wvaw6IjDUE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI5MjU1NSwiZXhwIjoyMDcxODY4NTU1fQ.yk0g0T6cSknpUFLhsGkTdh4uL_0hYZZaTjECDawB-wk
NEXTAUTH_URL=https://avavanchescoutingwebsite.vercel.app
NEXTAUTH_SECRET=rHMAF58pvSmS77+3/CBeIWrpCdd111+g/oYKcO/yQag=
DISCORD_CLIENT_ID=1410224475592720499
DISCORD_CLIENT_SECRET=nwGyWLIxWyo8vHcxjwdM_1lZbVFiR60F
```

### **Step 2: Configure Discord OAuth for Production**

In your [Discord Developer Portal](https://discord.com/developers/applications):

1. Go to **OAuth2** → **General**
2. Add these redirect URIs:
   - **Development**: `http://localhost:3000/api/auth/callback/discord`
   - **Production**: `https://avavanchescoutingwebsite.vercel.app/api/auth/callback/discord`

### **Step 3: Deploy to Vercel**

```bash
# Deploy to production
vercel --prod
```

## 🔧 **What Was Fixed**

1. **NextAuth Configuration**: Updated to handle both local and production environments
2. **Secure Cookies**: Enabled for production
3. **Redirect Handling**: Improved callback URL handling
4. **Environment Variables**: Properly configured for production

## ✅ **Expected Behavior**

1. User visits `https://avavanchescoutingwebsite.vercel.app`
2. Clicks "Login" or "Sign in with Discord"
3. Redirected to Discord OAuth
4. User authorizes the application
5. Redirected back to the homepage and logged in
6. User data saved to Supabase database

## 🐛 **Troubleshooting**

### **Still Getting Redirect Loop?**
- Check that all environment variables are set in Vercel
- Verify Discord redirect URI includes both local and production URLs
- Check Vercel function logs for any errors

### **Authentication Not Working?**
- Ensure NextAuth tables exist in Supabase (already created)
- Verify Discord client ID and secret are correct
- Check that `NEXTAUTH_URL` matches your production domain exactly

The authentication should now work properly for both local development and production deployment!
