import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (session) {
      // User is authenticated, redirect to home
      return res.redirect(302, '/');
    } else {
      // User is not authenticated, redirect to sign in
      return res.redirect(302, '/auth/signin');
    }
  } catch (error) {
    console.error('Auth callback error:', error);
    return res.redirect(302, '/auth/error');
  }
}
