#!/bin/sh
set -e

echo "=== CI Build Pipeline ==="

echo ""
echo "1. Linting..."
npm run lint

echo ""
echo "2. Building Next.js..."
npm run build

echo ""
echo "3. Running database migrations..."
if [ -n "$SUPABASE_ACCESS_TOKEN" ] && [ -n "$SUPABASE_PROJECT_REF" ]; then
  npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
  npx supabase db push --include-all
else
  echo "   Skipping: SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF not set"
fi

echo ""
echo "4. Syncing books and chapters..."
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  node scripts/sync-books.mjs
else
  echo "   Skipping: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set"
fi

echo ""
echo "=== CI Build Complete ==="
