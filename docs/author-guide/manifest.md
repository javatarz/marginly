# Manifest Reference

The `manifest.json` file describes your book's structure and metadata. It must be included in the root of your release tarball.

## Full Example

```json
{
  "title": "The Art of Writing",
  "description": "A comprehensive guide to crafting compelling prose",
  "version": "v1.2",
  "versionName": "Second Edition",
  "chapters": [
    { "slug": "01-introduction", "number": 1, "title": "Introduction", "status": "ready" },
    { "slug": "02-finding-voice", "number": 2, "title": "Finding Your Voice", "status": "ready" },
    { "slug": "03-structure", "number": 3, "title": "Story Structure", "status": "ready" },
    { "slug": "04-dialogue", "number": 4, "title": "Writing Dialogue", "status": "draft" },
    { "slug": "05-editing", "number": 5, "title": "Self-Editing", "status": "coming-soon" }
  ],
  "supplementary": [
    { "slug": "glossary", "title": "Glossary of Terms" },
    { "slug": "resources", "title": "Additional Resources" }
  ]
}
```

## Book Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | The book's display title |
| `description` | string | No | Brief description shown in book listings |
| `version` | string | No | Version identifier (e.g., `v1.0`, `draft-3`) |
| `versionName` | string | No | Human-readable version name (e.g., `First Draft`, `Beta 2`) |

## Chapters Array

The `chapters` array defines the main content of your book, displayed in the table of contents.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | Yes | URL-safe identifier, must match the HTML filename (without `.html`) |
| `number` | integer | Yes | Chapter number for ordering and display |
| `title` | string | Yes | Chapter title shown in table of contents |
| `status` | string | No | Publication status (see below). Defaults to `draft` |

### Chapter Statuses

| Status | Behavior |
|--------|----------|
| `draft` | Visible to readers, marked as draft |
| `ready` | Visible to readers, ready for feedback |
| `published` | Visible to readers, considered final |
| `coming-soon` | Listed in TOC but not accessible, shows "Coming Soon" |

!!! tip "Status workflow"
    A typical workflow: `coming-soon` → `draft` → `ready` → `published`

    Use `coming-soon` for chapters you've planned but not yet written. This lets readers see the book's planned structure.

## Supplementary Array

Optional content that doesn't appear in the main chapter list.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | Yes | URL-safe identifier |
| `title` | string | Yes | Display title |

Supplementary content is accessible via direct URL (`/book-slug/supplementary-slug`) but isn't shown in the table of contents.

## Slug Guidelines

Slugs must be:

- URL-safe (lowercase letters, numbers, hyphens)
- Unique within the book
- Matching the HTML filename (e.g., slug `intro` requires `intro.html`)

!!! warning "Changing slugs"
    If you change a chapter's slug after readers have left comments or reading progress, you'll need to use the [chapter migration](../admin-guide/chapter-migration.md) feature to move their data to the new slug.

## Validation

Marginly validates your manifest during sync. Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| Duplicate chapter number | Two chapters have the same `number` | Ensure each chapter has a unique number |
| Missing HTML file | Slug doesn't match any `.html` file | Check filename matches slug exactly |
| Invalid JSON | Syntax error in manifest | Validate JSON at [jsonlint.com](https://jsonlint.com) |
