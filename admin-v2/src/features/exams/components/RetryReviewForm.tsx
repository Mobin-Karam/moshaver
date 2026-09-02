import { useState } from "react";
import {
  Button,
  Field,
  Textarea,
} from "../../../shared/ui/ui";

export function RetryReviewForm({
  status,
  initialNote,
  onSubmit,
  onCancel,
}: {
  status:
    | "approved"
    | "rejected";
  initialNote: string;
  onSubmit: (
    note: string,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [note, setNote] =
    useState(initialNote);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const invalid =
    status === "rejected" &&
    !note.trim();

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();

        if (invalid) {
          return;
        }

        setSubmitting(true);

        void onSubmit(
          note.trim(),
        ).finally(() =>
          setSubmitting(false),
        );
      }}
    >
      <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        {status === "approved"
          ? "با تأیید، دانش‌آموز می‌تواند یک تلاش تازه برای این آزمون آغاز کند."
          : "دلیل رد برای ثبت سابقه و اطلاع‌رسانی روشن لازم است."}
      </p>

      <Field
        label={
          status === "approved"
            ? "یادداشت مشاور (اختیاری)"
            : "دلیل رد درخواست"
        }
        error={
          invalid
            ? "برای رد درخواست، دلیل را وارد کنید."
            : undefined
        }
      >
        <Textarea
          autoFocus
          rows={4}
          maxLength={1200}
          value={note}
          onChange={(event) =>
            setNote(
              event.target.value,
            )
          }
        />
      </Field>

      <small className="text-left text-slate-400">
        {note.length.toLocaleString(
          "fa-IR",
        )}{" "}
        / ۱۲۰۰
      </small>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="soft"
          onClick={onCancel}
        >
          انصراف
        </Button>

        <Button
          variant={
            status === "rejected"
              ? "danger"
              : "primary"
          }
          disabled={invalid}
          loading={submitting}
        >
          {status === "approved"
            ? "تأیید تلاش"
            : "رد درخواست"}
        </Button>
      </div>
    </form>
  );
}
