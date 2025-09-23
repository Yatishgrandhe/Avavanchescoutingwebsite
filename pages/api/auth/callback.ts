import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { code, next = '/' } = req.query;

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code as string);
      
      if (!error) {
        // Redirect to the specified page or home
        const redirectUrl = next.toString().startsWith('/') ? next.toString() : '/';
        res.redirect(302, redirectUrl);
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

  // If no code, redirect to error page
  res.redirect(302, '/auth/error?message=No authentication code provided');
}
