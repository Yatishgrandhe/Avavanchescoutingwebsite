# Authentication Setup Guide

## 🚨 **CRITICAL: Set Up NextAuth Tables in Supabase**

The authentication loop issue is caused by missing NextAuth tables in your Supabase database. Follow these steps:

### **Step 1: Create NextAuth Tables in Supabase**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `ylzahxkfmklwcgkogeff`
3. Go to **SQL Editor**
4. Copy and paste the contents of `setup-nextauth-tables.sql` into the SQL editor
5. Click **Run** to execute the SQL

This will create the required tables:
- `users` - Stores user information
- `accounts` - Stores OAuth account information
- `sessions` - Stores user sessions
- `verification_tokens` - Stores verification tokens

### **Step 2: Verify Discord OAuth Configuration**

Make sure your Discord application has the correct redirect URI:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (ID: `1410224475592720499`)
3. Go to **OAuth2** → **General**
4. Ensure this redirect URI is added:
   ```
   http://localhost:3000/api/auth/callback/discord
   ```

### **Step 3: Test Authentication**

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000`
3. Click "Login" or "Sign in with Discord"
4. Complete Discord OAuth
5. You should be redirected back to the homepage and logged in

## 🔧 **What Was Fixed**

1. **Session Strategy**: Changed from `jwt` to `database` to work with Supabase adapter
2. **Redirect Callback**: Added proper redirect handling
3. **Database Tables**: Created SQL script for required NextAuth tables
4. **Environment Variables**: All properly configured

## 🐛 **Troubleshooting**

### **Still Getting Redirect Loop?**
- Check browser console for errors
- Verify NextAuth tables were created in Supabase
- Ensure Discord redirect URI is exactly: `http://localhost:3000/api/auth/callback/discord`

### **User Not Saved to Database?**
- Check Supabase logs for any errors
- Verify the `users` table was created
- Check that RLS policies are properly set

### **Discord OAuth Errors?**
- Verify client ID and secret in `.env.local`
- Check Discord application settings
- Ensure redirect URI matches exactly

## 📋 **Current Configuration**

- **Supabase URL**: `https://ylzahxkfmklwcgkogeff.supabase.co`
- **Discord Client ID**: `1410224475592720499`
- **Session Strategy**: `database`
- **Redirect URI**: `http://localhost:3000/api/auth/callback/discord`

## ✅ **Expected Behavior After Fix**

1. User clicks "Sign in with Discord"
2. Redirected to Discord OAuth
3. User authorizes the application
4. Redirected back to your app
5. User is logged in and redirected to homepage
6. User data is saved in Supabase database

The authentication should now work properly without redirect loops!
