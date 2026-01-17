#!/bin/bash

# Deploy Edge Function without Supabase CLI
# This creates a deployable bundle

echo "📦 Creating Edge Function deployment bundle..."

# Create deployment directory
mkdir -p deploy-bundle

# Copy the function
cp -r supabase/functions/serve-collection deploy-bundle/

echo "✅ Bundle created in deploy-bundle/"
echo ""
echo "📋 Next steps:"
echo "1. Go to https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Go to Edge Functions"
echo "4. Click 'Deploy new function'"
echo "5. Name: serve-collection"
echo "6. Copy the contents of deploy-bundle/serve-collection/index.ts"
echo "7. Paste and deploy"
echo ""
echo "Or install Supabase CLI:"
echo "  npm install -g supabase"
echo "  supabase login"
echo "  supabase functions deploy serve-collection"

