import { useState } from "react";
import {
  Button,
  Field,
  Input,
  Textarea,
} from "../../../shared/ui/ui";
import type { SyllabusDraft } from "../model/exam.types";

export function SyllabusForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (
    data: SyllabusDraft,
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [data, setData] =
    useState<SyllabusDraft>({
      subject: "",
      description: "",
      track: "",
      required: true,
    });

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();

        if (
          !data.subject.trim() ||
          !data.description.trim()
        ) {
          return;
        }

        setSubmitting(true);

        void onSubmit({
          ...data,
          subject:
            data.subject.trim(),
          description:
            data.description.trim(),
          track:
            data.track.trim(),
        }).finally(() =>
          setSubmitting(false),
        );
      }}
    >
      <Field label="درس">
        <Input
          required
          autoFocus
          value={data.subject}
          onChange={(event) =>
            setData({
              ...data,
              subject:
                event.target.value,
            })
          }
        />
      </Field>

      <Field label="مسیر">
        <Input
          value={data.track}
          onChange={(event) =>
            setData({
              ...data,
              track:
                event.target.value,
            })
          }
        />
      </Field>

      <Field label="توضیح">
        <Textarea
          required
          value={data.description}
          onChange={(event) =>
            setData({
              ...data,
              description:
                event.target.value,
            })
          }
        />
      </Field>

      <label className="text-sm">
        <input
          type="checkbox"
          checked={data.required}
          onChange={(event) =>
            setData({
              ...data,
              required:
                event.target
                  .checked,
            })
          }
        />{" "}
        الزامی
      </label>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="soft"
          onClick={onCancel}
        >
          انصراف
        </Button>

        <Button
          loading={submitting}
        >
          افزودن
        </Button>
      </div>
    </form>
  );
}
