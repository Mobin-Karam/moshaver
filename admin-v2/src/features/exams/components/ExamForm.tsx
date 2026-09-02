import { useState } from "react";
import { DatePicker, DateTimePicker } from "../../../shared/ui/date-picker";
import { Button, Field, Input, Select, Textarea } from "../../../shared/ui/ui";
import { persianDateForIso, replaceIsoDay } from "../lib/exam-formatters";
import { examDraftError, type ExamDraft } from "../model/exam-model";

export function ExamForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: ExamDraft;
  onSubmit: (data: ExamDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [data, setData] = useState(initial);

  const [submitting, setSubmitting] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const error = examDraftError(data);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);

        if (error) {
          return;
        }

        setSubmitting(true);

        void onSubmit({
          ...data,
          title: data.title.trim(),
          note: data.note.trim(),
          instructions: data.instructions.trim(),
        }).finally(() => setSubmitting(false));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="عنوان">
          <Input
            required
            value={data.title}
            onChange={(event) =>
              setData({
                ...data,
                title: event.target.value,
              })
            }
          />
        </Field>

        <Field label="تاریخ فارسی">
          <Input
            required
            value={data.persianDate}
            onChange={(event) =>
              setData({
                ...data,
                persianDate: event.target.value,
              })
            }
          />
        </Field>

        <Field label="تاریخ ISO">
          <DatePicker
            required
            value={data.isoDate}
            onChange={(isoDate) =>
              setData({
                ...data,
                isoDate,
                persianDate: persianDateForIso(isoDate),
                openAt: replaceIsoDay(data.openAt, isoDate),
                closeAt: replaceIsoDay(data.closeAt, isoDate),
              })
            }
          />
        </Field>

        <Field label="وضعیت">
          <Select
            value={data.status}
            onChange={(event) =>
              setData({
                ...data,
                status: event.target.value as ExamDraft["status"],
              })
            }
          >
            <option value="upcoming">آینده</option>

            <option value="active">فعال</option>

            <option value="completed">تمام‌شده</option>

            <option value="cancelled">لغوشده</option>
          </Select>
        </Field>

        <Field label="شروع">
          <DateTimePicker
            value={data.openAt}
            onChange={(openAt) =>
              setData({
                ...data,
                openAt,
              })
            }
          />
        </Field>

        <Field label="پایان">
          <DateTimePicker
            value={data.closeAt}
            onChange={(closeAt) =>
              setData({
                ...data,
                closeAt,
              })
            }
          />
        </Field>

        <Field label="مدت (دقیقه)">
          <Input
            min={1}
            max={600}
            type="number"
            value={data.durationMinutes}
            onChange={(event) =>
              setData({
                ...data,
                durationMinutes: Number(event.target.value),
              })
            }
          />
        </Field>

        <Field label="حداکثر تلاش">
          <Input
            min={1}
            max={100}
            type="number"
            value={data.maxAttempts}
            onChange={(event) =>
              setData({
                ...data,
                maxAttempts: Number(event.target.value),
              })
            }
          />
        </Field>

        <Field label="انتشار">
          <Select
            value={data.published ? "1" : "0"}
            onChange={(event) =>
              setData({
                ...data,
                published: event.target.value === "1",
              })
            }
          >
            <option value="0">پیش‌نویس</option>

            <option value="1">منتشر</option>
          </Select>
        </Field>
      </div>

      <Field label="یادداشت داخلی">
        <Textarea
          value={data.note}
          onChange={(event) =>
            setData({
              ...data,
              note: event.target.value,
            })
          }
        />
      </Field>

      <Field label="دستورالعمل دانش‌آموز">
        <Textarea
          rows={3}
          value={data.instructions}
          onChange={(event) =>
            setData({
              ...data,
              instructions: event.target.value,
            })
          }
        />
      </Field>

      {submitted && error ? (
        <p
          role="alert"
          className="rounded-md bg-rose-50 p-2 text-sm text-rose-700"
        >
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="soft" onClick={onCancel}>
          انصراف
        </Button>

        <Button loading={submitting}>ذخیره آزمون</Button>
      </div>
    </form>
  );
}
