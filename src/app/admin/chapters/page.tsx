import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MigrateChapterForm } from './MigrateChapterForm';

interface Chapter {
  id: string;
  book_id: string;
  slug: string;
  number: number;
  title: string;
  status: string;
  created_at: string;
}

interface Book {
  id: string;
  title: string;
  slug: string;
}

interface DuplicateInfo {
  book_id: string;
  book_title: string;
  chapter_number: number;
  slugs: string[];
}

interface LinkedDataCounts {
  [slug: string]: {
    comments: number;
    progress: number;
    sessions: number;
  };
}

export default async function ChaptersPage({
  searchParams,
}: {
  searchParams: Promise<{ book?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is a global admin
  const { data: isAdmin } = await supabase
    .from('global_admins')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!isAdmin) {
    redirect('/');
  }

  // Fetch books and duplicates in parallel
  const [{ data: books }, { data: duplicates }] = await Promise.all([
    supabase.from('books').select('id, title, slug').eq('is_active', true).order('title'),
    supabase.rpc('get_duplicate_chapters'),
  ]);

  const selectedBookId = params.book || books?.[0]?.id;

  // Fetch chapters for selected book
  const { data: chapters } = selectedBookId
    ? await supabase
        .from('chapters')
        .select('id, book_id, slug, number, title, status, created_at')
        .eq('book_id', selectedBookId)
        .order('number')
    : { data: [] };

  // Fetch linked data counts for selected book's chapters
  let linkedDataCounts: LinkedDataCounts = {};
  if (chapters && chapters.length > 0) {
    const slugs = chapters.map((c) => c.slug);

    const [{ data: commentCounts }, { data: progressCounts }, { data: sessionCounts }] =
      await Promise.all([
        supabase
          .from('comments')
          .select('chapter_slug')
          .eq('book_id', selectedBookId)
          .in('chapter_slug', slugs),
        supabase
          .from('reading_progress')
          .select('chapter_slug')
          .eq('book_id', selectedBookId)
          .in('chapter_slug', slugs),
        supabase
          .from('reading_sessions')
          .select('chapter_slug')
          .eq('book_id', selectedBookId)
          .in('chapter_slug', slugs),
      ]);

    // Aggregate counts by slug
    for (const slug of slugs) {
      linkedDataCounts[slug] = {
        comments: commentCounts?.filter((c) => c.chapter_slug === slug).length || 0,
        progress: progressCounts?.filter((p) => p.chapter_slug === slug).length || 0,
        sessions: sessionCounts?.filter((s) => s.chapter_slug === slug).length || 0,
      };
    }
  }

  // Build duplicate lookup for the selected book
  const duplicatesByNumber: { [num: number]: string[] } = {};
  (duplicates as DuplicateInfo[] | null)
    ?.filter((d) => d.book_id === selectedBookId)
    .forEach((d) => {
      duplicatesByNumber[d.chapter_number] = d.slugs;
    });

  const hasDuplicates = Object.keys(duplicatesByNumber).length > 0;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
              &larr; Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-ink mt-1">Manage Chapters</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Book Selector */}
        <div className="mb-6">
          <label htmlFor="book-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Book
          </label>
          <form>
            <select
              id="book-select"
              name="book"
              defaultValue={selectedBookId}
              onChange={(e) => {
                const form = e.target.form;
                if (form) form.submit();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {books?.map((book: Book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </form>
        </div>

        {/* Duplicate Warning */}
        {hasDuplicates && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <span className="text-yellow-600 text-xl">&#9888;</span>
              <div>
                <p className="font-medium text-yellow-800">
                  This book has duplicate chapter numbers
                </p>
                <p className="text-sm text-yellow-700">
                  Chapters highlighted in yellow share the same number. Use the Migrate button to
                  move data from the old slug to the new one.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chapters Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Linked Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chapters?.map((chapter: Chapter) => {
                const isDuplicate = duplicatesByNumber[chapter.number] !== undefined;
                const duplicateSlugs = duplicatesByNumber[chapter.number] || [];
                const isOldSlug = isDuplicate && duplicateSlugs[0] === chapter.slug;
                const targetSlug = isDuplicate && isOldSlug ? duplicateSlugs[1] : null;
                const counts = linkedDataCounts[chapter.slug] || {
                  comments: 0,
                  progress: 0,
                  sessions: 0,
                };
                const hasLinkedData =
                  counts.comments > 0 || counts.progress > 0 || counts.sessions > 0;

                return (
                  <tr
                    key={chapter.id}
                    className={isDuplicate ? 'bg-yellow-50' : undefined}
                  >
                    <td className="px-4 py-3 text-sm text-ink">{chapter.number}</td>
                    <td className="px-4 py-3 text-sm text-ink">{chapter.title}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{chapter.slug}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          chapter.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : chapter.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {chapter.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span title="Comments">{counts.comments} comments</span>
                      <span className="mx-1">&bull;</span>
                      <span title="Reading progress records">{counts.progress} progress</span>
                      <span className="mx-1">&bull;</span>
                      <span title="Reading sessions">{counts.sessions} sessions</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isDuplicate && isOldSlug && targetSlug && (
                        <MigrateChapterForm
                          bookId={chapter.book_id}
                          sourceSlug={chapter.slug}
                          targetSlug={targetSlug}
                          counts={counts}
                          hasLinkedData={hasLinkedData}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!chapters || chapters.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No chapters found for this book.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
