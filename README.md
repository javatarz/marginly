# Book Review Platform

A self-hosted, invite-only book review platform for collecting feedback from beta readers.

## Features

- **Invite-only access** - You control who can read your book
- **Magic link authentication** - No passwords to manage
- **Inline comments** - Readers can highlight text and leave feedback
- **Reading progress tracking** - See who's read what
- **Multi-book support** - Host multiple books on one platform

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Supabase (Auth, Database, RLS)
- **Hosting**: Vercel (or any Node.js host)

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Authentication → URL Configuration and add your site URL
3. Copy your project URL and anon key from Settings → API

#### Run Initial Migration

**Option A: Via Supabase CLI (recommended)**
```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

**Option B: Manual**
Copy the contents of `supabase/migrations/*_initial_schema.sql` into Supabase SQL Editor and run it.

### 2. Configure Environment

```bash
cp .env.local.example .env.local
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

### 4. Add Your First Book

In Supabase SQL Editor:

```sql
-- Add your book
insert into books (slug, title, description, version, version_name)
values (
  'my-book',
  'My Book Title',
  'A description of my book',
  'v0.1',
  'Draft 1'
);

-- Add yourself as admin
insert into book_access (book_id, user_email, role)
select id, 'your-email@example.com', 'admin'
from books where slug = 'my-book';
```

### 5. Add Book Content

Place your HTML chapter files in:

```
public/books/{book-slug}/
├── 01-introduction.html
├── 02-chapter-two.html
└── ...
```

Then add chapter metadata in Supabase:

```sql
insert into chapters (book_id, slug, number, title, status)
select id, '01-introduction', 1, 'Introduction', 'ready'
from books where slug = 'my-book';
```

## Inviting Readers

```sql
-- Add a reader (they'll get access when they sign up with this email)
insert into book_access (book_id, user_email, role)
select id, 'reader@example.com', 'reader'
from books where slug = 'my-book';
```

When the reader visits the site and enters their email, they'll receive a magic link.

## Publishing from Another Repo

Use a GitHub Action to build HTML from your manuscript and push to this repo's `public/books/` folder.

See the main book repo for an example workflow.

## Database Migrations

Migrations are stored in `supabase/migrations/` and auto-deployed via GitHub Actions.

### Creating New Migrations

```bash
# Make changes in Supabase Studio locally, then:
supabase db diff -f my_change_name

# Or create manually:
supabase migration new my_change_name
# Then edit supabase/migrations/<timestamp>_my_change_name.sql
```

### CI/CD Setup

Add these secrets to your GitHub repository (Settings → Secrets):

| Secret | Where to find it |
|--------|------------------|
| `SUPABASE_ACCESS_TOKEN` | [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) → Access Tokens |
| `SUPABASE_PROJECT_REF` | Your project URL: `https://<PROJECT_REF>.supabase.co` |

Migrations run automatically when you push changes to `supabase/migrations/`.

## Development

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
npm run lint    # Run linter
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/       # Login page
│   ├── [book]/             # Book table of contents
│   ├── [book]/[chapter]/   # Chapter reader
│   └── admin/              # Admin dashboard (TODO)
├── components/
│   └── reader/             # Reader components
├── lib/
│   └── supabase/           # Supabase client utilities
└── middleware.ts           # Auth middleware
```

## License

Private - for personal use only.
