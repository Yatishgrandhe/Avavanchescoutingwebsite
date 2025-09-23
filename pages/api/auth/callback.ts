import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, next = '/' } = req.query;

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code as string);
      
      if (!error) {
        // Redirect to the specified page or home
        const redirectUrl = next.toString().startsWith('/') ? next.toString() : '/';
        return res.redirect(302, redirectUrl);
      } else {
        console.error('Auth callback error:', error);
        return res.redirect(302, '/auth/error?message=Authentication failed');
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      return res.redirect(302, '/auth/error?message=Authentication failed');
    }
  }

  // If no code, redirect to error page
  return res.redirect(302, '/auth/error?message=No authentication code provided');
}