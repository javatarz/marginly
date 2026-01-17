#!/usr/bin/env node
// Fetch book content from configured sources (GitHub releases)
//
// Reads books.config.json and downloads release artifacts to public/books/
//
// Usage:
//   node scripts/fetch-books.mjs                    # Fetch all books
//   node scripts/fetch-books.mjs --book=my-book     # Fetch specific book
//
// Environment:
//   GITHUB_TOKEN - Required for private repos (repo scope)

import { readFile, mkdir, rm, writeFile } from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { extract } from 'tar';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const BOOKS_DIR = join(ROOT_DIR, 'public', 'books');
const CONFIG_PATH = join(ROOT_DIR, 'books.config.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

async function loadConfig() {
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Failed to read books.config.json:', err.message);
    process.exit(1);
  }
}

async function fetchGitHubRelease(repo, release) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'book-review-platform',
  };

  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  // Get release info
  // Note: /releases/latest excludes pre-releases, so for 'latest' we fetch all and take first
  const releaseUrl = release === 'latest'
    ? `https://api.github.com/repos/${repo}/releases`
    : `https://api.github.com/repos/${repo}/releases/tags/${release}`;

  console.log(`  Fetching release info from ${releaseUrl}`);

  const response = await fetch(releaseUrl, { headers });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Release not found: ${release}`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('GitHub authentication failed. Set GITHUB_TOKEN for private repos.');
    }
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // If fetching 'latest', we got an array - return the first (most recent) release
  if (release === 'latest') {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No releases found');
    }
    return data[0];
  }

  return data;
}

async function downloadAndExtract(url, destDir, headers) {
  console.log(`  Downloading from ${url}`);

  const response = await fetch(url, {
    headers: {
      ...headers,
      'Accept': 'application/octet-stream',
    },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  // Ensure destination directory exists and is empty
  if (existsSync(destDir)) {
    await rm(destDir, { recursive: true });
  }
  await mkdir(destDir, { recursive: true });

  // Create a temporary file for the tarball
  const tarballPath = join(destDir, '_temp.tar.gz');
  const fileStream = createWriteStream(tarballPath);

  // Download to temp file
  await pipeline(response.body, fileStream);

  console.log(`  Extracting to ${destDir}`);

  // Extract tarball
  await extract({
    file: tarballPath,
    cwd: destDir,
    strip: 1, // Remove top-level directory from archive
  });

  // Clean up temp file
  await rm(tarballPath);
}

async function fetchBook(bookConfig) {
  const { slug, source } = bookConfig;
  const destDir = join(BOOKS_DIR, slug);

  console.log(`\nFetching book: ${slug}`);

  if (source.type !== 'github-release') {
    console.log(`  Skipping: unsupported source type "${source.type}"`);
    return false;
  }

  try {
    const releaseInfo = await fetchGitHubRelease(source.repo, source.release);
    console.log(`  Release: ${releaseInfo.tag_name} (${releaseInfo.name || 'unnamed'})`);

    // Look for tarball asset or use source tarball
    const tarballAsset = releaseInfo.assets?.find(a =>
      a.name.endsWith('.tar.gz') || a.name.endsWith('.tgz')
    );

    const downloadUrl = tarballAsset?.browser_download_url || releaseInfo.tarball_url;

    if (!downloadUrl) {
      throw new Error('No downloadable archive found in release');
    }

    const headers = {
      'User-Agent': 'book-review-platform',
    };
    if (GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
    }

    await downloadAndExtract(downloadUrl, destDir, headers);

    // Verify manifest.json exists
    const manifestPath = join(destDir, 'manifest.json');
    if (!existsSync(manifestPath)) {
      throw new Error('manifest.json not found in extracted content');
    }

    // Read and validate manifest
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
    const chapterCount = manifest.chapters?.length || (Array.isArray(manifest) ? manifest.length : 0);
    const suppCount = manifest.supplementary?.length || 0;

    console.log(`  ✓ Fetched: ${chapterCount} chapters, ${suppCount} supplementary`);

    // Write fetch metadata
    await writeFile(
      join(destDir, '.fetch-metadata.json'),
      JSON.stringify({
        fetchedAt: new Date().toISOString(),
        source: source,
        release: releaseInfo.tag_name,
        releaseName: releaseInfo.name,
        publishedAt: releaseInfo.published_at,
      }, null, 2)
    );

    return true;
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Fetch Books ===');

  // Parse CLI args
  const args = process.argv.slice(2);
  const bookArg = args.find(a => a.startsWith('--book='));
  const targetBook = bookArg?.split('=')[1];

  const config = await loadConfig();
  let books = config.books || [];

  if (targetBook) {
    books = books.filter(b => b.slug === targetBook);
    if (books.length === 0) {
      console.error(`Book not found in config: ${targetBook}`);
      process.exit(1);
    }
  }

  console.log(`\nFound ${books.length} book(s) to fetch`);

  if (!GITHUB_TOKEN) {
    console.log('Note: GITHUB_TOKEN not set. Private repos will fail.');
  }

  let successCount = 0;
  let failCount = 0;

  for (const book of books) {
    const success = await fetchBook(book);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n=== Fetch Complete ===`);
  console.log(`Success: ${successCount}, Failed: ${failCount}`);

  if (failCount > 0 && successCount === 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
