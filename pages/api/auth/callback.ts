import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (session) {
      // User is authenticated, redirect to home
      res.redirect(302, '/');
      return;
    } else {
      // User is not authenticated, redirect to sign in
      res.redirect(302, '/auth/signin');
      return;
    }
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect(302, '/auth/error');
    return;
  }
}
