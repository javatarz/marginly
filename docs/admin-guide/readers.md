# Managing Readers

Marginly uses an invite-only access model. Readers must be explicitly invited before they can access your books.

## Access Model

There are two types of access:

| Type | Scope | Use case |
|------|-------|----------|
| **Global Admin** | All books | Platform owner, main author |
| **Book Access** | Specific book | Beta readers, editors |

## Inviting Readers

### Via Admin Dashboard

1. Log in as a global admin
2. Go to **Admin Dashboard** → **Manage Readers**
3. Enter the reader's email address
4. Select the book they should access
5. Click **Invite**

The reader will receive a magic link email when they try to log in.

### Via SQL (Bulk Invites)

For inviting many readers at once:

```sql
-- Invite multiple readers to a book
INSERT INTO book_access (book_id, user_email)
SELECT
  (SELECT id FROM books WHERE slug = 'my-book'),
  email
FROM (VALUES
  ('reader1@example.com'),
  ('reader2@example.com'),
  ('reader3@example.com')
) AS invites(email);
```

## Adding Global Admins

Global admins have access to all books and the admin dashboard.

```sql
INSERT INTO global_admins (user_email)
VALUES ('admin@example.com');
```

## Reader Experience

When an invited reader visits your Marginly instance:

1. They enter their email on the login page
2. If their email is in `book_access` or `global_admins`, they receive a magic link
3. Clicking the link authenticates them
4. They see books they have access to

!!! note "No password required"
    Marginly uses passwordless authentication via magic links. Readers don't need to create accounts or remember passwords.

## Viewing Reader Activity

### Reading Progress

The admin dashboard shows:

- Which chapters each reader has viewed
- Scroll percentage (how far they've read)
- Time spent reading
- Last activity timestamp

### Via SQL

```sql
-- See all reading progress for a book
SELECT
  u.email,
  rp.chapter_slug,
  rp.scroll_pct,
  rp.time_spent_seconds,
  rp.last_read_at
FROM reading_progress rp
JOIN auth.users u ON u.id = rp.user_id
JOIN books b ON b.id = rp.book_id
WHERE b.slug = 'my-book'
ORDER BY rp.last_read_at DESC;
```

## Revoking Access

### Remove Book Access

```sql
DELETE FROM book_access
WHERE user_email = 'reader@example.com'
  AND book_id = (SELECT id FROM books WHERE slug = 'my-book');
```

### Remove Global Admin

```sql
DELETE FROM global_admins
WHERE user_email = 'admin@example.com';
```

## Access Control Details

Marginly uses Supabase Row Level Security (RLS) to enforce access:

- Readers can only see books they're invited to
- Readers can only see their own reading progress
- Readers can only see comments on books they can access
- Global admins can see all data for all books

This is enforced at the database level, so it applies regardless of how the data is accessed.
