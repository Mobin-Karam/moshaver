import { BookOpen, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../services/api-client";

type Textbook = {
  id: string;
  titleFa: string;
  titleEn: string;
  category: string;
  textbookCode?: string | null;
  notes?: string | null;
};
type StudentTextbooks = {
  schoolYear: string;
  education: {
    gradeId: number;
    gradeLabel: string;
    educationTypeId: string;
    trackId: string;
    trackLabel: string;
  };
  books: Textbook[];
};

export function StudentTextbooksPage() {
  const [data, setData] = useState<StudentTextbooks | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus("loading");
    void apiClient
      .request<StudentTextbooks>("GET", "/education-catalog/my-books")
      .then((value) => {
        if (!active) return;
        setData(value);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [revision]);
  const groups = useMemo(() => {
    const result = new Map<string, Textbook[]>();
    for (const book of data?.books || [])
      result.set(book.category, [...(result.get(book.category) || []), book]);
    return [...result.entries()];
  }, [data]);

  if (status === "loading")
    return (
      <p className="settings-empty" role="status">
        در حال انتخاب کتاب‌های پایه و رشته شما…
      </p>
    );
  if (status === "error")
    return (
      <div className="settings-empty" role="alert">
        <p>کتاب‌ها دریافت نشدند یا مشخصات تحصیلی حساب کامل نیست.</p>
        <button type="button" onClick={() => setRevision((value) => value + 1)}>
          <RefreshCw aria-hidden="true" />
          تلاش دوباره
        </button>
      </div>
    );
  return (
    <div className="student-textbooks">
      <header className="student-textbooks__summary">
        <BookOpen aria-hidden="true" />
        <span>
          <strong>{data?.education.gradeLabel}</strong>
          <small>
            {data?.education.trackLabel} · سال تحصیلی {data?.schoolYear}
          </small>
        </span>
        <b>{(data?.books.length || 0).toLocaleString("fa-IR")} کتاب</b>
      </header>
      {!groups.length ? (
        <p className="settings-empty">
          برای این پایه و رشته کتابی ثبت نشده است.
        </p>
      ) : null}
      {groups.map(([category, books]) => (
        <section key={category} className="student-textbooks__group">
          <h2>{category}</h2>
          <div>
            {books.map((book) => (
              <article key={book.id}>
                <span>
                  <BookOpen aria-hidden="true" />
                </span>
                <div>
                  <h3>{book.titleFa}</h3>
                  {book.titleEn ? <p dir="ltr">{book.titleEn}</p> : null}
                  {book.notes ? <small>{book.notes}</small> : null}
                </div>
                {book.textbookCode ? <code>{book.textbookCode}</code> : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
