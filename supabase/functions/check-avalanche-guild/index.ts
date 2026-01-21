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
    console.log('Guild ID to check:', AVALANCHE_GUILD_ID)
    console.log('Bot token available:', !!DISCORD_BOT_TOKEN)

    // SECURITY: Bot token is REQUIRED - deny access if not configured
    if (!DISCORD_BOT_TOKEN) {
      console.error('DISCORD_BOT_TOKEN not set - SECURITY RISK: Denying all user creation')
      return new Response(
        JSON.stringify({ 
          error: 'Authentication service is not properly configured. Please contact an administrator.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Use bot token to verify guild membership (primary method - most reliable)
    console.log('Attempting to verify guild membership using bot token...')
    try {
      const memberResponse = await fetch(
        `https://discord.com/api/v10/guilds/${AVALANCHE_GUILD_ID}/members/${discordUserId}`,
        {
          headers: {
            'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
          },
        }
      )

      console.log('Discord API response status:', memberResponse.status)
      console.log('Discord API response statusText:', memberResponse.statusText)

      if (memberResponse.ok) {
        // User is a member - allow creation
        const memberData = await memberResponse.json().catch(() => null)
        console.log('✅ User IS a member of Avalanche Discord server (via bot token)')
        console.log('Member data:', memberData ? 'Received' : 'No data')
        return new Response(
          JSON.stringify({ record }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (memberResponse.status === 404) {
        // User is NOT a member - deny access
        console.log('❌ User is NOT a member of Avalanche Discord server (404 from Discord API)')
        const errorResponse = {
          error: "You're not in the Avalanche server. You're not allowed to login. Please join the Avalanche Discord server first and try again."
        }
        console.log('Returning 403 with error:', errorResponse)
        return new Response(
          JSON.stringify(errorResponse),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (memberResponse.status === 401 || memberResponse.status === 403) {
        // Bot token is invalid or bot doesn't have permissions
        const errorText = await memberResponse.text().catch(() => 'Unknown error')
        console.error(`❌ Discord API authentication error (${memberResponse.status}):`, errorText)
        console.error('This usually means:')
        console.error('  1. Bot token is invalid/expired')
        console.error('  2. Bot is not in the Discord server')
        console.error('  3. Bot does not have "Read Members" permission')
        return new Response(
          JSON.stringify({ 
            error: 'Authentication service configuration error. Please contact an administrator.' 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        // Handle other Discord API errors (500, 502, etc.)
        const errorText = await memberResponse.text().catch(() => 'Unknown error')
        console.error(`❌ Discord API error (${memberResponse.status}):`, errorText)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to verify Discord server membership. Please try again later or contact support.' 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } catch (error) {
      console.error('❌ Bot token method failed with exception:', error)
      console.error('Error details:', error.message)
      console.error('Error stack:', error.stack)
      // SECURITY: Deny access on error - fail secure
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify Discord server membership. Please try again later or contact support.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
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
