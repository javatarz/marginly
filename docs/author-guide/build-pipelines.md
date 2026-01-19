# Build Pipelines

Marginly is agnostic to how you write your content. As long as you produce HTML files and a `manifest.json`, any toolchain works.

Here are common approaches for generating book content.

## AsciiDoc

[AsciiDoc](https://asciidoc.org/) is popular for technical books due to its rich feature set.

### Tools

- [Asciidoctor](https://asciidoctor.org/) - Ruby-based processor (most common)
- [Asciidoctor.js](https://github.com/asciidoctor/asciidoctor.js) - JavaScript port

### Example Build

```bash
# Install Asciidoctor
gem install asciidoctor

# Convert all .adoc files to HTML
for file in src/*.adoc; do
  asciidoctor -o "build/$(basename "$file" .adoc).html" "$file"
done
```

### GitHub Action

```yaml
- name: Build AsciiDoc
  uses: asciidoctor/github-action@v1
  with:
    source_dir: src/
    output_dir: build/
```

### Resources

- [Asciidoctor Documentation](https://docs.asciidoctor.org/)
- [AsciiDoc Syntax Quick Reference](https://docs.asciidoctor.org/asciidoc/latest/syntax-quick-reference/)

---

## Markdown

Markdown is simpler and widely supported.

### Tools

- [Pandoc](https://pandoc.org/) - Universal document converter
- [markdown-it](https://github.com/markdown-it/markdown-it) - JavaScript parser
- [Python-Markdown](https://python-markdown.github.io/) - Python implementation

### Example Build (Pandoc)

```bash
# Install Pandoc
# macOS: brew install pandoc
# Ubuntu: apt install pandoc

# Convert all .md files to HTML
for file in src/*.md; do
  pandoc -f markdown -t html -o "build/$(basename "$file" .md).html" "$file"
done
```

### GitHub Action

```yaml
- name: Build Markdown
  run: |
    for file in src/*.md; do
      pandoc -f markdown -t html -o "build/$(basename "$file" .md).html" "$file"
    done
```

### Resources

- [Pandoc User's Guide](https://pandoc.org/MANUAL.html)
- [CommonMark Spec](https://spec.commonmark.org/)

---

## LaTeX

For academic or heavily formatted content.

### Tools

- [Pandoc](https://pandoc.org/) - Can convert LaTeX to HTML
- [LaTeXML](https://dlmf.nist.gov/LaTeXML/) - LaTeX to XML/HTML converter
- [tex4ht](https://tug.org/tex4ht/) - TeX to HTML converter

### Example Build (Pandoc)

```bash
pandoc -f latex -t html --mathjax -o "build/chapter.html" "src/chapter.tex"
```

### Resources

- [Pandoc LaTeX Documentation](https://pandoc.org/MANUAL.html#creating-a-pdf)

---

## Static Site Generators

You can also use documentation tools and extract the HTML.

### Tools

- [mdBook](https://rust-lang.github.io/mdBook/) - Rust-based, great for technical books
- [Sphinx](https://www.sphinx-doc.org/) - Python documentation tool
- [Hugo](https://gohugo.io/) - Fast static site generator

---

## Generating the Manifest

You can generate `manifest.json` automatically from your source files.

### Example Script

```bash
#!/bin/bash
# generate-manifest.sh

echo '{'
echo '  "title": "My Book",'
echo '  "version": "v1.0",'
echo '  "chapters": ['

num=1
first=true
for file in build/*.html; do
  slug=$(basename "$file" .html)
  title=$(grep -oP '(?<=<title>).*(?=</title>)' "$file" || echo "$slug")

  if [ "$first" = true ]; then
    first=false
  else
    echo ','
  fi

  printf '    { "slug": "%s", "number": %d, "title": "%s", "status": "ready" }' "$slug" "$num" "$title"
  ((num++))
done

echo ''
echo '  ]'
echo '}'
```

### Node.js Example

```javascript
const fs = require('fs');
const path = require('path');

const chapters = fs.readdirSync('build')
  .filter(f => f.endsWith('.html'))
  .sort()
  .map((file, index) => ({
    slug: path.basename(file, '.html'),
    number: index + 1,
    title: extractTitle(file), // implement based on your HTML structure
    status: 'ready'
  }));

const manifest = {
  title: 'My Book',
  version: 'v1.0',
  chapters
};

fs.writeFileSync('build/manifest.json', JSON.stringify(manifest, null, 2));
```

---

## CI/CD Integration

We recommend building and releasing in CI. See [GitHub Releases](releases.md) for complete examples.
