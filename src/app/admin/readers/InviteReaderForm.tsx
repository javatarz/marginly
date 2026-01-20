'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Book {
  id: string;
  title: string;
  slug: string;
}

interface InviteReaderFormProps {
  books: Book[];
}

export function InviteReaderForm({ books }: InviteReaderFormProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedBook, setSelectedBook] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !selectedBook) return;

    setIsSubmitting(true);
    setMessage(null);

    const normalizedEmail = email.toLowerCase().trim();

    // First, add book access
    const { error: accessError } = await supabase.from('book_access').insert({
      book_id: selectedBook,
      user_email: normalizedEmail,
    });

    if (accessError) {
      setIsSubmitting(false);
      if (accessError.code === '23505') {
        setMessage({ type: 'error', text: 'This email already has access to this book' });
      } else {
        setMessage({ type: 'error', text: accessError.message });
      }
      return;
    }

    // If display name provided, check if user exists and create/update profile
    if (displayName.trim()) {
      // Check if user already exists
      const { data: existingAccess } = await supabase
        .from('book_access')
        .select('user_id')
        .eq('user_email', normalizedEmail)
        .not('user_id', 'is', null)
        .limit(1)
        .single();

      if (existingAccess?.user_id) {
        // User exists, upsert their profile
        await supabase.from('profiles').upsert({
          id: existingAccess.user_id,
          display_name: displayName.trim(),
        });
      }
      // Note: If user doesn't exist yet, we can't create a profile without their auth.users id
      // The display name will need to be set after they sign up, or we store it elsewhere
    }

    setIsSubmitting(false);
    setMessage({ type: 'success', text: `Invited ${email} successfully!` });
    setEmail('');
    setDisplayName('');
    setSelectedBook('');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 flex-wrap">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="reader@example.com"
        className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
        required
      />

      <input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Display name (optional)"
        className="flex-1 min-w-[150px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <select
        value={selectedBook}
        onChange={(e) => setSelectedBook(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
        required
      >
        <option value="">Select a book...</option>
        {books.map((book) => (
          <option key={book.id} value={book.id}>
            {book.title}
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={isSubmitting || !email.trim() || !selectedBook}
        className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Inviting...' : 'Invite'}
      </button>

      {message && (
        <p
          className={`self-center text-sm ${
            message.type === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
