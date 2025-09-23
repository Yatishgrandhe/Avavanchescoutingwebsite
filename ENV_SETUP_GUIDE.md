# Environment Variables Setup Guide

To fix the Discord OAuth authentication issue, you need to create a `.env.local` file in your project root with the following variables:

## Required Environment Variables

Create a file named `.env.local` in your project root directory (`C:\Users\yatis\Downloads\scoutingWebsite\`) with the following content:

```env
# Discord OAuth Configuration
DISCORD_CLIENT_ID=1410224475592720499
DISCORD_CLIENT_SECRET=z5hdVYza8753QdjB0FBmyNtSTfYxTiH3

# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_nextauth_secret_key_here

# Supabase Configuration (optional for now)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Steps to Fix Authentication

1. **Create the `.env.local` file** with the content above
2. **Generate a NEXTAUTH_SECRET**: You can use any long random string, or generate one using:
   - Online generator: https://generate-secret.vercel.app/32
   - Or use: `openssl rand -base64 32` in terminal
3. **Restart your development server**:
   ```bash
   npm run dev
   ```

## What Was Fixed

- **Switched from database to JWT strategy**: This eliminates the need for Supabase adapter temporarily
- **Updated session callback**: Now works with JWT tokens instead of database users
- **Simplified redirect logic**: Redirects to home page after successful login
- **Removed Supabase adapter**: Temporarily disabled to isolate the authentication issue

## Testing

After creating the `.env.local` file and restarting the server:

1. Go to `http://localhost:3001`
2. Click "Login with Discord"
3. Authorize the application
4. You should be redirected back to the home page and see your Discord profile

## Next Steps

Once authentication is working:
1. We can re-enable the Supabase adapter
2. Set up the database tables for user storage
3. Implement the full scouting functionality

The authentication should now work properly without redirecting back to the login page.
