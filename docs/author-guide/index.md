# Author Guide

This guide explains how to set up your book content to work with Marginly.

## Overview

Marginly serves your book content from static HTML files. This means you can use any authoring toolchain you prefer (AsciiDoc, Markdown, LaTeX, etc.) as long as it outputs HTML.

The workflow is:

1. **Write** your content in your preferred format
2. **Build** HTML files using your toolchain
3. **Package** with a `manifest.json` describing your chapters
4. **Release** as a GitHub release with a tarball
5. **Configure** Marginly to fetch from your repository

## What You'll Need

- A GitHub repository for your book content
- A build pipeline that produces HTML chapters
- A `manifest.json` file describing your book structure

## Quick Start

### 1. Create your book repository

```
my-book/
├── manifest.json
├── 01-introduction.html
├── 02-getting-started.html
├── 03-advanced-topics.html
└── images/
    └── diagram.png
```

### 2. Create your manifest

```json
{
  "title": "My Book",
  "description": "A book about interesting things",
  "version": "v0.1",
  "versionName": "First Draft",
  "chapters": [
    { "slug": "01-introduction", "number": 1, "title": "Introduction", "status": "ready" },
    { "slug": "02-getting-started", "number": 2, "title": "Getting Started", "status": "ready" },
    { "slug": "03-advanced-topics", "number": 3, "title": "Advanced Topics", "status": "draft" }
  ]
}
```

### 3. Create a GitHub release

Package your built content (including `manifest.json`) into a tarball and create a GitHub release.

### 4. Configure Marginly

Add your book to the `BOOKS_CONFIG` environment variable in your Marginly deployment.

## Next Steps

- [Repository Setup](repository-setup.md) - Detailed structure requirements
- [Manifest Reference](manifest.md) - All manifest fields explained
- [Build Pipelines](build-pipelines.md) - Example toolchains for generating HTML
- [GitHub Releases](releases.md) - How to package and release your content
