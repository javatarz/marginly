import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminDashboard() {
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

  // Fetch analytics data
  const [
    { data: books },
    { data: readers },
    { data: comments },
    { data: recentProgress },
    { data: recentSessions },
    { data: duplicateChapters },
  ] = await Promise.all([
    supabase.from('books').select('id, title, slug').eq('is_active', true),
    supabase.from('book_access').select('id, user_email, user_id, invited_at'),
    supabase.from('comments').select('id, is_resolved, created_at'),
    supabase
      .from('reading_progress')
      .select('id, book_id, chapter_slug, scroll_pct, last_read_at, user_id')
      .order('last_read_at', { ascending: false })
      .limit(10),
    supabase
      .from('reading_sessions')
      .select('id, started_at, ended_at, max_scroll_pct')
      .order('started_at', { ascending: false })
      .limit(100),
    // Find books with duplicate chapter numbers (indicates orphaned chapters from slug changes)
    supabase.rpc('get_duplicate_chapters'),
  ]);

  const totalReaders = readers?.length || 0;
  const totalComments = comments?.length || 0;
  const unresolvedComments = comments?.filter(c => !c.is_resolved).length || 0;
  const totalBooks = books?.length || 0;

  // Calculate average reading progress
  const avgProgress = recentProgress?.length
    ? Math.round(
        recentProgress.reduce((sum, p) => sum + p.scroll_pct, 0) / recentProgress.length
      )
    : 0;

  // Calculate total reading time (from sessions)
  const totalReadingMinutes = recentSessions?.reduce((sum, s) => {
    if (s.started_at && s.ended_at) {
      const start = new Date(s.started_at).getTime();
      const end = new Date(s.ended_at).getTime();
      return sum + (end - start) / 60000;
    }
    return sum;
  }, 0) || 0;

  // Count books with duplicate chapters
  const booksWithDuplicates = duplicateChapters?.length || 0;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to Books
            </Link>
            <h1 className="text-2xl font-bold text-ink mt-1">Admin Dashboard</h1>
          </div>
          <span className="text-sm text-gray-500">{user.email}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Duplicate Chapters Warning */}
        {booksWithDuplicates > 0 && (
          <Link
            href="/admin/chapters"
            className="block mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-yellow-600 text-xl">&#9888;</span>
              <div>
                <p className="font-medium text-yellow-800">
                  {booksWithDuplicates} book{booksWithDuplicates > 1 ? 's have' : ' has'} duplicate chapters
                </p>
                <p className="text-sm text-yellow-700">
                  This can happen when chapter slugs change. Click to review and migrate data.
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Readers</p>
            <p className="text-3xl font-bold text-ink">{totalReaders}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Active Books</p>
            <p className="text-3xl font-bold text-ink">{totalBooks}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Comments</p>
            <p className="text-3xl font-bold text-ink">{totalComments}</p>
            {unresolvedComments > 0 && (
              <p className="text-xs text-yellow-600">{unresolvedComments} unresolved</p>
            )}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Avg Progress</p>
            <p className="text-3xl font-bold text-ink">{avgProgress}%</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/admin/readers"
            className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-accent hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-lg text-ink mb-2">Manage Readers</h3>
            <p className="text-sm text-gray-500">
              View reader progress, invite new readers, manage access
            </p>
          </Link>

          <Link
            href="/admin/chapters"
            className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-accent hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-lg text-ink mb-2">Manage Chapters</h3>
            <p className="text-sm text-gray-500">
              View chapters, migrate data after slug changes
            </p>
          </Link>

          <Link
            href="/admin/comments"
            className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-accent hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-lg text-ink mb-2">Review Comments</h3>
            <p className="text-sm text-gray-500">
              View all comments, filter by chapter, resolve feedback
            </p>
          </Link>

          <Link
            href="/admin/analytics"
            className="block bg-white rounded-lg border border-gray-200 p-6 hover:border-accent hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-lg text-ink mb-2">Analytics</h3>
            <p className="text-sm text-gray-500">
              Reading patterns, engagement metrics, session data
            </p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-lg text-ink mb-4">Recent Reading Activity</h3>
          {recentProgress && recentProgress.length > 0 ? (
            <div className="space-y-3">
              {recentProgress.map((progress) => (
                <div
                  key={progress.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm text-ink">
                      {progress.chapter_slug}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(progress.last_read_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-ink">{progress.scroll_pct}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recent activity</p>
          )}
        </div>

        {/* Reading Time Stats */}
        {totalReadingMinutes > 0 && (
          <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-4">
            <p className="text-sm text-blue-800">
              Total reading time (last 100 sessions):{' '}
              <strong>{Math.round(totalReadingMinutes)} minutes</strong>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
