# Chapter Migration

When you rename a chapter's slug in your `manifest.json`, Marginly creates a new chapter record. The old record becomes orphaned, with its comments, reading progress, and session data still attached to the old slug.

The chapter migration feature lets you move this data to the new slug and clean up the orphan.

## When You Need This

You'll see a warning on the admin dashboard when duplicate chapter numbers are detected:

> ⚠️ 1 book has duplicate chapters
>
> This can happen when chapter slugs change. Click to review and migrate data.

Common scenarios:

- Renaming `intro` to `01-introduction`
- Reorganizing chapter numbers
- Fixing typos in slugs

## Migration Process

### 1. Go to Manage Chapters

From the admin dashboard, click the warning banner or go to **Manage Chapters**.

### 2. Select the Book

Use the dropdown to select the affected book.

### 3. Review Duplicates

Chapters with duplicate numbers are highlighted in yellow. You'll see:

- The old slug (created earlier)
- The new slug (created when you updated the manifest)
- Linked data counts for each (comments, progress, sessions)

### 4. Migrate Data

Click **Migrate** on the old chapter (the one you want to remove). The migration dialog shows:

- Source (old slug): The chapter that will be deleted
- Target (new slug): Where data will be moved
- Data to migrate: Count of comments, progress records, and sessions

Click **Migrate Data** to proceed.

## What Gets Migrated

| Data | Migration behavior |
|------|-------------------|
| **Comments** | Moved to new slug, preserving all content and threads |
| **Reading progress** | Merged - keeps higher scroll percentage, sums time spent |
| **Reading sessions** | Moved to new slug |

After migration, the old chapter record is deleted.

## Edge Cases

### Reader has progress on both slugs

If a reader visited the chapter under both the old and new slug:

- Scroll percentage: keeps the higher value
- Time spent: sums both values
- Completion status: preserved if either was marked complete

### No data to migrate

If the old chapter has no linked data (e.g., it was "coming soon" and never accessed), you can still use migration to delete the orphaned record. The dialog will show "No data to migrate. The old chapter will be deleted."

## Preventing the Problem

To avoid orphaned chapters:

1. **Finalize slugs early** - Choose descriptive, stable slugs before inviting readers
2. **Use numbered prefixes** - `01-intro`, `02-setup` makes reorganization easier
3. **Migrate promptly** - Run migration soon after changing slugs, before readers accumulate more data on the orphan

## Technical Details

Migration is performed by the `migrate_chapter_slug` PostgreSQL function, which:

1. Verifies the caller is a global admin
2. Updates all `comments.chapter_slug` references
3. Merges `reading_progress` records (handling conflicts)
4. Updates all `reading_sessions.chapter_slug` references
5. Deletes the orphaned chapter record

The entire operation is atomic - if any step fails, nothing is changed.
