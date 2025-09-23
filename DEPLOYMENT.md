# Vercel Deployment Guide for Avalanche Scouting Data

## Prerequisites
- GitHub repository: https://github.com/Yatishgrandhe/Avavanchescoutingwebsite
- Vercel account
- Supabase project configured

## Deployment Steps

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with your GitHub account
3. Click "New Project"
4. Import the repository: `Yatishgrandhe/Avavanchescoutingwebsite`

### 2. Configure Environment Variables
In the Vercel dashboard, add these environment variables:

#### Required Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://ylzahxkfmklwcgkogeff.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyOTI1NTUsImV4cCI6MjA3MTg2ODU1NX0._szu1412tQglLNtGXBNP_dnjz59rTZiX3wvaw6IjDUE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsemFoeGtmbWtsd2Nna29nZWZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI5MjU1NSwiZXhwIjoyMDcxODY4NTU1fQ.yk0g0T6cSknpUFLhsGkTdh4uL_0hYZZaTjECDawB-wk
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-random-secret-key-here
DISCORD_CLIENT_ID=1410224475592720499
DISCORD_CLIENT_SECRET=z5hdVYza8753QdjB0FBmyNtSTfYxTiH3
```

#### Optional Environment Variables:
```
TBA_API_KEY=your_tba_api_key_here
```

### 3. Build Configuration
- **Framework Preset**: Next.js
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 4. Deploy
1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at: `https://your-app-name.vercel.app`

### 5. Update NEXTAUTH_URL
After deployment, update the `NEXTAUTH_URL` environment variable in Vercel to match your actual deployment URL.

## Troubleshooting

### Common Issues:
1. **Environment Variables Not Found**: Make sure all required environment variables are set in Vercel dashboard
2. **Build Failures**: Check the build logs in Vercel dashboard
3. **Database Connection Issues**: Verify Supabase credentials are correct
4. **Authentication Issues**: Ensure Discord OAuth is properly configured

### Build Logs:
Check the Vercel dashboard for detailed build logs if deployment fails.

## Post-Deployment
1. Test the application functionality
2. Verify database connections
3. Test authentication flow
4. Check all pages load correctly

## Support
If you encounter issues, check:
- Vercel deployment logs
- Supabase dashboard for database issues
- GitHub repository for code issues
