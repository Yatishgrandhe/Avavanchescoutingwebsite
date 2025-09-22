# Avalanche Scouting Data

A comprehensive FRC scouting application built with Next.js, Supabase, and modern web technologies.

## Features

- **Real-time Scouting**: Advanced form-based data collection for FRC matches
- **Analytics Dashboard**: Comprehensive team performance analysis
- **Modern UI**: Beautiful, responsive design with smooth animations
- **Authentication**: Secure Discord OAuth integration
- **Database**: Supabase-powered real-time data storage
- **Deployment**: Optimized for Vercel deployment

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with Discord OAuth
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Discord OAuth application

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Yatishgrandhe/Avavanchescoutingwebsite.git
cd Avavanchescoutingwebsite
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `NEXTAUTH_URL`: Your application URL
- `NEXTAUTH_SECRET`: A random secret for NextAuth
- `DISCORD_CLIENT_ID`: Your Discord OAuth client ID
- `DISCORD_CLIENT_SECRET`: Your Discord OAuth client secret

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

## Project Structure

```
├── components/          # Reusable UI components
│   ├── layout/         # Layout components
│   ├── scout/          # Scouting form components
│   └── ui/             # Base UI components
├── lib/                # Utility functions and configurations
├── pages/              # Next.js pages and API routes
├── styles/             # Global styles
└── public/             # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue on GitHub or contact the development team.