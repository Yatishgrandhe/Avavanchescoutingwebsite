#!/bin/bash

# Script to deploy the check-avalanche-guild Edge Function
# Make sure you're logged in to Supabase CLI first

set -e

echo "🚀 Deploying check-avalanche-guild Edge Function..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    echo "   Run: brew install supabase/tap/supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Please login first:"
    echo "   Run: supabase login"
    exit 1
fi

# Link to project (if not already linked)
echo "📎 Linking to project..."
supabase link --project-ref ylzahxkfmklwcgkogeff || echo "Already linked or link failed"

# Deploy the function with --no-verify-jwt flag
echo "📦 Deploying function..."
supabase functions deploy check-avalanche-guild --no-verify-jwt

# Set environment variables
echo "🔐 Setting environment variables..."
supabase secrets set DISCORD_BOT_TOKEN="${DISCORD_BOT_TOKEN:-your-discord-bot-token-here}"
supabase secrets set DISCORD_GUILD_ID=1241008226598649886

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to Supabase Dashboard > Authentication > Hooks > Before User Created"
echo "2. Enable the hook"
echo "3. Set URL to: https://ylzahxkfmklwcgkogeff.supabase.co/functions/v1/check-avalanche-guild"
echo "4. Set Secret to: v1,whsec_rDpsc0wRaT2Th18OWNg+/AAMPwVeHfiZhoxmeC76wUc="
echo "5. Save the configuration"
