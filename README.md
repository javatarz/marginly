# Marginly

A self-hosted, invite-only book review platform for collecting feedback from beta readers.

## Features

- **Invite-only access** - Control who can read your book via email allowlist
- **Magic link authentication** - No passwords to manage
- **Inline comments** - Readers highlight text and leave contextual feedback
- **Threaded replies** - Respond to comments with nested threads
- **Resolve comments** - Mark feedback as addressed
- **Reading progress tracking** - Track scroll position, time spent, and completion
- **Reading sessions** - Analytics on when and how readers engage
- **Admin dashboard** - Manage readers, review comments, view analytics
- **Multi-book support** - Host multiple books on one platform
- **Auto-sync from manifests** - Books auto-discovered from `public/books/*/manifest.json`

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Supabase (Auth, Database, RLS)
- **Hosting**: Vercel

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Authentication → URL Configuration and add your site URL
3. Copy your project URL and anon key from Settings → API

#### Run Initial Migration

```bash
# Link to your project (via npx, no global install needed)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
npx supabase db push
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Add Yourself as Global Admin

Global admins can access all books on the platform:

```sql
insert into global_admins (user_email)
values ('your-email@example.com');
```

### 5. Add Your First Book

Create a book directory with a manifest:

```
public/books/my-book/
├── manifest.json
├── 01-introduction.html
├── 02-chapter-two.html
└── ...
```

Example `manifest.json`:

```json
{
  "title": "My Book Title",
  "description": "A description of my book",
  "version": "v0.1",
  "versionName": "Draft 1",
  "chapters": [
    { "slug": "01-introduction", "number": 1, "title": "Introduction", "status": "ready" },
    { "slug": "02-chapter-two", "number": 2, "title": "Chapter Two", "status": "ready" }
  ]
}
```

Books and chapters auto-sync to the database on deploy (via `scripts/sync-books.mjs`).

## Inviting Readers

**Via Admin Dashboard** (recommended):
1. Go to `/admin/readers`
2. Enter the reader's email and select a book
3. Click "Invite"

**Via SQL**:
```sql
insert into book_access (book_id, user_email)
select id, 'reader@example.com'
from books where slug = 'my-book';
```

When the reader visits the site and enters their email, they'll receive a magic link.

## Publishing from Another Repo

Use a GitHub Action to build HTML from your manuscript and push to this repo's `public/books/` folder.

The sync script runs on each Vercel deploy and upserts book/chapter metadata.

## Database Migrations

Migrations are stored in `supabase/migrations/` and auto-deployed via Vercel.

### Creating New Migrations

```bash
# Make changes in Supabase Studio, then generate migration:
npx supabase db diff -f my_change_name

# Or create manually:
npx supabase migration new my_change_name
# Then edit supabase/migrations/<timestamp>_my_change_name.sql
```

### CI/CD Pipeline

All CI/CD runs through Vercel (no GitHub Actions). The build script (`scripts/ci-build.sh`) runs:
1. Lint
2. Build (Next.js)
3. Migrate (Supabase)
4. Sync books/chapters from manifests

Add these environment variables in Vercel (Settings → Environment Variables):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | Production URL |
| `SUPABASE_ACCESS_TOKEN` | For CLI migrations |
| `SUPABASE_PROJECT_REF` | For CLI migrations |
| `SUPABASE_SERVICE_ROLE_KEY` | For sync script (bypasses RLS) |

## Development

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run linter
npm run test          # Run unit tests
npm run test:watch    # Run unit tests in watch mode
npm run test:e2e      # Run E2E tests (requires running app)
```

### Testing

**Unit tests** (Vitest) run without external dependencies and are included in CI.

**E2E tests** (Playwright) require a running app with Supabase:
```bash
# Local: Start dev server first
npm run dev
npm run test:e2e

# Against deployed URL
PLAYWRIGHT_BASE_URL=https://your-app.vercel.app npm run test:e2e
```

## Project Structure

```
src/
├── app/
│   ├── login/              # Magic link login
│   ├── auth/               # Auth callbacks (callback, signout, verify)
│   ├── [book]/             # Book table of contents
│   ├── [book]/[chapter]/   # Chapter reader
│   └── admin/              # Admin dashboard
│       ├── readers/        # Manage readers, invite new ones
│       ├── comments/       # Review all comments with filters
│       └── analytics/      # Per-chapter engagement metrics
├── components/
│   └── reader/             # Reader components (ChapterContent, etc.)
├── lib/
│   └── supabase/           # Supabase clients (server, client, middleware)
└── middleware.ts           # Auth session refresh

scripts/
├── ci-build.sh             # Vercel build script (lint, build, migrate, sync)
└── sync-books.mjs          # Sync manifests to database

supabase/
└── migrations/             # Database migrations (auto-deployed)

public/
└── books/                  # Book content (HTML chapters + manifest.json)
```

## License

Private - for personal use only.
