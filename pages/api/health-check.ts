import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }
  return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}
