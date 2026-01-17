#!/usr/bin/env node
// Sync books and chapters from public/books/ to Supabase
//
// Scans public/books/*/ directories for manifest.json files and upserts
// book and chapter metadata to the database.
//
// Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-books.mjs

import { createClient } from '@supabase/supabase-js';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = join(__dirname, '..', 'public', 'books');

// Initialize Supabase client with service role key (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function discoverBooks() {
  const books = [];

  try {
    const entries = await readdir(BOOKS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const manifestPath = join(BOOKS_DIR, entry.name, 'manifest.json');

      try {
        const manifestContent = await readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        books.push({
          slug: entry.name,
          manifest,
          path: manifestPath
        });

        console.log(`Found book: ${entry.name}`);
      } catch (err) {
        // No manifest.json, skip this directory
        console.log(`Skipping ${entry.name}: no manifest.json`);
      }
    }
  } catch (err) {
    console.error(`Error reading books directory: ${err.message}`);
  }

  return books;
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function parseManifest(manifest) {
  // v2 format: { version: 2, chapters: [...], supplementary: [...] }
  // v1 format: [...] (array of chapters directly) or { chapters: [...] }
  const isV2 = manifest.version === 2;

  if (isV2) {
    return {
      version: 2,
      book: manifest.book || {},
      chapters: manifest.chapters || [],
      supplementary: manifest.supplementary || []
    };
  }

  // v1 format
  return {
    version: 1,
    book: manifest.book || {},
    chapters: Array.isArray(manifest) ? manifest : (manifest.chapters || []),
    supplementary: []
  };
}

async function syncBook(bookData) {
  const { slug, manifest: rawManifest } = bookData;

  const manifest = parseManifest(rawManifest);
  const { book: bookMeta, chapters } = manifest;

  // Upsert book
  const now = new Date().toISOString();
  const bookRecord = {
    slug,
    title: bookMeta.title || titleFromSlug(slug),
    description: bookMeta.description || null,
    version: bookMeta.version || 'v0.1',
    version_name: bookMeta.version_name || null,
    is_active: true,
    updated_at: now,
    last_synced_at: now
  };

  console.log(`Syncing book: ${bookRecord.title} (${slug})`);

  const { data: book, error: bookError } = await supabase
    .from('books')
    .upsert(bookRecord, { onConflict: 'slug' })
    .select()
    .single();

  if (bookError) {
    console.error(`Error upserting book ${slug}:`, bookError.message);
    return null;
  }

  console.log(`  Book ID: ${book.id}`);
  console.log(`  Manifest version: ${manifest.version}`);

  // Upsert chapters
  if (Array.isArray(chapters) && chapters.length > 0) {
    const chapterRecords = chapters.map(ch => ({
      book_id: book.id,
      slug: ch.slug,
      number: ch.number,
      title: ch.title,
      status: ch.status || 'draft',
      updated_at: new Date().toISOString()
    }));

    const { error: chaptersError } = await supabase
      .from('chapters')
      .upsert(chapterRecords, { onConflict: 'book_id,slug' });

    if (chaptersError) {
      console.error(`Error upserting chapters for ${slug}:`, chaptersError.message);
    } else {
      console.log(`  Synced ${chapters.length} chapters`);
    }
  }

  // Log supplementary content (not stored in DB, read from manifest at runtime)
  if (manifest.supplementary.length > 0) {
    console.log(`  Found ${manifest.supplementary.length} supplementary resources (served from manifest)`);
  }

  return book;
}

async function main() {
  console.log('=== Book Sync Started ===\n');

  const books = await discoverBooks();

  if (books.length === 0) {
    console.log('No books found in public/books/');
    return;
  }

  console.log(`\nFound ${books.length} book(s)\n`);

  for (const book of books) {
    await syncBook(book);
    console.log('');
  }

  console.log('=== Book Sync Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
