import { BookOpen } from 'lucide-react';
import type { Book } from '../model/types';

const PREVIEW_COUNT = 3;

export function BooksPreview({ books }: { books: Book[] }) {
  if (!books.length) return null;

  const preview = books.slice(0, PREVIEW_COUNT);
  const overflow = books.length - preview.length;

  return (
    <div className="signup-books" role="status" aria-live="polite">
      <BookOpen size={15} aria-hidden />
      <span className="signup-books__label">
        {books.length.toLocaleString('fa-IR')} کتاب در فهرست ۱۴۰۵–۱۴۰۶
      </span>
      {preview.map((book) => (
        <span key={book.id} className="signup-books__chip" title={book.titleFa}>
          {book.titleFa}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="signup-books__more">+{overflow.toLocaleString('fa-IR')}</span>
      ) : null}
    </div>
  );
}