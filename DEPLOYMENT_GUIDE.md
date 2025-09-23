# Avalanche 2025 Deployment Guide

## 🚀 Complete Setup Instructions

### 1. **Supabase Database Setup**

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)
2. **Run the database setup script**:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `setup-supabase-database.sql`
   - Execute the script

3. **Get your Supabase credentials**:
   - Go to Settings > API
   - Copy your Project URL and anon key
   - Go to Settings > API > Service Role
   - Copy your service role key

### 2. **Vercel Environment Variables**

Set these environment variables in your Vercel project:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth.js Configuration
NEXTAUTH_URL=https://avavanchescoutingwebsite.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_key

# Discord OAuth Configuration
DISCORD_CLIENT_ID=1410224475592720499
DISCORD_CLIENT_SECRET=z5hdVYza8753QdjB0FBmyNtSTfYxTiH3

# Node Environment
NODE_ENV=production
```

### 3. **Discord OAuth Setup**

1. **Update Discord Application Settings**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - Go to OAuth2 > General
   - Add redirect URI: `https://avavanchescoutingwebsite.vercel.app/api/auth/callback/discord`

2. **Verify Discord credentials** are correct in environment variables

### 4. **Deploy to Vercel**

1. **Connect your GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** the application

### 5. **Test the Complete Flow**

1. **Visit your deployed site**: `https://avavanchescoutingwebsite.vercel.app`
2. **Click "Sign in with Discord"**
3. **Complete Discord OAuth flow**
4. **Verify redirect** to `/analysis/basic` page
5. **Test team search** functionality
6. **Verify data loads** from Supabase

## 🔧 Authentication Flow

### **Updated Redirect Logic**

- **Home page** (`/`) → Redirects authenticated users to `/analysis/basic`
- **Sign-in page** (`/auth/signin`) → Redirects to `/analysis/basic` after successful login
- **NextAuth callback** → Defaults to `/analysis/basic`
- **Scouting page** (`/scout`) → Still available for data entry

### **User Experience**

1. **Unauthenticated users** see the landing page with sign-in option
2. **After Discord OAuth**, users are automatically redirected to data analysis
3. **Data analysis page** shows team search and performance statistics
4. **Navigation** allows access to scouting forms and other features

## 📊 Database Features

### **Tables Created**

- `users` - NextAuth user accounts
- `accounts` - OAuth provider accounts
- `sessions` - User sessions
- `verification_tokens` - Email verification
- `teams` - FRC team information
- `matches` - Match data
- `scouting_data` - Avalanche scoring data

### **Sample Data Included**

- 6 sample teams (1234, 5678, 9012, 3456, 7890, 2468)
- 3 sample matches
- 4 sample scouting entries
- Ready for immediate testing

### **Security Features**

- Row Level Security (RLS) enabled
- Proper authentication policies
- Users can only access their own data
- Public read access for teams and matches

## 🎯 Key Features

### **Data Analysis Page**

- **Team Search**: Enter team number to view statistics
- **Performance Metrics**: Average scores by period
- **Recent Matches**: Last 5 matches with detailed breakdown
- **Real-time Data**: Direct Supabase integration
- **Professional UI**: Modern design with animations

### **Avalanche 2025 Integration**

- **Complete Scoring System**: All game elements supported
- **Autonomous Period**: LEAVE, CORAL, ALGAE scoring
- **Teleop Period**: CORAL and ALGAE scoring
- **Endgame**: PARK, CAGES scoring
- **Real-time Calculations**: Automatic score computation

## 🐛 Troubleshooting

### **Common Issues**

1. **Authentication not working**:
   - Check Discord redirect URI
   - Verify environment variables
   - Check NextAuth configuration

2. **Database connection issues**:
   - Verify Supabase credentials
   - Check RLS policies
   - Ensure tables are created

3. **Redirect not working**:
   - Check NEXTAUTH_URL environment variable
   - Verify callback URL in Discord settings
   - Check NextAuth redirect callback

### **Testing Checklist**

- [ ] Discord OAuth flow completes successfully
- [ ] User is redirected to `/analysis/basic` after login
- [ ] Team search returns data from Supabase
- [ ] Statistics are calculated correctly
- [ ] Recent matches display properly
- [ ] Navigation works between pages
- [ ] Sign out functionality works

## 🎉 Success!

Once deployed and tested, your Avalanche 2025 scouting platform will have:

- ✅ Professional authentication with Discord OAuth
- ✅ Automatic redirect to data analysis after login
- ✅ Complete Supabase database integration
- ✅ Real-time team performance statistics
- ✅ Modern, responsive UI with animations
- ✅ Full Avalanche 2025 scoring system support

The platform is now ready for professional use! 🚀
