import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const AVALANCHE_GUILD_ID = Deno.env.get('DISCORD_GUILD_ID') || '1241008226598649886'
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN')

serve(async (req) => {
  try {
    // Parse the request body - Supabase auth hooks can send different structures
    const body = await req.json()
    
    // Support multiple payload structures: { record }, { user }, or record at top level
    const record = body?.record ?? body?.user ?? body
    
    // Extract provider from various possible locations
    const provider = record?.raw_user_meta_data?.provider 
      ?? record?.identities?.[0]?.provider 
      ?? record?.app_metadata?.provider
      ?? record?.user_metadata?.provider
    
    // Extract Discord user ID from various possible locations
    const discordUserId = record?.raw_user_meta_data?.provider_id 
      ?? record?.raw_user_meta_data?.sub 
      ?? record?.identities?.[0]?.identity_data?.provider_id
      ?? record?.identities?.[0]?.identity_data?.id
      ?? record?.identities?.[0]?.id
    
    // Extract email for logging (Discord may not always provide email)
    const email = record?.email 
      ?? record?.raw_user_meta_data?.email 
      ?? record?.user_metadata?.email
      ?? record?.identities?.[0]?.identity_data?.email
      ?? '(not provided)'
    
    // Log for debugging (safe - no tokens)
    console.log('Before User Created Hook triggered')
    console.log('Email:', email)
    console.log('Provider:', provider)
    console.log('Discord user ID:', discordUserId)
    console.log('Payload keys:', record ? Object.keys(record).join(', ') : 'no record')
    
    // Check if this is a Discord authentication
    if (provider !== 'discord') {
      console.log('Not a Discord authentication, allowing user creation')
      return new Response(
        JSON.stringify({ record }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

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
