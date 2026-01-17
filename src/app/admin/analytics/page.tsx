import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AnalyticsPage() {
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
    { data: chapters },
    { data: progress },
    { data: sessions },
    { data: comments },
  ] = await Promise.all([
    supabase.from('chapters').select('slug, title, number').order('number'),
    supabase.from('reading_progress').select('chapter_slug, scroll_pct, time_spent_seconds, completed_at'),
    supabase.from('reading_sessions').select('chapter_slug, started_at, ended_at, max_scroll_pct'),
    supabase.from('comments').select('chapter_slug, is_resolved'),
  ]);

  // Calculate per-chapter stats
  const chapterStats = chapters?.map((chapter) => {
    const chapterProgress = progress?.filter(p => p.chapter_slug === chapter.slug) || [];
    const chapterSessions = sessions?.filter(s => s.chapter_slug === chapter.slug) || [];
    const chapterComments = comments?.filter(c => c.chapter_slug === chapter.slug) || [];

    const totalReaders = chapterProgress.length;
    const completedReaders = chapterProgress.filter(p => p.completed_at).length;
    const avgScrollPct = totalReaders > 0
      ? Math.round(chapterProgress.reduce((sum, p) => sum + p.scroll_pct, 0) / totalReaders)
      : 0;
    const totalTimeMinutes = Math.round(
      chapterProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) / 60
    );

    const sessionCount = chapterSessions.length;
    const avgSessionMinutes = sessionCount > 0
      ? Math.round(
          chapterSessions.reduce((sum, s) => {
            if (s.started_at && s.ended_at) {
              return sum + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000;
            }
            return sum;
          }, 0) / sessionCount
        )
      : 0;

    return {
      ...chapter,
      totalReaders,
      completedReaders,
      avgScrollPct,
      totalTimeMinutes,
      sessionCount,
      avgSessionMinutes,
      commentCount: chapterComments.length,
      unresolvedComments: chapterComments.filter(c => !c.is_resolved).length,
    };
  }) || [];

  // Overall stats
  const totalSessions = sessions?.length || 0;
  const totalReadingTime = progress?.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0) || 0;
  const avgCompletionRate = chapterStats.length > 0
    ? Math.round(
        chapterStats.reduce((sum, c) => {
          const rate = c.totalReaders > 0 ? (c.completedReaders / c.totalReaders) * 100 : 0;
          return sum + rate;
        }, 0) / chapterStats.length
      )
    : 0;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-ink mt-1">Analytics</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Sessions</p>
            <p className="text-3xl font-bold text-ink">{totalSessions}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Reading Time</p>
            <p className="text-3xl font-bold text-ink">
              {Math.round(totalReadingTime / 60)}m
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Avg Completion Rate</p>
            <p className="text-3xl font-bold text-ink">{avgCompletionRate}%</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Comments</p>
            <p className="text-3xl font-bold text-ink">{comments?.length || 0}</p>
          </div>
        </div>

        {/* Chapter-by-Chapter Stats */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-lg text-ink">Chapter Analytics</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Chapter
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Readers
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Avg Progress
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Time Spent
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Sessions
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {chapterStats.map((chapter) => (
                  <tr key={chapter.slug} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">
                        Ch {chapter.number}: {chapter.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {chapter.totalReaders}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      <span
                        className={
                          chapter.completedReaders > 0
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }
                      >
                        {chapter.completedReaders}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-accent h-2 rounded-full"
                            style={{ width: `${chapter.avgScrollPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {chapter.avgScrollPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {chapter.totalTimeMinutes}m
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {chapter.sessionCount}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {chapter.commentCount > 0 ? (
                        <span>
                          {chapter.commentCount}
                          {chapter.unresolvedComments > 0 && (
                            <span className="text-yellow-600 ml-1">
                              ({chapter.unresolvedComments} open)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
