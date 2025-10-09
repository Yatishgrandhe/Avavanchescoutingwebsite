/**
 * Discord Server Verification Utility
 * Verifies if a user is a member of the Avalanche Discord server
 */

interface DiscordGuildMember {
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
  roles: string[];
  joined_at: string;
  deaf: boolean;
  mute: boolean;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

/**
 * Verifies if a user is a member of the specified Discord server
 * @param accessToken - Discord OAuth access token
 * @param serverId - Discord server ID to check membership for
 * @returns Promise<boolean> - true if user is a member, false otherwise
 */
export async function verifyDiscordServerMembership(
  accessToken: string,
  serverId: string
): Promise<boolean> {
  try {
    console.log('🔍 Verifying Discord server membership...');
    console.log('🏠 Target Server ID:', serverId);
    console.log('🔑 Access token available:', !!accessToken);

    // First, get the user's guilds (servers they're in)
    const guildsResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!guildsResponse.ok) {
      console.error('❌ Failed to fetch user guilds:', guildsResponse.status, guildsResponse.statusText);
      return false;
    }

    const guilds: DiscordGuild[] = await guildsResponse.json();
    console.log('📋 User is in', guilds.length, 'servers');

    // Check if the user is in the specified server
    const isInServer = guilds.some(guild => guild.id === serverId);
    
    if (isInServer) {
      console.log('✅ User is a member of the Avalanche Discord server');
      
      // Get more detailed information about the user's membership
      const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${serverId}/members/@me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (memberResponse.ok) {
        const member: DiscordGuildMember = await memberResponse.json();
        console.log('👤 Member details:', {
          username: member.user.username,
          joinedAt: member.joined_at,
          roles: member.roles.length
        });
      }
    } else {
      console.log('❌ User is NOT a member of the Avalanche Discord server');
      console.log('📋 User is in these servers:', guilds.map(g => ({ id: g.id, name: g.name })));
    }

    return isInServer;
  } catch (error) {
    console.error('💥 Error verifying Discord server membership:', error);
    return false;
  }
}

/**
 * Gets detailed information about a user's membership in a Discord server
 * @param accessToken - Discord OAuth access token
 * @param serverId - Discord server ID
 * @returns Promise<DiscordGuildMember | null> - member info or null if not a member
 */
export async function getDiscordServerMemberInfo(
  accessToken: string,
  serverId: string
): Promise<DiscordGuildMember | null> {
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${serverId}/members/@me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Discord server member info:', error);
    return null;
  }
}

/**
 * Sends a notification to Discord about server verification results
 * @param isMember - whether the user is a member
 * @param userInfo - user information
 * @param serverId - server ID that was checked
 */
export async function notifyDiscordServerVerification(
  isMember: boolean,
  userInfo: any,
  serverId: string
): Promise<void> {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('DISCORD_WEBHOOK_URL not configured - skipping Discord notification');
      return;
    }

    const embed = {
      embeds: [
        {
          title: isMember ? '✅ Server Verification Success' : '❌ Server Verification Failed',
          description: isMember 
            ? 'A user successfully authenticated and is a member of the Avalanche Discord server.'
            : 'A user attempted to authenticate but is NOT a member of the Avalanche Discord server.',
          color: isMember ? 0x00ff00 : 0xff0000, // Green for success, red for failure
          fields: [
            {
              name: 'Discord User',
              value: `**Username:** ${userInfo.username || 'Unknown'}\n**ID:** ${userInfo.id || 'Unknown'}\n**Email:** ${userInfo.email || 'Not provided'}`,
              inline: true,
            },
            {
              name: 'Server Check',
              value: `**Server ID:** ${serverId}\n**Result:** ${isMember ? 'Member' : 'Not a Member'}`,
              inline: true,
            },
            {
              name: 'Timestamp',
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(embed),
    });

    console.log('Discord server verification notification sent successfully');
  } catch (webhookError) {
    console.error('Failed to send Discord server verification notification:', webhookError);
  }
}
