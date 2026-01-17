# Contributing to Marginly

Thank you for your interest in contributing to Marginly! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful and constructive in all interactions. We're all here to build something useful together.

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Use the bug report template
3. Include steps to reproduce, expected behavior, and actual behavior
4. Add environment details (browser, OS, Node version)

### Suggesting Features

1. Check existing issues for similar suggestions
2. Use the feature request template
3. Explain the problem you're trying to solve
4. Describe your proposed solution

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/marginly.git
cd marginly

# Install dependencies
npm install

# Copy environment config
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
npm run dev
```

## Code Style

### Linting

We use ESLint with the Next.js configuration. Run before committing:

```bash
npm run lint
```

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types where possible
- Define interfaces for component props and API responses

### Component Guidelines

- Use functional components with hooks
- Prefer Server Components where possible (Next.js App Router)
- Keep components focused and single-purpose

## Testing

### Unit Tests (Vitest)

```bash
npm run test           # Run once
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

### E2E Tests (Playwright)

```bash
# Start dev server first
npm run dev

# In another terminal
npm run test:e2e
```

## Commit Messages

Follow this format:

```
<type><subject> [issue-ref]

<optional body - explain why, not what>
```

### Type Prefixes

| Prefix | Use When |
|--------|----------|
| `Add` | New feature, file, or capability |
| `Fix` | Bug fix |
| `Update` | Enhance existing feature |
| `Remove` | Delete code, feature, or file |
| `Refactor` | Code change with no behavior change |
| `Docs` | Documentation only |
| `Test` | Test only (no production code) |

### Examples

```
Add inline comment highlighting
Fix magic link redirect on Safari
Update reader dashboard layout
Refactor auth middleware for clarity
```

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security)
- **Hosting**: Vercel

### Key Directories

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components
└── lib/           # Utilities and Supabase clients

scripts/           # Build and sync scripts
supabase/          # Database migrations
public/books/      # Book content (HTML + manifests)
```

### Database

- All tables use Row Level Security (RLS)
- Access controlled via `global_admins` and `book_access` tables
- See `supabase/migrations/` for schema

## Review Process

1. All PRs require review before merging
2. CI must pass (lint, build, tests)
3. Keep PRs focused on a single change
4. Respond to feedback constructively

## Questions?

Open an issue with your question and we'll help you out.
