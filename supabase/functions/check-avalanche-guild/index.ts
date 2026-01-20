import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const AVALANCHE_GUILD_ID = Deno.env.get('DISCORD_GUILD_ID') || '1241008226598649886'
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN')

serve(async (req) => {
  try {
    // Note: Supabase handles secret verification automatically for auth hooks
    // The secret is configured in the Auth Hook settings, not in the function code
    // Supabase will verify the signature before calling this function
    
    // Parse the request body
    const { record } = await req.json()
    
    // Log for debugging
    console.log('Before User Created Hook triggered')
    console.log('User email:', record?.email)
    console.log('Provider:', record?.raw_user_meta_data?.provider)
    
    // Check if this is a Discord authentication
    if (record?.raw_user_meta_data?.provider !== 'discord') {
      console.log('Not a Discord authentication, allowing user creation')
      return new Response(
        JSON.stringify({ record }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get Discord user ID from OAuth metadata
    const discordUserId = record?.raw_user_meta_data?.provider_id || 
                          record?.raw_user_meta_data?.sub
    
    if (!discordUserId) {
      console.error('No Discord user ID found in metadata')
      return new Response(
        JSON.stringify({ 
          error: 'No Discord user ID found. Please sign in with Discord.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('Checking Discord guild membership for user:', discordUserId)

    // Method 1: Try using user's access token (if available)
    const userAccessToken = record?.raw_user_meta_data?.access_token
    
    if (userAccessToken) {
      try {
        const guildsResponse = await fetch(
          `https://discord.com/api/v10/users/@me/guilds`,
          {
            headers: {
              'Authorization': `Bearer ${userAccessToken}`,
            },
          }
        )

        if (guildsResponse.ok) {
          const guilds = await guildsResponse.json()
          const isInGuild = guilds.some((guild: any) => guild.id === AVALANCHE_GUILD_ID)
          
          if (isInGuild) {
            console.log('User is a member of Avalanche Discord server (via user token)')
            return new Response(
              JSON.stringify({ record }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }
        }
      } catch (error) {
        console.log('User token method failed, trying bot token method:', error)
      }
    }

    // Method 2: Use bot token to check guild membership (more reliable)
    if (DISCORD_BOT_TOKEN) {
      try {
        const memberResponse = await fetch(
          `https://discord.com/api/v10/guilds/${AVALANCHE_GUILD_ID}/members/${discordUserId}`,
          {
            headers: {
              'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
            },
          }
        )

        if (memberResponse.ok) {
          console.log('User is a member of Avalanche Discord server (via bot token)')
          return new Response(
            JSON.stringify({ record }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } else if (memberResponse.status === 404) {
          console.log('User is NOT a member of Avalanche Discord server')
          return new Response(
            JSON.stringify({ 
              error: "You're not in the Avalanche server. You're not allowed to login. Please join the Avalanche Discord server first and try again." 
            }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          )
        }
      } catch (error) {
        console.error('Bot token method failed:', error)
      }
    }

    // If both methods fail and no bot token, allow creation but log warning
    if (!DISCORD_BOT_TOKEN) {
      console.warn('DISCORD_BOT_TOKEN not set, cannot verify guild membership. Allowing user creation.')
      return new Response(
        JSON.stringify({ record }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Default: deny if we couldn't verify membership
    console.log('Could not verify Discord guild membership')
    return new Response(
      JSON.stringify({ 
        error: "You're not in the Avalanche server. You're not allowed to login. Please ensure you are a member of the Avalanche Discord server and try again." 
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in check-avalanche-guild hook:', error)
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while verifying Discord server membership',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
