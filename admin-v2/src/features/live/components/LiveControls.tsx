import { Search } from "lucide-react";
import { fa } from "../../../shared/lib/utils";
import {
  Card,
  Select,
} from "../../../shared/ui/ui";
import type {
  LiveFilter,
  LivePanel,
} from "../model/live.types";

export function LiveControls({
  search,
  filter,
  panel,
  visibleCount,
  totalCount,
  onSearchChange,
  onFilterChange,
  onPanelChange,
}: {
  search: string;
  filter: LiveFilter;
  panel: LivePanel;
  visibleCount: number;
  totalCount: number;
  onSearchChange: (
    value: string,
  ) => void;
  onFilterChange: (
    value: LiveFilter,
  ) => void;
  onPanelChange: (
    value: LivePanel,
  ) => void;
}) {
  return (
    <Card className="shrink-0 p-2">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-indigo-100">
          <Search
            size={16}
            className="text-slate-400"
          />

          <input
            aria-label="جستجوی دانش‌آموز"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            value={search}
            onChange={(event) =>
              onSearchChange(
                event.target.value,
              )
            }
            placeholder="نام، پایه، رشته یا صفحه فعلی…"
          />
        </label>

        <Select
          aria-label="فیلتر وضعیت"
          value={filter}
          onChange={(event) =>
            onFilterChange(
              event.target
                .value as LiveFilter,
            )
          }
        >
          <option value="all">
            همه وضعیت‌ها
          </option>

          <option value="online">
            آنلاین
          </option>

          <option value="studying">
            در حال مطالعه
          </option>

          <option value="paused">
            متوقف
          </option>

          <option value="taking_exam">
            در حال آزمون
          </option>

          <option value="attention">
            نیازمند توجه
          </option>

          <option value="offline">
            آفلاین
          </option>
        </Select>

        <span className="self-center text-xs text-slate-500">
          نمایش{" "}
          {fa(visibleCount)} از{" "}
          {fa(totalCount)}
        </span>

        <div className="flex rounded-md bg-slate-100 p-1 lg:hidden">
          <button
            className={[
              "rounded px-2 py-1 text-xs",
              panel === "students"
                ? "bg-white font-bold shadow-sm"
                : "",
            ].join(" ")}
            onClick={() =>
              onPanelChange(
                "students",
              )
            }
          >
            دانش‌آموزان
          </button>

          <button
            className={[
              "rounded px-2 py-1 text-xs",
              panel === "timeline"
                ? "bg-white font-bold shadow-sm"
                : "",
            ].join(" ")}
            onClick={() =>
              onPanelChange(
                "timeline",
              )
            }
          >
            رویدادها
          </button>
        </div>
      </div>
    </Card>
  );
}
