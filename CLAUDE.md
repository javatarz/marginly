# Marginly

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Next.js dev server on port 3000
npm run build    # Build for production
npm run lint     # Run ESLint

# Database migrations (via npx)
npx supabase link --project-ref <PROJECT_REF>  # Link to Supabase project
npx supabase db push                            # Apply migrations
npx supabase db diff -f <name>                  # Generate migration from local changes
npx supabase migration new <name>               # Create empty migration file
```

## CLI Tools Available

Both CLIs are available through npx (no global install needed):

- **Vercel CLI**: `npx vercel <command>` - deployments, logs, env vars
  - `npx vercel ls` - list deployments
  - `npx vercel inspect <url> --logs` - view build logs
  - `npx vercel env ls` - list environment variables

- **Supabase CLI**: `npx supabase <command>` - migrations, config
  - Use sparingly; most work is done via migrations and SQL Editor

## Architecture

**Stack**: Next.js 14 (App Router) + Supabase (PostgreSQL + Auth) + Tailwind CSS

### Authentication Flow

Invite-only magic link authentication:
1. User email checked against `global_admins` or `book_access` table before magic link sent
2. `global_admins` - platform-wide admin access to all books
3. `book_access` - per-book reader invites (user_email stored pre-signup)
4. `handle_new_user()` trigger links `user_id` in both tables when user signs up
5. Middleware refreshes auth session on every request

Public routes: `/login`, `/auth/callback`, `/auth/verify`

### Supabase Clients

- `src/lib/supabase/client.ts` - Browser client (use in Client Components)
- `src/lib/supabase/server.ts` - Server client (use in Server Components/Route Handlers)
- `src/lib/supabase/middleware.ts` - Session refresh helper

### Database Schema

Core tables with RLS enabled:
- `books` - Book metadata (slug, title, version)
- `chapters` - Chapter metadata (book_id, slug, number, title, status)
- `global_admins` - Platform-wide admin access (user_email, user_id)
- `book_access` - Per-book reader invites (book_id, user_email/user_id)
- `comments` - Inline annotations with threading (anchor_text, content, parent_id, is_resolved)
- `reading_progress` - Per-chapter progress (scroll_pct, time_spent_seconds)
- `reading_sessions` - Session analytics (started_at, ended_at, max_scroll_pct, viewport)

Access controlled via RLS policies that check both `global_admins` and `book_access`.

### Routing

- `/login` - Magic link login
- `/[book]` - Book table of contents (dynamic route)
- `/[book]/[chapter]` - Chapter reader (nested dynamic route)
- `/auth/callback` - OAuth code exchange
- `/auth/signout` - Sign out handler

### Content Storage

Book chapters are static HTML files in `public/books/{book-slug}/`. Chapter metadata in database points to these files.

Books are auto-discovered from `public/books/*/manifest.json` and synced to Supabase on deploy.

## CI/CD Pipeline

**Single pipeline: Vercel** - Do NOT create GitHub Actions for CI/CD.

Pipeline order (defined in `scripts/ci-build.sh`):
1. Lint
2. Build (Next.js)
3. Migrate (Supabase)
4. Sync books/chapters from manifests

### Required Vercel Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | Production URL (e.g., https://marginly.example.com) |
| `SUPABASE_ACCESS_TOKEN` | For CLI migrations |
| `SUPABASE_PROJECT_REF` | For CLI migrations |
| `SUPABASE_SERVICE_ROLE_KEY` | For sync script (bypasses RLS)

## Work Management

**All work is managed through `bd` (beads).** This is mandatory, not optional.

### Starting Work
```bash
bd onboard            # First time setup
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work before starting
```

### During Work
- Every task must have a corresponding issue
- If you discover new work, create an issue: `bd new "title" --description "details"`
- Keep issue status current as you work

### Completing Work
```bash
bd close <id>         # Mark issue complete
bd sync               # Sync issues with git
git pull --rebase
git push              # Work is NOT done until pushed
```

### Rules
- Never start work without an issue
- Never leave work untracked - if it needs follow-up, create an issue
- Always `bd sync` and `git push` before ending a session
- Update issue status in real-time, not in batches

## Git Workflow

### Behavioral Rules

| Rule | Description |
|------|-------------|
| **Never commit without user confirmation** | Explain what will be committed and why, then wait for approval |
| **Never push without asking** | Always confirm before pushing to remote |
| **Never force-push without explicit confirmation** | Explain what's on remote, what force-push will do, and ask for explicit approval |
| **Smallest independent change** | Each commit should be the smallest change that doesn't break the system |
| **Prefer many small commits** | Over few large ones - easier to review and revert |

### Commit Message Format

```
<type prefix><subject> [bd#N]

<optional body - why, not how>
```

| Rule | Description |
|------|-------------|
| **Imperative mood** | "Add feature" not "Added feature" |
| **Subject ≤ 50 chars** | Excludes issue reference |
| **Capitalize subject** | "Add validation" not "add validation" |
| **No trailing period** | Wastes space |
| **Reference the issue** | Append `[bd#N]` for traceability |

**Type prefixes:** `Add`, `Fix`, `Update`, `Remove`, `Refactor`, `Rename`, `Move`, `Docs`, `Test`, `Config`

### Squashing Workflow

Only squash unpushed commits that logically belong together:
```bash
git commit --fixup=<commit>
GIT_SEQUENCE_EDITOR=true git rebase -i --autosquash <commit>~1
```

### Small Batch Principle

| Principle | Target |
|-----------|--------|
| **Change size** | <200 lines per commit |
| **Commit frequency** | After each logical unit of work |
| **Review scope** | Single logical change |

Before committing, check diff size:
```bash
git diff --stat
```

If a commit exceeds 200 lines, break into multiple commits or propose splitting work via AskUserQuestion.
