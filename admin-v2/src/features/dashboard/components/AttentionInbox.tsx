import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  EmptyState,
} from "../../../shared/ui/ui";
import { fa } from "../../../shared/lib/utils";
import type { AttentionItem } from "../model/dashboard.types";

const attentionIcons: Record<
  AttentionItem["key"],
  LucideIcon
> = {
  issues: AlertTriangle,
  recoveryRequests: Clock3,
  reviews: CheckCircle2,
  missedTasks: AlertTriangle,
  unread: MessageSquare,
};

export function AttentionInbox({
  count,
  items,
}: {
  count: number;
  items: AttentionItem[];
}) {
  return (
    <Card>
      <h3 className="mb-3 font-bold">
        صندوق توجه
      </h3>

      {count ? (
        <div className="grid gap-2">
          {items.map((item) => {
            if (!Number(item.count)) {
              return null;
            }

            const Icon =
              attentionIcons[item.key];

            return (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-md bg-slate-50 p-3"
              >
                <span className="flex items-center gap-2">
                  <Icon size={17} />
                  {item.label}
                </span>

                <strong>
                  {fa(item.count)}
                </strong>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title="مورد فوری برای پیگیری وجود ندارد." />
      )}
    </Card>
  );
}
