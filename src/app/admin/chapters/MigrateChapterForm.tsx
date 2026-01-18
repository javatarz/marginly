'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface MigrateChapterFormProps {
  bookId: string;
  sourceSlug: string;
  targetSlug: string;
  counts: {
    comments: number;
    progress: number;
    sessions: number;
  };
  hasLinkedData: boolean;
}

export function MigrateChapterForm({
  bookId,
  sourceSlug,
  targetSlug,
  counts,
  hasLinkedData,
}: MigrateChapterFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleMigrate = async () => {
    setIsSubmitting(true);
    setMessage(null);

    const { data, error } = await supabase.rpc('migrate_chapter_slug', {
      p_book_id: bookId,
      p_source_slug: sourceSlug,
      p_target_slug: targetSlug,
    });

    setIsSubmitting(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }

    const migrated = data?.migrated || {};
    const totalMigrated = (migrated.comments || 0) + (migrated.progress || 0) + (migrated.sessions || 0);

    const successText = totalMigrated > 0
      ? `Migrated ${migrated.comments || 0} comments, ${migrated.progress || 0} progress records, ${migrated.sessions || 0} sessions. Old chapter deleted.`
      : 'Old chapter deleted successfully.';

    setMessage({ type: 'success', text: successText });

    // Refresh the page after a short delay
    setTimeout(() => {
      router.refresh();
      setIsOpen(false);
    }, 2000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 transition-colors"
      >
        Migrate
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-ink mb-4">
          {hasLinkedData ? 'Migrate Chapter Data' : 'Delete Orphaned Chapter'}
        </h3>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Source (old slug):</p>
            <p className="font-mono text-sm bg-white px-2 py-1 rounded border">{sourceSlug}</p>
          </div>

          <div className="flex justify-center">
            <span className="text-gray-400">&darr;</span>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Target (new slug):</p>
            <p className="font-mono text-sm bg-white px-2 py-1 rounded border">{targetSlug}</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-blue-800 mb-2">Data to migrate:</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>{counts.comments} comment{counts.comments !== 1 ? 's' : ''}</li>
            <li>{counts.progress} reading progress record{counts.progress !== 1 ? 's' : ''}</li>
            <li>{counts.sessions} reading session{counts.sessions !== 1 ? 's' : ''}</li>
          </ul>
          {!hasLinkedData && (
            <p className="text-sm text-blue-600 mt-2 italic">
              No data to migrate. The old chapter will be deleted.
            </p>
          )}
        </div>

        {message && (
          <div
            className={`rounded-lg p-4 mb-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMigrate}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? (hasLinkedData ? 'Migrating...' : 'Deleting...')
              : (hasLinkedData ? 'Migrate Data' : 'Delete Old Chapter')}
          </button>
        </div>
      </div>
    </div>
  );
}
