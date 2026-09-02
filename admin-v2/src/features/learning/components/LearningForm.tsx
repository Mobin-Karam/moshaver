import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  todayIso,
} from "../../../shared/lib/utils";
import { DatePicker } from "../../../shared/ui/date-picker";
import { notify } from "../../../shared/ui/notifications";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "../../../shared/ui/ui";
import {
  createLearningItem,
  updateLearningItem,
} from "../api/learning.api";
import {
  learningFormSchema,
  type LearningFormValues,
} from "../model/learning-form.schema";
import type { LearningItem } from "../model/learning-model";

export function LearningForm({
  studentId,
  item,
  onSaved,
}: {
  studentId: string;
  item?: LearningItem;
  onSaved: () => void;
}) {
  const queryClient =
    useQueryClient();

  const form =
    useForm<LearningFormValues>(
      {
        resolver:
          zodResolver(
            learningFormSchema,
          ),

        defaultValues: {
          title:
            item?.title || "",
          subject:
            item?.subject || "",
          book:
            item?.book || "",
          chapter:
            item?.chapter ||
            "",
          lesson:
            item?.lesson || "",
          topic:
            item?.topic || "",
          note:
            item?.note || "",
          hint:
            item?.hint || "",
          dueDate:
            item?.dueDate ||
            todayIso(),
          mastery:
            item?.mastery || 0,
          status:
            item?.status ||
            "pending",
        },
      },
    );

  const save = useMutation({
    mutationFn: (
      values: LearningFormValues,
    ) =>
      item
        ? updateLearningItem(
            studentId,
            item.id,
            values,
          )
        : createLearningItem(
            studentId,
            values,
          ),

    onSuccess: () => {
      notify(
        item
          ? "مورد یادگیری به‌روز شد."
          : "مرور جدید ساخته شد.",
      );

      void queryClient.invalidateQueries(
        {
          queryKey: [
            "student-learning",
            studentId,
          ],
        },
      );

      onSaved();
    },

    onError: (error) =>
      notify(
        error instanceof Error
          ? error.message
          : "ذخیره انجام نشد.",
        "error",
      ),
  });

  return (
    <form
      className="grid gap-3"
      onSubmit={form.handleSubmit(
        (values) =>
          save.mutate(values),
      )}
    >
      <Field
        label="عنوان"
        error={
          form.formState.errors
            .title?.message
        }
      >
        <Input
          autoFocus
          {...form.register(
            "title",
          )}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="درس">
          <Input
            {...form.register(
              "subject",
            )}
          />
        </Field>

        <Field label="مبحث">
          <Input
            {...form.register(
              "topic",
            )}
          />
        </Field>

        <Field label="کتاب">
          <Input
            {...form.register(
              "book",
            )}
          />
        </Field>

        <Field label="فصل">
          <Input
            {...form.register(
              "chapter",
            )}
          />
        </Field>

        <Field label="درس / بخش">
          <Input
            {...form.register(
              "lesson",
            )}
          />
        </Field>

        <Field
          label="تاریخ مرور"
          error={
            form.formState
              .errors.dueDate
              ?.message
          }
        >
          <DatePicker
            value={form.watch(
              "dueDate",
            )}
            onChange={(value) =>
              form.setValue(
                "dueDate",
                value,
                {
                  shouldValidate:
                    true,
                },
              )
            }
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="تسلط از ۰ تا ۵">
          <Input
            type="number"
            min={0}
            max={5}
            {...form.register(
              "mastery",
            )}
          />
        </Field>

        <Field label="وضعیت">
          <Select
            {...form.register(
              "status",
            )}
          >
            <option value="pending">
              در انتظار مرور
            </option>

            <option value="done">
              تکمیل‌شده
            </option>

            <option value="archived">
              بایگانی
            </option>
          </Select>
        </Field>
      </div>

      <Field label="یادداشت">
        <Textarea
          rows={3}
          {...form.register(
            "note",
          )}
        />
      </Field>

      <Field label="راهنمای مرور بعدی">
        <Textarea
          rows={3}
          {...form.register(
            "hint",
          )}
        />
      </Field>

      <Button
        type="submit"
        loading={save.isPending}
        disabled={save.isPending}
      >
        ذخیره مورد یادگیری
      </Button>
    </form>
  );
}
