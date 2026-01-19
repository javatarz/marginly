# GitHub Releases

Marginly fetches your book content from GitHub releases. This page explains how to package and release your content.

## Release Structure

Your release must include a `.tar.gz` archive containing:

```
archive-root/
├── manifest.json
├── chapter-1.html
├── chapter-2.html
├── images/
│   └── diagram.png
└── ...
```

## Manual Release

### 1. Build your content

```bash
# Run your build pipeline
./build.sh

# Verify manifest exists
cat build/manifest.json
```

### 2. Create a tarball

```bash
cd build
tar -czvf ../release.tar.gz .
cd ..
```

### 3. Create a GitHub release

1. Go to your repository → **Releases** → **Create a new release**
2. Choose a tag (e.g., `v1.0`, `draft-1`)
3. Add a title and description
4. Attach `release.tar.gz`
5. Publish the release

## Automated Release (GitHub Actions)

Automate releases when you push a tag:

```yaml
# .github/workflows/release.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build content
        run: |
          # Install your build tools
          # gem install asciidoctor  # for AsciiDoc
          # apt install pandoc       # for Markdown

          # Run your build
          ./build.sh

      - name: Create tarball
        run: |
          cd build
          tar -czvf ../release.tar.gz .

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: release.tar.gz
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Triggering a release

```bash
# Tag and push
git tag v1.0
git push origin v1.0
```

## Continuous Deployment

For automatic updates whenever you push to main:

```yaml
# .github/workflows/release.yml
name: Build and Release

on:
  push:
    branches:
      - main
    paths:
      - 'src/**'
      - 'manifest.template.json'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build content
        run: ./build.sh

      - name: Create tarball
        run: |
          cd build
          tar -czvf ../release.tar.gz .

      - name: Delete existing 'latest' release
        run: gh release delete latest --yes || true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          tag_name: latest
          name: Latest Build
          files: release.tar.gz
          prerelease: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This creates/updates a `latest` release on every push, which Marginly can track with `"release": "latest"` in your books config.

## Private Repositories

For private repositories:

1. Create a GitHub Personal Access Token with `repo` scope
2. Add it as `GITHUB_TOKEN` in your Marginly Vercel environment variables

## Marginly Configuration

After creating a release, configure Marginly to fetch it:

```json
{
  "books": [
    {
      "slug": "my-book",
      "source": {
        "type": "github-release",
        "repo": "yourusername/my-book-content",
        "release": "latest"
      }
    }
  ]
}
```

Set this as the `BOOKS_CONFIG` environment variable in Vercel, then trigger a redeployment.

## Updating Your Book

When you release a new version:

1. Create a new release (or update `latest`)
2. Trigger a Vercel redeployment:
    - Push any commit to your Marginly fork, or
    - Manually redeploy from Vercel dashboard

Marginly will:

1. Fetch the new release
2. Extract and replace the book content
3. Sync chapter metadata to the database

!!! note "Existing data preserved"
    Reader progress, comments, and analytics are preserved across updates. They're linked by chapter slug, not by release version.

## Versioning Strategy

| Approach | When to use |
|----------|-------------|
| **Tagged releases** (`v1.0`, `v2.0`) | Published versions, want to track history |
| **Rolling `latest`** | Active drafts, frequent updates |
| **Both** | Keep tagged milestones, use `latest` for Marginly |

For books in active development, we recommend the rolling `latest` approach with tagged releases at milestones.
