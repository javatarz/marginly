#!/bin/sh
set -e

echo "=== CI Build Pipeline ==="

echo ""
echo "1. Fetching book content..."
if [ -n "$BOOKS_CONFIG" ] || [ -f "books.config.json" ]; then
  if [ -n "$GITHUB_TOKEN" ]; then
    node scripts/fetch-books.mjs
  else
    echo "   Skipping: GITHUB_TOKEN not set (books must be pre-populated)"
  fi
else
  echo "   Skipping: No book config found (set BOOKS_CONFIG or create books.config.json)"
fi

echo ""
echo "2. Linting..."
npm run lint

echo ""
echo "3. Running unit tests..."
npm run test

echo ""
echo "4. Building Next.js..."
npm run build

echo ""
echo "5. Running database migrations..."
if [ -n "$SUPABASE_ACCESS_TOKEN" ] && [ -n "$SUPABASE_PROJECT_REF" ]; then
  npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
  npx supabase db push --include-all
else
  echo "   Skipping: SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF not set"
fi

echo ""
echo "6. Syncing books and chapters..."
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  node scripts/sync-books.mjs
else
  echo "   Skipping: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set"
fi

echo ""
echo "=== CI Build Complete ==="
