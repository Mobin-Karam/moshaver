import {
  BookOpenCheck,
  CalendarClock,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { LearningSummary } from "../model/learning-model";
import { LearningMetric } from "./LearningMetric";

export function LearningSummaryMetrics({
  summary,
}: {
  summary?: LearningSummary;
}) {
  return (
    <section className="grid grid-cols-2 gap-2 lg:grid-cols-6">
      <LearningMetric
        icon={Sparkles}
        label="کل موارد"
        value={
          summary?.totalItems
        }
      />

      <LearningMetric
        icon={CalendarClock}
        label="سررسید امروز"
        value={
          summary?.dueItems
        }
        tone="red"
      />

      <LearningMetric
        icon={BookOpenCheck}
        label="در انتظار"
        value={
          summary?.pendingItems
        }
        tone="amber"
      />

      <LearningMetric
        icon={TrendingUp}
        label="میانگین تسلط"
        value={`${Number(
          summary?.averageMastery ||
            0,
        ).toLocaleString(
          "fa-IR",
        )} / ۵`}
        tone="green"
      />

      <LearningMetric
        icon={BookOpenCheck}
        label="تلاش آزمون"
        value={
          summary?.attempts
        }
      />

      <LearningMetric
        icon={TrendingUp}
        label="میانگین آزمون"
        value={`${Number(
          summary?.averageExamPercent ||
            0,
        ).toLocaleString(
          "fa-IR",
        )}٪`}
      />
    </section>
  );
}
