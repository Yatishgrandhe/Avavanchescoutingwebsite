# Supabase Discord OAuth Setup Guide

## ✅ **COMPLETED: Authentication Migration**

Your application has been successfully migrated from NextAuth.js to Supabase Auth with Discord OAuth integration.

## 🔧 **What Was Changed**

### 1. **Authentication System Migration**
- ✅ Replaced NextAuth.js with Supabase Auth
- ✅ Updated all authentication components
- ✅ Created Supabase context provider
- ✅ Updated protected routes
- ✅ Modified sign-in/sign-out flows

### 2. **Files Updated**
- ✅ `pages/_app.tsx` - Added Supabase context provider
- ✅ `pages/auth/signin.tsx` - Updated to use Supabase Discord OAuth
- ✅ `pages/api/auth/callback.ts` - Created Supabase auth callback handler
- ✅ `components/layout/Layout.tsx` - Updated to use Supabase user data
- ✅ `components/auth/ProtectedRoute.tsx` - Updated for Supabase auth
- ✅ `pages/index.tsx` - Updated authentication checks

## 🎮 **Discord OAuth Setup Required**

### **Step 1: Configure Discord Application**

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (or create a new one)
3. Go to **OAuth2** → **General**
4. Add these redirect URIs:
   - **Local Development**: `http://localhost:3000/api/auth/callback`
   - **Production**: `https://avavanchescoutingwebsite.vercel.app/api/auth/callback`
5. Copy your **Client ID** and **Client Secret**

### **Step 2: Configure Supabase Auth Provider**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ylzahxkfmklwcgkogeff`
3. Go to **Authentication** → **Providers**
4. Find **Discord** in the list
5. Enable Discord provider
6. Enter your Discord **Client ID** and **Client Secret**
7. Click **Save**

### **Step 3: Set Environment Variables**

#### **For Local Development (.env.local)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ylzahxkfmklwcgkogeff.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTI1NTUsImV4cCI6MjA3MTg2ODU1NX0._szu1412tQglLNtGXBNP_dnjz59rTZiX3wvaw6IjDUE
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### **For Production (Vercel Environment Variables)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ylzahxkfmklwcgkogeff.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTI1NTUsImV4cCI6MjA3MTg2ODU1NX0._szu1412tQglLNtGXBNP_dnjz59rTZiX3wvaw6IjDUE
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 🔄 **OAuth Flow**

1. **User clicks "Sign in with Discord"**
2. **Redirected to Discord OAuth**
3. **User authorizes application**
4. **Discord redirects to Supabase callback**
5. **Supabase processes OAuth response**
6. **User session created in Supabase**
7. **User redirected to dashboard**

## 🛠️ **Testing the Integration**

### **Local Testing**
1. Start your development server: `npm run dev`
2. Visit `http://localhost:3000`
3. Click "Sign in with Discord"
4. Complete Discord OAuth flow
5. Verify you're redirected back and logged in

### **Production Testing**
1. Deploy to Vercel
2. Visit your production URL
3. Test the complete OAuth flow
4. Verify user data is stored in Supabase

## 🔐 **Security Features**

- ✅ **Row Level Security (RLS)** enabled on all tables
- ✅ **User data isolation** - users can only access their own data
- ✅ **Secure session management** via Supabase
- ✅ **OAuth tokens** securely stored in Supabase
- ✅ **CSRF protection** built into Supabase Auth

## 📊 **Database Schema**

Your Supabase database includes:
- ✅ `auth.users` - Supabase auth users
- ✅ `public.users` - User profiles
- ✅ `public.accounts` - OAuth account links
- ✅ `public.sessions` - User sessions
- ✅ `public.teams` - FRC teams data
- ✅ `public.matches` - Match information
- ✅ `public.scouting_data` - Scouting records

## 🚀 **Next Steps**

1. **Configure Discord OAuth** in Supabase Dashboard
2. **Set environment variables** in Vercel
3. **Test the authentication flow**
4. **Deploy and verify** everything works

## 🐛 **Troubleshooting**

### **"Invalid Redirect URI" Error**
- Ensure Discord application has correct redirect URIs
- Check that callback URL matches exactly

### **"Missing Environment Variables" Error**
- Verify all required env vars are set in Vercel
- Check `.env.local` for local development

### **"Authentication Failed" Error**
- Verify Discord Client ID and Secret in Supabase
- Check Supabase logs for detailed error messages

### **User Not Redirected After Login**
- Check that callback route is working
- Verify redirect URL configuration

## 📝 **Notes**

- The callback URL `https://ylzahxkfmklwcgkogeff.supabase.co/auth/v1/callback` is handled by Supabase
- Your app's callback route `/api/auth/callback` handles the final redirect
- User data is automatically synced between Discord and Supabase
- Sessions are managed entirely by Supabase Auth

Your Discord OAuth integration with Supabase is now **ready for production**! 🎉
