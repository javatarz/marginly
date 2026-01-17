import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get books the user has access to (RLS handles filtering)
  const { data: books } = await supabase
    .from('books')
    .select('id, slug, title, description, version, version_name, changelog')
    .eq('is_active', true)
    .order('title');

  // Get reading progress for each book
  const { data: progress } = await supabase
    .from('reading_progress')
    .select('book_id, chapter_slug, scroll_pct, last_read_at')
    .eq('user_id', user.id);

  const progressByBook = progress?.reduce((acc, p) => {
    if (!acc[p.book_id]) acc[p.book_id] = [];
    acc[p.book_id].push(p);
    return acc;
  }, {} as Record<string, typeof progress>);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Book Reviews</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Your Books</h2>

        {!books || books.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>You don&apos;t have access to any books yet.</p>
            <p className="text-sm mt-2">
              Contact the author to get an invite.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {books.map((book) => {
              const bookProgress = progressByBook?.[book.id] || [];
              const chaptersRead = bookProgress.filter(
                (p) => p.scroll_pct >= 90
              ).length;
              const lastRead = bookProgress.sort(
                (a, b) =>
                  new Date(b.last_read_at).getTime() -
                  new Date(a.last_read_at).getTime()
              )[0];

              return (
                <Link
                  key={book.id}
                  href={`/${book.slug}`}
                  className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-accent hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-ink">
                        {book.title}
                      </h3>
                      {book.description && (
                        <p className="text-gray-600 mt-1">{book.description}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {book.version_name || book.version}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                    {chaptersRead > 0 && (
                      <span>{chaptersRead} chapters read</span>
                    )}
                    {lastRead && (
                      <span>
                        Last read:{' '}
                        {new Date(lastRead.last_read_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {book.changelog && book.changelog.length > 0 && (
                    <div className="mt-4 text-sm">
                      <span className="font-medium text-accent">
                        What&apos;s new:
                      </span>
                      <ul className="mt-1 text-gray-600 list-disc list-inside">
                        {book.changelog.slice(0, 3).map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
