# Deploy Your Own Marginly

This guide walks you through deploying your own Marginly instance.

## Prerequisites

- A [GitHub](https://github.com) account
- A [Vercel](https://vercel.com) account (free tier works)
- A [Supabase](https://supabase.com) account (free tier works)

## Step 1: Fork the Repository

1. Go to [github.com/javatarz/marginly](https://github.com/javatarz/marginly)
2. Click **Fork** to create your own copy
3. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/marginly.git
cd marginly
```

## Step 2: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Note your project's:
    - **Project URL** (e.g., `https://xxxx.supabase.co`)
    - **Anon public key** (found in Settings → API)
    - **Service role key** (found in Settings → API)
    - **Project ref** (the `xxxx` part of your URL)

3. Get a Supabase access token:
    - Go to [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
    - Generate a new token

## Step 3: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your forked repository
3. Configure environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |
| `SUPABASE_ACCESS_TOKEN` | Your Supabase access token |
| `SUPABASE_PROJECT_REF` | Your Supabase project ref |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |

4. Click **Deploy**

The first deployment will:

- Run database migrations automatically
- Build the Next.js application
- Deploy to Vercel's edge network

## Step 4: Add Yourself as Admin

1. Go to your Supabase dashboard → SQL Editor
2. Run:

```sql
INSERT INTO global_admins (user_email)
VALUES ('your-email@example.com');
```

3. Visit your deployed site and log in with that email
4. You'll receive a magic link to authenticate

## Step 5: Add Your First Book

See the [Author Guide](../author-guide/index.md) to set up your book repository and configure it in Marginly.

## Updating Your Instance

When new versions of Marginly are released:

1. Sync your fork with upstream
2. Push to your main branch
3. Vercel will automatically redeploy with new migrations

```bash
git fetch upstream
git merge upstream/main
git push origin main
```

## Troubleshooting

### Migrations not running

Ensure `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are set correctly in Vercel.

### Authentication not working

Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set and match your Supabase project.

### Build failing

Check the Vercel build logs. Common issues:

- Missing environment variables
- Supabase project not accessible (check your access token)
