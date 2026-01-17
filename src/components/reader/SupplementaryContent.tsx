'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SupplementaryResource } from '@/lib/manifest';

interface SupplementaryContentProps {
  bookSlug: string;
  bookTitle: string;
  supplementary: SupplementaryResource;
}

const TYPE_LABELS: Record<string, string> = {
  bibliography: 'References',
  appendix: 'Appendix',
  glossary: 'Glossary',
  index: 'Index',
  other: 'Supplementary',
};

export function SupplementaryContent({
  bookSlug,
  bookTitle,
  supplementary,
}: SupplementaryContentProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      try {
        const response = await fetch(`/books/${bookSlug}/${supplementary.slug}.html`);
        if (!response.ok) {
          throw new Error('Content not found');
        }
        const html = await response.text();
        setContent(html);
      } catch (err) {
        setError('Failed to load content');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
  }, [bookSlug, supplementary.slug]);

  const typeLabel = TYPE_LABELS[supplementary.type] || 'Supplementary';

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href={`/${bookSlug}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← {bookTitle}
            </Link>
            <span className="text-sm text-gray-500">{typeLabel}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <article>
          <header className="mb-8">
            <p className="text-sm text-gray-500 mb-2">{typeLabel}</p>
            <h1 className="text-3xl font-bold text-ink">{supplementary.title}</h1>
          </header>

          {isLoading && (
            <div className="text-center py-12 text-gray-500">
              Loading content...
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-red-600">{error}</div>
          )}

          {!isLoading && !error && (
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </article>

        <nav className="mt-12 pt-8 border-t border-gray-200">
          <Link
            href={`/${bookSlug}`}
            className="text-accent hover:underline"
          >
            ← Back to {bookTitle}
          </Link>
        </nav>
      </main>
    </div>
  );
}
