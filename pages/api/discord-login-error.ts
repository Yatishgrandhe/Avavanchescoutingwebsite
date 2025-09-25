import { NextApiRequest, NextApiResponse } from 'next';

interface DiscordWebhookPayload {
  content?: string;
  embeds?: Array<{
    title: string;
    description: string;
    color: number;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    timestamp: string;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { error, userInfo, timestamp } = req.body;
    
    // Get Discord webhook URL from environment
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('DISCORD_WEBHOOK_URL not configured - skipping Discord notification');
      return res.status(200).json({ success: true, message: 'Webhook not configured' });
    }

    // Create rich embed for Discord
    const embed: DiscordWebhookPayload = {
      embeds: [
        {
          title: '⚠️ Discord OAuth Login Failed',
          description: 'A user encountered an error during Discord OAuth authentication.',
          color: 0xff4444, // Red color
          fields: [
            {
              name: 'Error Message',
              value: `\`\`\`${error || 'Unknown error'}\`\`\``,
              inline: false,
            },
            {
              name: 'Timestamp',
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            },
            {
              name: 'User Agent',
              value: req.headers['user-agent'] || 'Unknown',
              inline: false,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Add user info if available
    if (userInfo) {
      embed.embeds![0].fields!.push({
        name: 'User Information',
        value: `**Discord ID:** ${userInfo.id || 'Unknown'}\n**Username:** ${userInfo.username || 'Unknown'}\n**Email:** ${userInfo.email || 'Not provided'}`,
        inline: false,
      });
    }

    // Send webhook to Discord
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(embed),
    });

    if (!webhookResponse.ok) {
      console.error('Failed to send Discord webhook:', await webhookResponse.text());
      return res.status(500).json({ 
        error: 'Failed to send Discord notification',
        webhookStatus: webhookResponse.status 
      });
    }

    console.log('Discord login error notification sent successfully');
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing Discord login error notification:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
