import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ chapter?: string; resolved?: string }>;
}

export default async function CommentsPage({ searchParams }: PageProps) {
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

  // Fetch chapters for filter
  const { data: chapters } = await supabase
    .from('chapters')
    .select('slug, title, number, book_id')
    .order('number', { ascending: true });

  // Build comments query with filters
  let query = supabase
    .from('comments')
    .select('id, anchor_text, content, is_resolved, created_at, chapter_slug, user_id, parent_id')
    .order('created_at', { ascending: false });

  if (params.chapter) {
    query = query.eq('chapter_slug', params.chapter);
  }

  if (params.resolved === 'true') {
    query = query.eq('is_resolved', true);
  } else if (params.resolved === 'false') {
    query = query.eq('is_resolved', false);
  }

  const { data: comments } = await query;

  // Group comments: parent comments with their replies
  const parentComments = comments?.filter(c => !c.parent_id) || [];
  const replies = comments?.filter(c => c.parent_id) || [];

  const threaded = parentComments.map(parent => ({
    ...parent,
    replies: replies.filter(r => r.parent_id === parent.id),
  }));

  // Get unique chapter slugs for the filter
  const uniqueChapters = Array.from(new Set(comments?.map(c => c.chapter_slug) || []));

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-ink mt-1">Review Comments</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <form className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm text-gray-600 mr-2">Chapter:</label>
              <select
                name="chapter"
                defaultValue={params.chapter || ''}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  if (e.target.value) {
                    url.searchParams.set('chapter', e.target.value);
                  } else {
                    url.searchParams.delete('chapter');
                  }
                  window.location.href = url.toString();
                }}
              >
                <option value="">All chapters</option>
                {chapters?.map((ch) => (
                  <option key={ch.slug} value={ch.slug}>
                    Ch {ch.number}: {ch.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-600 mr-2">Status:</label>
              <select
                name="resolved"
                defaultValue={params.resolved || ''}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  if (e.target.value) {
                    url.searchParams.set('resolved', e.target.value);
                  } else {
                    url.searchParams.delete('resolved');
                  }
                  window.location.href = url.toString();
                }}
              >
                <option value="">All comments</option>
                <option value="false">Unresolved</option>
                <option value="true">Resolved</option>
              </select>
            </div>

            {(params.chapter || params.resolved) && (
              <Link
                href="/admin/comments"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </Link>
            )}
          </form>
        </div>

        {/* Comments List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-lg text-ink">
              Comments ({parentComments.length})
            </h2>
          </div>

          {threaded.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No comments found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {threaded.map((comment) => {
                const chapter = chapters?.find(c => c.slug === comment.chapter_slug);

                return (
                  <div key={comment.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {chapter ? `Ch ${chapter.number}: ${chapter.title}` : comment.chapter_slug}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              comment.is_resolved
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {comment.is_resolved ? 'Resolved' : 'Open'}
                          </span>
                        </div>

                        <p className="text-sm italic text-gray-500 mb-2">
                          &ldquo;{comment.anchor_text}&rdquo;
                        </p>

                        <p className="text-ink">{comment.content}</p>

                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>

                        {/* Replies */}
                        {comment.replies.length > 0 && (
                          <div className="mt-3 ml-4 pl-4 border-l-2 border-gray-200 space-y-2">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="bg-gray-50 rounded p-3">
                                <p className="text-sm text-ink">{reply.content}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(reply.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
