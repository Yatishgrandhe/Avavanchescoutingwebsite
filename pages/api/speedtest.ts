import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

/**
 * Endpoint for speed testing. Returns 1MB of random data.
 * Usage: fetch('/api/speedtest', { cache: 'no-store' })
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'POST') {
    // For upload test, we just receive the data and return success
    return res.status(200).json({ success: true, received: req.headers['content-length'] });
  }

  // Generate 1MB of random data for GET (download)
  const buffer = crypto.randomBytes(1024 * 1024);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', buffer.length.toString());
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  return res.send(buffer);
}
