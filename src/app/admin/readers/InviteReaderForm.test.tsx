import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InviteReaderForm } from './InviteReaderForm';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock supabase client
const mockInsert = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      insert: mockInsert,
    }),
  }),
}));

const mockBooks = [
  { id: 'book-1', title: 'Test Book 1', slug: 'test-book-1' },
  { id: 'book-2', title: 'Test Book 2', slug: 'test-book-2' },
];

describe('InviteReaderForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form elements', () => {
    render(<InviteReaderForm books={mockBooks} />);

    expect(screen.getByPlaceholderText('reader@example.com')).toBeInTheDocument();
    expect(screen.getByText('Select a book...')).toBeInTheDocument();
    expect(screen.getByText('Test Book 1')).toBeInTheDocument();
    expect(screen.getByText('Test Book 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Invite' })).toBeInTheDocument();
  });

  it('disables button when email is empty', () => {
    render(<InviteReaderForm books={mockBooks} />);

    const button = screen.getByRole('button', { name: 'Invite' });
    expect(button).toBeDisabled();
  });

  it('disables button when no book selected', () => {
    render(<InviteReaderForm books={mockBooks} />);

    const emailInput = screen.getByPlaceholderText('reader@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const button = screen.getByRole('button', { name: 'Invite' });
    expect(button).toBeDisabled();
  });

  it('enables button when email and book are filled', () => {
    render(<InviteReaderForm books={mockBooks} />);

    const emailInput = screen.getByPlaceholderText('reader@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'book-1' } });

    const button = screen.getByRole('button', { name: 'Invite' });
    expect(button).not.toBeDisabled();
  });

  it('shows success message on successful invite', async () => {
    mockInsert.mockResolvedValueOnce({ error: null });

    render(<InviteReaderForm books={mockBooks} />);

    const emailInput = screen.getByPlaceholderText('reader@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'book-1' } });

    const button = screen.getByRole('button', { name: 'Invite' });
    fireEvent.click(button);

    expect(await screen.findByText('Invited test@example.com successfully!')).toBeInTheDocument();
  });

  it('shows error message for duplicate invite', async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } });

    render(<InviteReaderForm books={mockBooks} />);

    const emailInput = screen.getByPlaceholderText('reader@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'book-1' } });

    const button = screen.getByRole('button', { name: 'Invite' });
    fireEvent.click(button);

    expect(await screen.findByText('This email already has access to this book')).toBeInTheDocument();
  });

  it('renders empty state when no books', () => {
    render(<InviteReaderForm books={[]} />);

    const select = screen.getByRole('combobox');
    expect(select.children).toHaveLength(1); // Only "Select a book..." option
  });
});
