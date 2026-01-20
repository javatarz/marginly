import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChapterContent } from '@/components/reader/ChapterContent';
import { getManifest, findSupplementary } from '@/lib/manifest';
import { SupplementaryContent } from '@/components/reader/SupplementaryContent';

interface PageProps {
  params: Promise<{ book: string; chapter: string }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { book: bookSlug, chapter: contentSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get book details (RLS handles access control)
  const { data: book } = await supabase
    .from('books')
    .select('id, slug, title')
    .eq('slug', bookSlug)
    .eq('is_active', true)
    .single();

  if (!book) {
    notFound();
  }

  // Try to get chapter details first
  const { data: chapter } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', book.id)
    .eq('slug', contentSlug)
    .single();

  // If not a chapter, check if it's supplementary content
  if (!chapter) {
    const manifest = await getManifest(bookSlug);
    const supplementary = manifest ? findSupplementary(manifest, contentSlug) : null;

    if (!supplementary) {
      notFound();
    }

    // Render supplementary content with simpler UI
    return (
      <SupplementaryContent
        bookSlug={bookSlug}
        bookTitle={book.title}
        supplementary={supplementary}
      />
    );
  }

  if (chapter.status === 'coming_soon') {
    notFound();
  }

  const chapterSlug = contentSlug;

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

  // Fetch profiles for comment authors separately (no direct FK between comments and profiles)
  const userIds = Array.from(new Set(rawComments?.map(c => c.user_id).filter(Boolean) || []));
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)
    : { data: [] };

  const profilesById = (profiles || []).reduce((acc, p) => {
    acc[p.id] = { display_name: p.display_name };
    return acc;
  }, {} as Record<string, { display_name: string | null }>);

  // Attach profiles to comments
  const comments = rawComments?.map((c) => ({
    ...c,
    profiles: profilesById[c.user_id] || null,
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
          <ChapterContent
            bookSlug={bookSlug}
            chapterSlug={chapterSlug}
            bookId={book.id}
            userId={user.id}
            initialProgress={progress}
            initialComments={comments || []}
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
