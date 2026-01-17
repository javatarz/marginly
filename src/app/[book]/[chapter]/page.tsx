import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChapterContent } from '@/components/reader/ChapterContent';

interface PageProps {
  params: Promise<{ book: string; chapter: string }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { book: bookSlug, chapter: chapterSlug } = await params;
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
      books!inner (
        id,
        slug,
        title
      )
    `)
    .eq('user_id', user.id)
    .eq('books.slug', bookSlug)
    .single();

  if (!access || !access.books) {
    notFound();
  }

  const book = access.books as any;

  // Get chapter details
  const { data: chapter } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', book.id)
    .eq('slug', chapterSlug)
    .single();

  if (!chapter || chapter.status === 'coming_soon') {
    notFound();
  }

  // Get all chapters for navigation
  const { data: allChapters } = await supabase
    .from('chapters')
    .select('slug, number, title, status')
    .eq('book_id', book.id)
    .order('number', { ascending: true });

  const currentIndex = allChapters?.findIndex((c) => c.slug === chapterSlug) ?? -1;
  const prevChapter = currentIndex > 0 ? allChapters?.[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < (allChapters?.length ?? 0) - 1
      ? allChapters?.[currentIndex + 1]
      : null;

  // Get comments for this chapter
  const { data: rawComments } = await supabase
    .from('comments')
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
    .eq('book_id', book.id)
    .eq('chapter_slug', chapterSlug)
    .order('created_at', { ascending: true });

  // Transform comments to match expected type
  const comments = rawComments?.map((c) => ({
    ...c,
    profiles: null as { email: string } | null,
  })) || [];

  // Get or create reading progress
  const { data: progress } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('book_id', book.id)
    .eq('chapter_slug', chapterSlug)
    .eq('user_id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href={`/${bookSlug}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← {book.title}
            </Link>
            <span className="text-sm text-gray-500">
              Chapter {chapter.number} of {allChapters?.filter(c => c.status !== 'coming_soon').length}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <article>
          <header className="mb-8">
            <p className="text-sm text-gray-500 mb-2">
              Chapter {chapter.number}
            </p>
            <h1 className="text-3xl font-bold text-ink">{chapter.title}</h1>
            {chapter.status === 'draft' && (
              <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                Early Draft - Feedback Welcome
              </span>
            )}
          </header>

          <ChapterContent
            bookSlug={bookSlug}
            chapterSlug={chapterSlug}
            bookId={book.id}
            userId={user.id}
            initialProgress={progress}
            initialComments={comments}
          />
        </article>

        <nav className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex justify-between">
            {prevChapter && prevChapter.status !== 'coming_soon' ? (
              <Link
                href={`/${bookSlug}/${prevChapter.slug}`}
                className="text-accent hover:underline"
              >
                ← Chapter {prevChapter.number}: {prevChapter.title}
              </Link>
            ) : (
              <span />
            )}
            {nextChapter && nextChapter.status !== 'coming_soon' ? (
              <Link
                href={`/${bookSlug}/${nextChapter.slug}`}
                className="text-accent hover:underline"
              >
                Chapter {nextChapter.number}: {nextChapter.title} →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </nav>
      </main>
    </div>
  );
}
