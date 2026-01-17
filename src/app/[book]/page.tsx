import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ book: string }>;
}

export default async function BookPage({ params }: PageProps) {
  const { book: bookSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check access and get book details
  const { data: access } = await supabase
    .from('book_access')
    .select(`
      role,
      books (
        id,
        slug,
        title,
        description,
        version,
        version_name,
        changelog
      )
    `)
    .eq('user_id', user.id)
    .eq('books.slug', bookSlug)
    .single();

  if (!access || !access.books) {
    notFound();
  }

  const book = access.books as any;

  // Get chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', book.id)
    .order('number', { ascending: true });

  // Get user's reading progress
  const { data: progress } = await supabase
    .from('reading_progress')
    .select('chapter_slug, scroll_pct, completed_at')
    .eq('book_id', book.id)
    .eq('user_id', user.id);

  const progressMap = progress?.reduce((acc, p) => {
    acc[p.chapter_slug] = p;
    return acc;
  }, {} as Record<string, any>);

  // Get comment counts per chapter
  const { data: commentCounts } = await supabase
    .from('comments')
    .select('chapter_slug')
    .eq('book_id', book.id);

  const commentsPerChapter = commentCounts?.reduce((acc, c) => {
    acc[c.chapter_slug] = (acc[c.chapter_slug] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
          >
            ← All Books
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-ink">{book.title}</h1>
              {book.description && (
                <p className="text-gray-600 mt-1">{book.description}</p>
              )}
            </div>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {book.version_name || book.version}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {book.changelog && book.changelog.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <h3 className="font-semibold text-blue-900 mb-2">
              What&apos;s New in {book.version_name || book.version}
            </h3>
            <ul className="text-sm text-blue-800 list-disc list-inside">
              {book.changelog.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">Table of Contents</h2>

        {!chapters || chapters.length === 0 ? (
          <p className="text-gray-500">No chapters available yet.</p>
        ) : (
          <div className="space-y-2">
            {chapters.map((chapter) => {
              const chapterProgress = progressMap?.[chapter.slug];
              const isCompleted = chapterProgress?.completed_at;
              const isStarted = chapterProgress?.scroll_pct > 0;
              const commentCount = commentsPerChapter?.[chapter.slug] || 0;
              const isComingSoon = chapter.status === 'coming_soon';

              return (
                <div
                  key={chapter.id}
                  className={`
                    flex items-center justify-between p-4 rounded-lg border
                    ${isComingSoon
                      ? 'bg-gray-50 border-gray-200 text-gray-400'
                      : 'bg-white border-gray-200 hover:border-accent hover:shadow-sm'
                    }
                  `}
                >
                  {isComingSoon ? (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-300">○</span>
                      <span>
                        Chapter {chapter.number}: {chapter.title}
                      </span>
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded">
                        Coming Soon
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={`/${bookSlug}/${chapter.slug}`}
                      className="flex items-center gap-3 flex-1"
                    >
                      <span
                        className={
                          isCompleted
                            ? 'text-green-500'
                            : isStarted
                            ? 'text-yellow-500'
                            : 'text-gray-300'
                        }
                      >
                        {isCompleted ? '✓' : isStarted ? '◐' : '○'}
                      </span>
                      <span className="text-ink">
                        Chapter {chapter.number}: {chapter.title}
                      </span>
                      {chapter.status === 'draft' && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                          Draft
                        </span>
                      )}
                    </Link>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {commentCount > 0 && (
                      <span>{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
                    )}
                    {chapterProgress && !isComingSoon && (
                      <span>{chapterProgress.scroll_pct}% read</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
