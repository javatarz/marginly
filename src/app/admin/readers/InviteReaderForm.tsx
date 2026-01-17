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

    const { error } = await supabase.from('book_access').insert({
      book_id: selectedBook,
      user_email: email.toLowerCase().trim(),
    });

    setIsSubmitting(false);

    if (error) {
      if (error.code === '23505') {
        setMessage({ type: 'error', text: 'This email already has access to this book' });
      } else {
        setMessage({ type: 'error', text: error.message });
      }
      return;
    }

    setMessage({ type: 'success', text: `Invited ${email} successfully!` });
    setEmail('');
    setSelectedBook('');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="reader@example.com"
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
        required
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
