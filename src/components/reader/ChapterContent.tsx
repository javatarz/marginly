'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// Comment selection only captures text within chapter content

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

const IDLE_TIMEOUT = 60000; // 1 minute of inactivity pauses timer

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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [scrollPct, setScrollPct] = useState(initialProgress?.scroll_pct || 0);

  // Time tracking state
  const [timeSpent, setTimeSpent] = useState(initialProgress?.time_spent_seconds || 0);
  const lastActivityRef = useRef(Date.now());
  const isActiveRef = useRef(true);
  const sessionIdRef = useRef<string | null>(null);
  const maxScrollRef = useRef(initialProgress?.scroll_pct || 0);
  const contentRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Scroll restoration - restore position after content loads
  useEffect(() => {
    if (!isLoading && content && initialProgress?.scroll_pct) {
      // Wait a tick for content to render
      setTimeout(() => {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollTo = (initialProgress.scroll_pct / 100) * docHeight;
        window.scrollTo({ top: scrollTo, behavior: 'instant' });
      }, 100);
    }
  }, [isLoading, content, initialProgress?.scroll_pct]);

  // Create reading session on mount
  useEffect(() => {
    async function createSession() {
      const { data } = await supabase
        .from('reading_sessions')
        .insert({
          user_id: userId,
          book_id: bookId,
          chapter_slug: chapterSlug,
          started_at: new Date().toISOString(),
          max_scroll_pct: 0,
          user_agent: navigator.userAgent,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
        })
        .select('id')
        .single();

      if (data) {
        sessionIdRef.current = data.id;
      }
    }

    createSession();

    // End session on unmount
    return () => {
      if (sessionIdRef.current) {
        supabase
          .from('reading_sessions')
          .update({
            ended_at: new Date().toISOString(),
            max_scroll_pct: maxScrollRef.current,
          })
          .eq('id', sessionIdRef.current)
          .then(() => {});
      }
    };
  }, [bookId, chapterSlug, userId, supabase]);

  // Time tracking with idle detection
  useEffect(() => {
    const timer = setInterval(() => {
      if (isActiveRef.current) {
        setTimeSpent((prev) => prev + 1);
      }
    }, 1000);

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      isActiveRef.current = true;
    };

    const checkIdle = setInterval(() => {
      if (Date.now() - lastActivityRef.current > IDLE_TIMEOUT) {
        isActiveRef.current = false;
      }
    }, 10000);

    // Activity listeners
    window.addEventListener('scroll', handleActivity, { passive: true });
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });

    return () => {
      clearInterval(timer);
      clearInterval(checkIdle);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, []);

  // Track scroll progress
  useEffect(() => {
    let lastSave = Date.now();
    const saveInterval = 5000; // Save every 5 seconds max

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      setScrollPct(pct);

      // Track max scroll for session
      if (pct > maxScrollRef.current) {
        maxScrollRef.current = pct;
      }

      // Debounce saving
      if (Date.now() - lastSave > saveInterval) {
        saveProgress(pct, timeSpent);
        lastSave = Date.now();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [timeSpent]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      saveProgress(scrollPct, timeSpent);
    };
  }, [scrollPct, timeSpent]);

  const saveProgress = useCallback(async (pct: number, seconds: number) => {
    const completed = pct >= 90;

    await supabase.from('reading_progress').upsert({
      book_id: bookId,
      chapter_slug: chapterSlug,
      user_id: userId,
      scroll_pct: pct,
      time_spent_seconds: seconds,
      last_read_at: new Date().toISOString(),
      completed_at: completed ? new Date().toISOString() : null,
    }, {
      onConflict: 'book_id,chapter_slug,user_id',
    });
  }, [bookId, chapterSlug, userId, supabase]);

  // Handle text selection for comments
  const handleMouseDown = useCallback(() => {
    isSelectingRef.current = true;
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = null;
    }
  }, []);

  const handleTextSelection = useCallback(() => {
    if (!isSelectingRef.current) return;

    // Clear any existing timeout
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }

    // Wait for selection to stabilize (user finished dragging)
    selectionTimeoutRef.current = setTimeout(() => {
      isSelectingRef.current = false;

      const selection = window.getSelection();
      if (!selection || selection.toString().trim().length === 0) {
        return;
      }

      // Check if the selection is within the content element
      const range = selection.getRangeAt(0);
      const contentEl = contentRef.current;

      if (contentEl && contentEl.contains(range.commonAncestorContainer)) {
        setSelectedText(selection.toString().trim());
        setShowCommentForm(true);
      }
    }, 200);
  }, []);

  // Submit new comment or reply
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!replyingTo && !selectedText) return;

    const parentComment = replyingTo ? comments.find(c => c.id === replyingTo) : null;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        book_id: bookId,
        chapter_slug: chapterSlug,
        user_id: userId,
        anchor_text: replyingTo ? (parentComment?.anchor_text || '') : selectedText,
        anchor_paragraph: '',
        content: newComment.trim(),
        parent_id: replyingTo || null,
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
      setReplyingTo(null);
    }
  };

  // Toggle comment resolved status
  const handleToggleResolved = async (commentId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('comments')
      .update({ is_resolved: !currentStatus })
      .eq('id', commentId);

    if (error) {
      console.error('Failed to update comment:', error);
      return;
    }

    setComments(comments.map(c =>
      c.id === commentId ? { ...c, is_resolved: !currentStatus } : c
    ));
  };

  // Get threaded comments (parent comments with their replies)
  const getThreadedComments = () => {
    const parentComments = comments.filter(c => !c.parent_id);
    const filteredParents = showResolved
      ? parentComments
      : parentComments.filter(c => !c.is_resolved);

    return filteredParents.map(parent => ({
      ...parent,
      replies: comments.filter(c => c.parent_id === parent.id),
    }));
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
        ref={contentRef}
        className="book-content prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleTextSelection}
      />

      {/* Comment form popup */}
      {(showCommentForm || replyingTo) && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 z-30">
          <div className="mb-2">
            <span className="text-sm text-gray-500">
              {replyingTo ? 'Replying to comment' : 'Commenting on:'}
            </span>
            {!replyingTo && selectedText && (
              <p className="text-sm italic text-gray-700 line-clamp-2">
                &ldquo;{selectedText}&rdquo;
              </p>
            )}
          </div>
          <form onSubmit={handleSubmitComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? 'Write your reply...' : 'Add your comment...'}
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
                  setReplyingTo(null);
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
                {replyingTo ? 'Reply' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comments sidebar */}
      {comments.length > 0 && (
        <aside className="fixed right-4 top-20 w-80 max-h-[calc(100vh-6rem)] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-sm p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">
              Comments ({comments.filter(c => !c.parent_id).length})
            </h3>
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded"
              />
              Show resolved
            </label>
          </div>
          <div className="space-y-4">
            {getThreadedComments().map((thread) => (
              <div key={thread.id} className="space-y-2">
                {/* Parent comment */}
                <div
                  className={`p-3 rounded-lg text-sm ${
                    thread.is_resolved ? 'bg-gray-50' : 'bg-yellow-50'
                  }`}
                >
                  <p className="text-xs text-gray-500 italic mb-1 line-clamp-1">
                    &ldquo;{thread.anchor_text}&rdquo;
                  </p>
                  <p className="text-gray-800">{thread.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">
                      {new Date(thread.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReplyingTo(thread.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => handleToggleResolved(thread.id, thread.is_resolved)}
                        className={`text-xs ${
                          thread.is_resolved
                            ? 'text-gray-500 hover:text-gray-700'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {thread.is_resolved ? 'Reopen' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {thread.replies.length > 0 && (
                  <div className="ml-4 space-y-2 border-l-2 border-gray-200 pl-3">
                    {thread.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="p-2 rounded bg-gray-50 text-sm"
                      >
                        <p className="text-gray-800">{reply.content}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(reply.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
