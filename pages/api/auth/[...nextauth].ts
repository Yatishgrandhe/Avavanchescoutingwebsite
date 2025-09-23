import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { SupabaseAdapter } from '@auth/supabase-adapter';

// Validate required environment variables
const requiredEnvVars = {
  DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
}

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email',
        },
      },
    }),
  ],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  callbacks: {
    async session({ session, user }: any) {
      // Add user ID to session
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user, account, profile }: any) {
      // Allow Discord sign-in
      if (account?.provider === 'discord') {
        return true;
      }
      return false;
    },
    async redirect({ url, baseUrl }: any) {
      // Handle redirects properly for both local and production
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      // Default redirect to home page after login
      return baseUrl
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: process.env.NODE_ENV === 'production',
  // Add explicit URL configuration for production
  ...(process.env.NODE_ENV === 'production' && {
    url: process.env.NEXTAUTH_URL || 'https://avavanchescoutingwebsite.vercel.app',
  }),
};

export default NextAuth(authOptions);
