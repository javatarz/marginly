import { readFile } from 'fs/promises';
import { join } from 'path';

export interface Chapter {
  slug: string;
  title: string;
  number: number;
  status: 'ready' | 'draft' | 'coming_soon';
}

export interface SupplementaryResource {
  slug: string;
  title: string;
  type: 'bibliography' | 'appendix' | 'glossary' | 'index' | 'other';
}

export interface Manifest {
  version: 1 | 2;
  book?: {
    title?: string;
    description?: string;
    version?: string;
    version_name?: string;
  };
  chapters: Chapter[];
  supplementary: SupplementaryResource[];
}

function parseManifest(raw: unknown): Manifest {
  const manifest = raw as Record<string, unknown>;
  const isV2 = manifest.version === 2;

  if (isV2) {
    return {
      version: 2,
      book: (manifest.book as Manifest['book']) || {},
      chapters: (manifest.chapters as Chapter[]) || [],
      supplementary: (manifest.supplementary as SupplementaryResource[]) || [],
    };
  }

  // v1 format
  return {
    version: 1,
    book: (manifest.book as Manifest['book']) || {},
    chapters: Array.isArray(manifest)
      ? (manifest as Chapter[])
      : ((manifest.chapters as Chapter[]) || []),
    supplementary: [],
  };
}

export async function getManifest(bookSlug: string): Promise<Manifest | null> {
  try {
    const manifestPath = join(
      process.cwd(),
      'public',
      'books',
      bookSlug,
      'manifest.json'
    );
    const content = await readFile(manifestPath, 'utf-8');
    const raw = JSON.parse(content);
    return parseManifest(raw);
  } catch {
    return null;
  }
}

export function findSupplementary(
  manifest: Manifest,
  slug: string
): SupplementaryResource | undefined {
  return manifest.supplementary.find((s) => s.slug === slug);
}
