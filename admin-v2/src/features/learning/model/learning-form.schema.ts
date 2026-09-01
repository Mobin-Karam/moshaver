import { z } from "zod";

export const learningFormSchema =
  z.object({
    title: z
      .string()
      .trim()
      .min(
        2,
        "عنوان حداقل دو نویسه باشد.",
      )
      .max(2000),

    subject: z
      .string()
      .trim()
      .max(160),

    book: z
      .string()
      .trim()
      .max(200),

    chapter: z
      .string()
      .trim()
      .max(200),

    lesson: z
      .string()
      .trim()
      .max(200),

    topic: z
      .string()
      .trim()
      .max(240),

    note: z
      .string()
      .trim()
      .max(3000),

    hint: z
      .string()
      .trim()
      .max(3000),

    dueDate: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        "تاریخ مرور را انتخاب کنید.",
      ),

    mastery: z.coerce
      .number()
      .min(0)
      .max(5),

    status: z.enum([
      "pending",
      "done",
      "archived",
    ]),
  });

export type LearningFormValues =
  z.infer<
    typeof learningFormSchema
  >;
