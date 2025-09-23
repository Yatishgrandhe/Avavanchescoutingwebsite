import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { code, error: authError, next = '/' } = req.query;

  // Handle OAuth errors
  if (authError) {
    console.error('OAuth error:', authError);
    res.redirect(302, '/auth/error?message=Authentication failed');
    return;
  }

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code as string);
      
      if (!error) {
        // Redirect to the main dashboard
        res.redirect(302, '/');
        return;
      } else {
        console.error('Auth callback error:', error);
        res.redirect(302, '/auth/error?message=Authentication failed');
        return;
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect(302, '/auth/error?message=Authentication failed');
      return;
    }
  }

  // If no code, redirect to home page (Supabase handles the OAuth flow)
  res.redirect(302, '/');
}
