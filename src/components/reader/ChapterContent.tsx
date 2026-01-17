'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Comment {
  id: string;
  anchor_text: string;
  anchor_paragraph: string;
  content: string;
  parent_id: string | null;
  is_resolved: boolean;
  created_at: string;
  user_id: string;
  profiles: { email: string } | null;
}

interface ReadingProgress {
  id: string;
  scroll_pct: number;
  time_spent_seconds: number;
  last_read_at: string;
  completed_at: string | null;
}

interface ChapterContentProps {
  bookSlug: string;
  chapterSlug: string;
  bookId: string;
  userId: string;
  initialProgress: ReadingProgress | null;
  initialComments: Comment[];
}

export function ChapterContent({
  bookSlug,
  chapterSlug,
  bookId,
  userId,
  initialProgress,
  initialComments,
}: ChapterContentProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [scrollPct, setScrollPct] = useState(initialProgress?.scroll_pct || 0);

  const supabase = createClient();

  // Load chapter HTML content
  useEffect(() => {
    async function loadContent() {
      try {
        // Try to load from public/books/{bookSlug}/{chapterSlug}.html
        const response = await fetch(`/books/${bookSlug}/${chapterSlug}.html`);
        if (!response.ok) {
          throw new Error('Chapter not found');
        }
        const html = await response.text();
        setContent(html);
      } catch (err) {
        setError('Failed to load chapter content');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadContent();
  }, [bookSlug, chapterSlug]);

  // Track scroll progress
  useEffect(() => {
    let lastSave = Date.now();
    const saveInterval = 5000; // Save every 5 seconds max

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = Math.round((scrollTop / docHeight) * 100);

      setScrollPct(pct);

      // Debounce saving
      if (Date.now() - lastSave > saveInterval) {
        saveProgress(pct);
        lastSave = Date.now();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      saveProgress(scrollPct);
    };
  }, [scrollPct]);

  const saveProgress = useCallback(async (pct: number) => {
    const completed = pct >= 90;

    await supabase.from('reading_progress').upsert({
      book_id: bookId,
      chapter_slug: chapterSlug,
      user_id: userId,
      scroll_pct: pct,
      last_read_at: new Date().toISOString(),
      completed_at: completed ? new Date().toISOString() : null,
    }, {
      onConflict: 'book_id,chapter_slug,user_id',
    });
  }, [bookId, chapterSlug, userId, supabase]);

  // Handle text selection for comments
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setSelectedText(selection.toString().trim());
      setShowCommentForm(true);
    }
  };

  // Submit new comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedText) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        book_id: bookId,
        chapter_slug: chapterSlug,
        user_id: userId,
        anchor_text: selectedText,
        anchor_paragraph: '', // TODO: Calculate paragraph ID
        content: newComment.trim(),
      })
      .select(`
        id,
        anchor_text,
        anchor_paragraph,
        content,
        parent_id,
        is_resolved,
        created_at,
        user_id
      `)
      .single();

    if (error) {
      console.error('Failed to save comment:', error);
      return;
    }

    if (data) {
      setComments([...comments, { ...data, profiles: null }]);
      setNewComment('');
      setSelectedText('');
      setShowCommentForm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500">
        Loading chapter...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-20">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${scrollPct}%` }}
        />
      </div>

      {/* Chapter content */}
      <div
        className="book-content prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
        onMouseUp={handleTextSelection}
      />

      {/* Comment form popup */}
      {showCommentForm && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 z-30">
          <div className="mb-2">
            <span className="text-sm text-gray-500">Commenting on:</span>
            <p className="text-sm italic text-gray-700 line-clamp-2">
              &ldquo;{selectedText}&rdquo;
            </p>
          </div>
          <form onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add your comment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              rows={3}
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCommentForm(false);
                  setSelectedText('');
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-3 py-1 text-sm bg-accent text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comments sidebar */}
      {comments.length > 0 && (
        <aside className="fixed right-4 top-20 w-72 max-h-[calc(100vh-6rem)] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-sm p-4 z-10">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">
            Comments ({comments.length})
          </h3>
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-2 rounded text-sm ${
                  comment.is_resolved ? 'bg-gray-50 opacity-60' : 'bg-yellow-50'
                }`}
              >
                <p className="text-xs text-gray-500 italic mb-1 line-clamp-1">
                  &ldquo;{comment.anchor_text}&rdquo;
                </p>
                <p className="text-gray-800">{comment.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {comment.profiles?.email?.split('@')[0] || 'Anonymous'} ·{' '}
                  {new Date(comment.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
