# Discord Server Verification Setup

This guide explains how to set up Discord server verification to restrict access to only members of the Avalanche Discord server.

## Overview

The authentication system now includes Discord server verification that:
1. Authenticates users with Discord OAuth
2. Verifies they are members of the Avalanche Discord server
3. Allows access only to server members
4. Redirects non-members to the homepage with an error message

## Setup Instructions

### 1. Get Your Discord Server ID

1. Open Discord and navigate to your Avalanche server
2. Right-click on the server name in the server list
3. Select "Copy Server ID" from the context menu
4. Save this ID - you'll need it for the environment variable

### 2. Configure Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
# Discord Server Configuration
DISCORD_SERVER_ID=your_actual_server_id_here
```

**Important**: Replace `your_actual_server_id_here` with the actual server ID you copied in step 1.

### 3. Production Deployment

For production deployment (Vercel), add the environment variable:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add a new environment variable:
   - **Name**: `DISCORD_SERVER_ID`
   - **Value**: Your actual Discord server ID
   - **Environment**: Production, Preview, Development (all)

### 4. Discord Bot Permissions

Ensure your Discord OAuth application has the necessary permissions:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to OAuth2 → General
4. In the "Scopes" section, ensure you have:
   - `identify` - to get user information
   - `guilds` - to check server membership
5. In the "OAuth2 URL Generator", the scopes should include both `identify` and `guilds`

## How It Works

### Authentication Flow

1. **User clicks "Sign in with Discord"**
   - Redirects to Discord OAuth
   - User authorizes the application

2. **Discord OAuth Callback**
   - Exchanges authorization code for access token
   - Gets user information from Discord

3. **Server Verification**
   - Uses Discord API to check if user is in the specified server
   - Calls `/users/@me/guilds` endpoint to get user's servers
   - Checks if the target server ID is in the list

4. **Access Control**
   - **If user is a server member**: Redirects to dashboard
   - **If user is NOT a server member**: Redirects to homepage with error message

### Error Handling

- **Server not configured**: Shows configuration error
- **User not in server**: Shows access restricted message
- **API errors**: Logs errors and shows generic error message

## Testing

### Test Server Members
1. Use a Discord account that is a member of your server
2. Sign in through the application
3. Should be redirected to the dashboard successfully

### Test Non-Members
1. Use a Discord account that is NOT a member of your server
2. Sign in through the application
3. Should be redirected to homepage with "Access Restricted" message

## Monitoring

The system sends notifications to your Discord webhook when:
- Users successfully authenticate and are server members
- Users attempt to authenticate but are not server members
- Authentication errors occur

## Troubleshooting

### Common Issues

1. **"Server configuration error"**
   - Check that `DISCORD_SERVER_ID` is set in environment variables
   - Verify the server ID is correct

2. **"Access Restricted" message**
   - User is not a member of the Discord server
   - They need to join the server first

3. **Authentication fails**
   - Check Discord OAuth configuration
   - Verify bot has `guilds` scope permission
   - Check Discord webhook URL is configured

### Debug Information

Check the server logs for detailed information:
- Server verification attempts
- API responses from Discord
- Error messages and stack traces

## Security Notes

- Server verification happens server-side for security
- Access tokens are used only for verification and not stored
- Non-members are redirected to homepage, not shown sensitive information
- All authentication attempts are logged for monitoring

## Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify all environment variables are set correctly
3. Test with different Discord accounts (member vs non-member)
4. Check Discord webhook notifications for authentication attempts
