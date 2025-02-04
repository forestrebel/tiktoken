#!/bin/bash
set -e

# Get Supabase secrets
SUPABASE_URL=$(supabase status | grep 'API URL' | awk '{print $3}')
SUPABASE_KEY=$(supabase status | grep 'service_role key' | awk '{print $3}')

# Get Digital Ocean API token
DO_API_URL="https://api.$(doctl compute region list --format Name --no-header | head -n1).digitalocean.com"
DO_API_TOKEN=$(doctl auth token)

# Get Vercel secrets
VERCEL_URL=$(vercel list --json | jq -r '.[0].url')
VERCEL_TOKEN=$(cat ~/.config/vercel/auth.json | jq -r '.token')

# Set GitHub secrets
echo "Setting GitHub secrets..."
gh secret set SUPABASE_URL --body "$SUPABASE_URL"
gh secret set SUPABASE_KEY --body "$SUPABASE_KEY"
gh secret set DO_API_URL --body "$DO_API_URL"
gh secret set DO_API_TOKEN --body "$DO_API_TOKEN"
gh secret set VERCEL_URL --body "$VERCEL_URL"
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"

echo "Secrets configured successfully!" 