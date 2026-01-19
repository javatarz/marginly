# Configuration

Marginly is configured through environment variables and a books configuration.

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `NEXT_PUBLIC_APP_URL` | Your deployment URL (e.g., `https://marginly.example.com`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for book sync) |

### For CI/CD (Vercel)

| Variable | Description |
|----------|-------------|
| `SUPABASE_ACCESS_TOKEN` | For running migrations in CI |
| `SUPABASE_PROJECT_REF` | Your Supabase project reference |
| `BOOKS_CONFIG` | JSON configuration for fetching books (see below) |
| `GITHUB_TOKEN` | For fetching books from private GitHub repos |

## Books Configuration

Books are configured via the `BOOKS_CONFIG` environment variable (JSON) or a `books.config.json` file.

### Format

```json
{
  "books": [
    {
      "slug": "my-book",
      "source": {
        "type": "github-release",
        "repo": "username/my-book-content",
        "release": "latest"
      }
    }
  ]
}
```

### Fields

| Field | Description |
|-------|-------------|
| `slug` | URL-safe identifier for the book (e.g., `my-book` → `/my-book`) |
| `source.type` | Currently only `github-release` is supported |
| `source.repo` | GitHub repository in `owner/repo` format |
| `source.release` | Release tag to fetch, or `latest` for the most recent |

### Example: Multiple Books

```json
{
  "books": [
    {
      "slug": "my-novel",
      "source": {
        "type": "github-release",
        "repo": "author/my-novel-drafts",
        "release": "latest"
      }
    },
    {
      "slug": "tech-guide",
      "source": {
        "type": "github-release",
        "repo": "author/tech-guide",
        "release": "v2.0"
      }
    }
  ]
}
```

### Private Repositories

For private GitHub repositories, set the `GITHUB_TOKEN` environment variable with a personal access token that has `repo` scope.

## Custom Domain

To use a custom domain:

1. Add your domain in Vercel project settings
2. Update `NEXT_PUBLIC_APP_URL` to your custom domain
3. Configure DNS as instructed by Vercel
