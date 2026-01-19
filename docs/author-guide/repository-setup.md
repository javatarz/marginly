# Book Repository Setup

Your book content lives in a separate GitHub repository from Marginly. This keeps your content independent and allows you to use any build toolchain.

## Directory Structure

After building, your repository should contain:

```
my-book/
├── manifest.json          # Required: describes your book
├── 01-introduction.html   # Chapter files (HTML)
├── 02-getting-started.html
├── 03-advanced-topics.html
├── images/                # Optional: images referenced in chapters
│   ├── cover.png
│   └── diagram.svg
└── styles/                # Optional: custom CSS
    └── custom.css
```

## Chapter Files

### Requirements

- **Format**: HTML files
- **Naming**: Must match the `slug` in your manifest (e.g., `01-introduction.html` for slug `01-introduction`)
- **Content**: Can be full HTML documents or fragments

### HTML Structure

Marginly extracts the content from your HTML and renders it within its reader interface. You can provide either:

**Full HTML document:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Introduction</title>
</head>
<body>
  <h1>Introduction</h1>
  <p>Your chapter content here...</p>
</body>
</html>
```

**HTML fragment:**

```html
<h1>Introduction</h1>
<p>Your chapter content here...</p>
```

### Supported Elements

Marginly supports standard HTML elements:

- Headings (`h1` - `h6`)
- Paragraphs (`p`)
- Lists (`ul`, `ol`, `li`)
- Links (`a`)
- Images (`img`)
- Code blocks (`pre`, `code`)
- Tables (`table`, `tr`, `td`, `th`)
- Block quotes (`blockquote`)
- Emphasis (`em`, `strong`)

### Images

Reference images using relative paths:

```html
<img src="images/diagram.png" alt="Architecture diagram">
```

Images are served from your book's directory, so `images/diagram.png` will resolve correctly.

## Supplementary Content

For content that shouldn't appear in the main chapter list (appendices, glossaries, etc.), use the `supplementary` field in your manifest:

```json
{
  "chapters": [...],
  "supplementary": [
    { "slug": "glossary", "title": "Glossary" },
    { "slug": "appendix-a", "title": "Appendix A: Resources" }
  ]
}
```

These are accessible via direct URL but don't appear in the table of contents.

## Source vs Built Content

We recommend separating your source files from built output:

```
my-book-repo/
├── src/                    # Source files (AsciiDoc, Markdown, etc.)
│   ├── 01-introduction.adoc
│   └── 02-getting-started.adoc
├── build/                  # Built output (gitignored)
│   ├── manifest.json
│   ├── 01-introduction.html
│   └── 02-getting-started.html
├── manifest.template.json  # Template for generating manifest
└── build.sh               # Your build script
```

Your CI/CD pipeline builds the content and creates a release from the `build/` directory.
