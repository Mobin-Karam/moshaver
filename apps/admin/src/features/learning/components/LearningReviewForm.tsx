import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { notify } from "../../../shared/ui/notifications";
import { Button, Field, Select } from "../../../shared/ui/ui";
import { reviewLearningItem } from "../api/learning.api";

export function LearningReviewForm({
  studentId,
  itemId,
  onSaved,
}: {
  studentId: string;
  itemId: string;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(3);
  const queryClient = useQueryClient();
  const review = useMutation({
    mutationFn: () => reviewLearningItem(studentId, itemId, rating),
    onSuccess: () => {
      notify("مرور ثبت و زمان مرور بعدی محاسبه شد.");
      void queryClient.invalidateQueries({ queryKey: ["student-learning", studentId] });
      onSaved();
    },
    onError: (error) =>
      notify(error instanceof Error ? error.message : "ثبت مرور انجام نشد.", "error"),
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        review.mutate();
      }}
    >
      <Field label="کیفیت یادآوری">
        <Select value={String(rating)} onChange={(event) => setRating(Number(event.target.value))}>
          <option value="0">۰ — اصلاً یادم نبود</option>
          <option value="1">۱ — بسیار سخت</option>
          <option value="2">۲ — نیازمند مرور دوباره</option>
          <option value="3">۳ — متوسط</option>
          <option value="4">۴ — خوب</option>
          <option value="5">۵ — کاملاً مسلط</option>
        </Select>
      </Field>
      <p className="text-xs leading-6 text-slate-500">
        امتیاز مرور، تسلط و فاصله مرور بعدی را به‌صورت خودکار به‌روزرسانی می‌کند.
      </p>
      <Button type="submit" loading={review.isPending} disabled={review.isPending}>
        ثبت مرور
      </Button>
    </form>
  );
}
