#!/bin/bash

# Complete setup script for Discord Guild Auth Hook
# This script will verify and set up everything needed

set -e

echo "🔍 Discord Guild Auth Hook Setup & Verification"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    if [ -f ~/.local/bin/supabase ]; then
        export PATH="$HOME/.local/bin:$PATH"
        echo "✅ Using Supabase CLI from ~/.local/bin"
    else
        echo -e "${RED}❌ Supabase CLI not found${NC}"
        echo "   Please install it first or add to PATH"
        exit 1
    fi
else
    echo "✅ Supabase CLI found"
fi

# Check if logged in
echo ""
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Supabase${NC}"
    echo "   Please run: supabase login"
    exit 1
else
    echo -e "${GREEN}✅ Logged in to Supabase${NC}"
fi

# Link to project
echo ""
echo "📎 Linking to project..."
if supabase link --project-ref ylzahxkfmklwcgkogeff 2>&1 | grep -q "already linked\|Linked"; then
    echo -e "${GREEN}✅ Project linked${NC}"
else
    echo -e "${YELLOW}⚠️  Link status unclear - continuing anyway${NC}"
fi

# Deploy function
echo ""
echo "📦 Deploying Edge Function..."
if supabase functions deploy check-avalanche-guild --no-verify-jwt; then
    echo -e "${GREEN}✅ Function deployed successfully${NC}"
else
    echo -e "${RED}❌ Function deployment failed${NC}"
    exit 1
fi

# Check secrets
echo ""
echo "🔐 Checking environment variables..."
SECRETS=$(supabase secrets list 2>/dev/null || echo "")

if echo "$SECRETS" | grep -q "DISCORD_BOT_TOKEN"; then
    echo -e "${GREEN}✅ DISCORD_BOT_TOKEN is set${NC}"
else
    echo -e "${YELLOW}⚠️  DISCORD_BOT_TOKEN not found${NC}"
    if [ -n "$DISCORD_BOT_TOKEN" ]; then
        echo "   Setting DISCORD_BOT_TOKEN from environment..."
        supabase secrets set DISCORD_BOT_TOKEN="$DISCORD_BOT_TOKEN"
        echo -e "${GREEN}✅ DISCORD_BOT_TOKEN set${NC}"
    else
        echo -e "${RED}❌ DISCORD_BOT_TOKEN not set${NC}"
        echo "   Please set it: supabase secrets set DISCORD_BOT_TOKEN=\"your-token\""
    fi
fi

if echo "$SECRETS" | grep -q "DISCORD_GUILD_ID"; then
    echo -e "${GREEN}✅ DISCORD_GUILD_ID is set${NC}"
else
    echo "   Setting DISCORD_GUILD_ID..."
    supabase secrets set DISCORD_GUILD_ID=1241008226598649886
    echo -e "${GREEN}✅ DISCORD_GUILD_ID set${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo "📋 NEXT STEPS (CRITICAL - Do this in Supabase Dashboard):"
echo ""
echo "1. Go to: Authentication → Hooks → Before User Created"
echo "2. ✅ ENABLE the hook (toggle ON)"
echo "3. Set URL to:"
echo "   https://ylzahxkfmklwcgkogeff.supabase.co/functions/v1/check-avalanche-guild"
echo "4. Set Secret to:"
echo "   v1,whsec_rDpsc0wRaT2Th18OWNg+/AAMPwVeHfiZhoxmeC76wUc="
echo "5. ✅ Click SAVE"
echo ""
echo "🔍 To verify it's working:"
echo "   - Go to Edge Functions → check-avalanche-guild → Logs"
echo "   - Try signing in with a Discord account"
echo "   - You should see logs showing the hook was called"
echo ""
echo "⚠️  If everyone can still login:"
echo "   - Check the hook is ENABLED in Dashboard"
echo "   - Check the URL is exactly correct (no trailing slash)"
echo "   - Check the Secret is exactly correct"
echo "   - Check Edge Function logs to see if hook is being called"
echo ""
