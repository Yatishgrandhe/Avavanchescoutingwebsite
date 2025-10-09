import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Debug endpoint to check Discord configuration
 * This endpoint helps verify that environment variables are properly configured
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) {
    res.status(403).json({ error: 'This endpoint is only available in development mode' });
    return;
  }

  // Get configuration values
  const config = {
    discordClientId: process.env.DISCORD_CLIENT_ID ? 'SET' : 'MISSING',
    discordClientSecret: process.env.DISCORD_CLIENT_SECRET ? 'SET' : 'MISSING',
    discordServerId: process.env.DISCORD_SERVER_ID || 'MISSING',
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ? 'SET' : 'MISSING',
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  };

  // Log the configuration (without sensitive data)
  console.log('🔧 Discord Configuration Check:');
  console.log('📋 Client ID:', config.discordClientId);
  console.log('🔐 Client Secret:', config.discordClientSecret);
  console.log('🏠 Server ID:', config.discordServerId);
  console.log('🔗 Webhook URL:', config.discordWebhookUrl);
  console.log('🌍 Node Environment:', config.nodeEnv);

  // Return configuration status
  res.status(200).json({
    message: 'Discord configuration status',
    config,
    status: {
      allConfigured: config.discordClientId === 'SET' && 
                    config.discordClientSecret === 'SET' && 
                    config.discordServerId !== 'MISSING' &&
                    config.discordWebhookUrl === 'SET',
      serverVerificationEnabled: config.discordServerId !== 'MISSING',
    },
    instructions: {
      serverId: config.discordServerId === 'MISSING' 
        ? 'Add DISCORD_SERVER_ID to your environment variables'
        : `Server verification is configured for server ID: ${config.discordServerId}`,
    }
  });
}
