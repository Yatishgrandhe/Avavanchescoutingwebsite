import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const AVALANCHE_GUILD_ID = Deno.env.get('DISCORD_GUILD_ID') || '1241008226598649886'
const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN')

serve(async (req) => {
  let body: unknown
  let record: unknown

  try {
    // Parse the request body - handle empty body or invalid JSON
    const text = await req.text()
    if (!text || text.trim() === '') {
      console.error('Empty request body received')
      return new Response(
        JSON.stringify({ error: { http_code: 400, message: 'Invalid payload: empty request body' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    try {
      body = JSON.parse(text)
    } catch (parseErr) {
      console.error('Invalid JSON in request body:', parseErr)
      return new Response(
        JSON.stringify({ error: { http_code: 400, message: 'Invalid payload: request body is not valid JSON' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (body == null) {
      console.error('Parsed body is null or undefined')
      return new Response(
        JSON.stringify({ error: { http_code: 400, message: 'Invalid payload: empty or null body' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Supabase before-user-created sends { metadata, user }. Also support { record }, { new }, or body as user
    const b = (typeof body === 'object' && body !== null) ? (body as Record<string, unknown>) : {}
    record = b.user ?? b.record ?? b.new ?? body

    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      const keys = (typeof body === 'object' && body !== null) ? Object.keys(body as object).join(', ') : 'non-object'
      console.error('No valid record in payload. Body keys:', keys)
      return new Response(
        JSON.stringify({ error: { http_code: 400, message: 'Invalid payload: no user record found in request' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const r = record as Record<string, unknown>
    const rawMeta = r?.raw_user_meta_data as Record<string, unknown> | undefined
    const identities = r?.identities as Array<Record<string, unknown>> | undefined
    const identityData = identities?.[0]?.identity_data as Record<string, unknown> | undefined

    // Extract provider from various possible locations
    const provider = rawMeta?.provider 
      ?? identities?.[0]?.provider 
      ?? (r?.app_metadata as Record<string, unknown>)?.provider
      ?? (r?.user_metadata as Record<string, unknown>)?.provider
    
    // Extract Discord user ID from various possible locations
    const discordUserId = rawMeta?.provider_id 
      ?? rawMeta?.sub 
      ?? identityData?.provider_id
      ?? identityData?.id
      ?? identities?.[0]?.id
    
    // Extract email for logging (Discord may not always provide email)
    const email = r?.email 
      ?? rawMeta?.email 
      ?? (r?.user_metadata as Record<string, unknown>)?.email
      ?? identityData?.email
      ?? '(not provided)'
    
    // Log for debugging (safe - no tokens)
    console.log('Before User Created Hook triggered')
    console.log('Email:', String(email))
    console.log('Provider:', String(provider))
    console.log('Discord user ID:', String(discordUserId))
    console.log('Payload keys:', Object.keys(r).join(', '))
    
    // Check if this is a Discord authentication
    if (provider !== 'discord') {
      console.log('Not a Discord authentication, allowing user creation')
      // Supabase expects {} or 204 with no body to ALLOW. Do not return { record }.
      return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (!discordUserId) {
      console.error('No Discord user ID found in metadata')
      return new Response(
        JSON.stringify({ error: { http_code: 400, message: 'No Discord user ID found. Please sign in with Discord.' } }),
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
        JSON.stringify({ error: { http_code: 500, message: 'Authentication service is not properly configured. Please contact an administrator.' } }),
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
        await memberResponse.json().catch(() => null) // consume body
        console.log('✅ User IS a member of Avalanche Discord server (via bot token)')
        // Supabase expects {} or 204 with no body to ALLOW. Do not return { record }.
        return new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } })
      } else if (memberResponse.status === 404) {
        // User is NOT a member - deny access
        console.log('❌ User is NOT a member of Avalanche Discord server (404 from Discord API)')
        return new Response(
          JSON.stringify({ error: { http_code: 403, message: "You're not in the Avalanche server. You're not allowed to login. Please join the Avalanche Discord server first and try again." } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      } else if (memberResponse.status === 401 || memberResponse.status === 403) {
        // Bot token is invalid or bot doesn't have permissions
        const errorText = await memberResponse.text().catch(() => 'Unknown error')
        console.error(`❌ Discord API authentication error (${memberResponse.status}):`, errorText)
        return new Response(
          JSON.stringify({ error: { http_code: 500, message: 'Authentication service configuration error. Please contact an administrator.' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        // Handle other Discord API errors (500, 502, etc.)
        const errorText = await memberResponse.text().catch(() => 'Unknown error')
        console.error(`❌ Discord API error (${memberResponse.status}):`, errorText)
        return new Response(
          JSON.stringify({ error: { http_code: 500, message: 'Failed to verify Discord server membership. Please try again later or contact support.' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } catch (error) {
      console.error('❌ Bot token method failed with exception:', error)
      // SECURITY: Deny access on error - fail secure
      return new Response(
        JSON.stringify({ error: { http_code: 500, message: 'Failed to verify Discord server membership. Please try again later or contact support.' } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in check-avalanche-guild hook:', error)
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: 'An error occurred while verifying Discord server membership' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
