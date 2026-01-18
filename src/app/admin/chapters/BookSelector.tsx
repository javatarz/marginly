'use client';

import { useRouter } from 'next/navigation';

interface Book {
  id: string;
  title: string;
  slug: string;
}

interface BookSelectorProps {
  books: Book[];
  selectedBookId: string | undefined;
}

export function BookSelector({ books, selectedBookId }: BookSelectorProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const bookId = e.target.value;
    router.push(`/admin/chapters?book=${bookId}`);
  };

  return (
    <select
      id="book-select"
      value={selectedBookId || ''}
      onChange={handleChange}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {books.map((book) => (
        <option key={book.id} value={book.id}>
          {book.title}
        </option>
      ))}
    </select>
  );
}
