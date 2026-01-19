# Marginly

A platform for authors to share early drafts with beta readers and collect inline feedback.

## What is Marginly?

Marginly helps authors gather feedback on their work before publication. It provides:

- **Invite-only access** - Control exactly who can read your drafts
- **Inline comments** - Readers highlight text and leave contextual feedback
- **Reading analytics** - See which chapters are being read and how far readers progress
- **Version management** - Track different versions of your book as it evolves

## Who is this for?

- **Authors** writing books, documentation, or long-form content who want structured feedback
- **Beta readers** who want to provide helpful, contextual comments
- **Technical writers** managing documentation with review workflows

## Getting Started

<div class="grid cards" markdown>

-   :material-rocket-launch:{ .lg .middle } **Deploy Your Own**

    ---

    Set up your own Marginly instance on Vercel + Supabase

    [:octicons-arrow-right-24: Deploy guide](getting-started/deploy.md)

-   :material-book-edit:{ .lg .middle } **Author Guide**

    ---

    Set up your book repository and integrate with Marginly

    [:octicons-arrow-right-24: Author guide](author-guide/index.md)

-   :material-account-group:{ .lg .middle } **Admin Guide**

    ---

    Manage readers, view analytics, handle chapter migrations

    [:octicons-arrow-right-24: Admin guide](admin-guide/readers.md)

</div>

## Architecture Overview

Marginly is built with:

- **Next.js 14** (App Router) - React framework for the frontend
- **Supabase** - PostgreSQL database with authentication and row-level security
- **Tailwind CSS** - Styling
- **Vercel** - Recommended hosting platform

Books are stored as static HTML files, with metadata synced to the database. This allows authors to use any toolchain (AsciiDoc, Markdown, LaTeX) to produce their content.

## License

Marginly is open source software licensed under the MIT License.
