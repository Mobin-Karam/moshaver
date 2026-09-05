import { Filter } from "lucide-react";

import { Button, Badge } from "../../../shared/ui/ui";
import { ViewportPopover } from "../../../shared/ui/popover";

import type { TaskFilter } from "../model/planner.types";
import { filterLabel } from "../lib/planner-model";

export function PlannerFilterPopover({
  value,
  onChange,
}: {
  value: TaskFilter;
  onChange: (value: TaskFilter) => void;
}) {
  return (
    <ViewportPopover
      width={240}
      align="end"
      className="p-2"
      trigger={({ ref, onClick, ...props }) => (
        <Button
          ref={ref}
          {...props}
          className="h-9 px-3"
          variant="soft"
          onClick={onClick}
        >
          <Filter size={15} />
          فیلتر
          {value !== "all" ? <Badge tone="blue">۱</Badge> : null}
        </Button>
      )}
    >
      <div className="space-y-1">
        <strong
          className="
            block
            px-3
            py-2
            text-xs
            text-slate-500
            dark:text-slate-400
          "
        >
          وضعیت برنامه
        </strong>

        {(["all", "published", "draft", "incomplete"] as TaskFilter[]).map(
          (item) => (
            <button
              key={item}
              className={`
              block
              w-full
              rounded-xl
              px-3
              py-2
              text-right
              text-sm
              transition

              ${
                value === item
                  ? `
                    bg-brand/10
                    text-brand
                    font-semibold
                  `
                  : `
                    hover:bg-slate-100
                    dark:hover:bg-slate-800
                  `
              }
            `}
              onClick={() => onChange(item)}
            >
              {filterLabel(item)}
            </button>
          ),
        )}
      </div>
    </ViewportPopover>
  );
}
