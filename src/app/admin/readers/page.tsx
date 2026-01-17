import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { InviteReaderForm } from './InviteReaderForm';

export default async function ReadersPage() {
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

  // Fetch all readers with their progress
  const { data: readers } = await supabase
    .from('book_access')
    .select('id, user_email, user_id, invited_at, book_id')
    .order('invited_at', { ascending: false });

  // Fetch reading progress for all users
  const { data: allProgress } = await supabase
    .from('reading_progress')
    .select('user_id, book_id, chapter_slug, scroll_pct, completed_at, last_read_at');

  // Fetch books for the invite form
  const { data: books } = await supabase
    .from('books')
    .select('id, title, slug')
    .eq('is_active', true);

  // Group progress by user
  const progressByUser = allProgress?.reduce((acc, p) => {
    if (!p.user_id) return acc;
    if (!acc[p.user_id]) {
      acc[p.user_id] = {
        totalChapters: 0,
        completedChapters: 0,
        lastRead: null as string | null,
      };
    }
    acc[p.user_id].totalChapters++;
    if (p.completed_at) {
      acc[p.user_id].completedChapters++;
    }
    if (!acc[p.user_id].lastRead || p.last_read_at > acc[p.user_id].lastRead!) {
      acc[p.user_id].lastRead = p.last_read_at;
    }
    return acc;
  }, {} as Record<string, { totalChapters: number; completedChapters: number; lastRead: string | null }>);

  // Group readers by email (they might have access to multiple books)
  const readersByEmail = readers?.reduce((acc, r) => {
    if (!acc[r.user_email]) {
      acc[r.user_email] = {
        email: r.user_email,
        user_id: r.user_id,
        invited_at: r.invited_at,
        books: [] as string[],
      };
    }
    const book = books?.find(b => b.id === r.book_id);
    if (book) {
      acc[r.user_email].books.push(book.title);
    }
    return acc;
  }, {} as Record<string, { email: string; user_id: string | null; invited_at: string; books: string[] }>);

  const uniqueReaders = Object.values(readersByEmail || {});

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-ink mt-1">Manage Readers</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Invite Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="font-semibold text-lg text-ink mb-4">Invite New Reader</h2>
          <InviteReaderForm books={books || []} />
        </div>

        {/* Readers List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-lg text-ink">
              All Readers ({uniqueReaders.length})
            </h2>
          </div>

          {uniqueReaders.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No readers invited yet
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {uniqueReaders.map((reader) => {
                const progress = reader.user_id ? progressByUser?.[reader.user_id] : null;
                const hasSignedUp = !!reader.user_id;

                return (
                  <div
                    key={reader.email}
                    className="px-6 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-ink">{reader.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            hasSignedUp
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {hasSignedUp ? 'Active' : 'Pending'}
                        </span>
                        {reader.books.length > 0 && (
                          <span className="text-xs text-gray-500">
                            Access to: {reader.books.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      {progress ? (
                        <>
                          <p className="text-sm text-ink">
                            {progress.completedChapters}/{progress.totalChapters} chapters
                          </p>
                          {progress.lastRead && (
                            <p className="text-xs text-gray-500">
                              Last read: {new Date(progress.lastRead).toLocaleDateString()}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">No activity yet</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
