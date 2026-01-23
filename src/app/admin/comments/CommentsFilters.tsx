'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Chapter {
  slug: string;
  title: string;
  number: number;
}

interface CommentsFiltersProps {
  chapters: Chapter[];
}

export function CommentsFilters({ chapters }: CommentsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChapter = searchParams.get('chapter') || '';
  const currentResolved = searchParams.get('resolved') || '';

  const handleChapterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('chapter', value);
    } else {
      params.delete('chapter');
    }
    router.push(`/admin/comments?${params.toString()}`);
  };

  const handleResolvedChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('resolved', value);
    } else {
      params.delete('resolved');
    }
    router.push(`/admin/comments?${params.toString()}`);
  };

  const hasFilters = currentChapter || currentResolved;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="text-sm text-gray-600 mr-2">Chapter:</label>
          <select
            name="chapter"
            value={currentChapter}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            onChange={(e) => handleChapterChange(e.target.value)}
          >
            <option value="">All chapters</option>
            {chapters.map((ch) => (
              <option key={ch.slug} value={ch.slug}>
                Ch {ch.number}: {ch.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm text-gray-600 mr-2">Status:</label>
          <select
            name="resolved"
            value={currentResolved}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            onChange={(e) => handleResolvedChange(e.target.value)}
          >
            <option value="">All comments</option>
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
          </select>
        </div>

        {hasFilters && (
          <Link
            href="/admin/comments"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}
