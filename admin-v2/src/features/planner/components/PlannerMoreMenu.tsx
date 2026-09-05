import { MoreHorizontal } from "lucide-react";
import { ViewportPopover } from "../../../shared/ui/popover";

export function PlannerMoreMenu({
  onClose,
  onPlan,
  onPublish,
  onTransfer,
}: {
  onClose: () => void;
  onPlan: () => void;
  onPublish: (value: boolean) => void;
  onTransfer: () => void;
}) {
  return (
    <ViewportPopover
      width={240}
      align="end"
      className="p-2"
      trigger={({ ref, onClick, ...props }) => (
        <button
          ref={ref}
          onClick={onClick}
          {...props}
          type="button"
          className="
            grid
            size-9
            place-items-center
            rounded-xl
            text-slate-500
            transition
            hover:bg-slate-100
            hover:text-slate-900

            dark:text-slate-400
            dark:hover:bg-slate-800
            dark:hover:text-white
          "
        >
          <MoreHorizontal size={18} />
        </button>
      )}
    >
      <div className="space-y-1">
        <button
          className="
            block
            w-full
            rounded-xl
            px-3
            py-2
            text-right
            text-sm
            transition
            hover:bg-slate-100
            dark:hover:bg-slate-800
          "
          onClick={() => {
            onPlan();
            onClose();
          }}
        >
          تنظیمات برنامه روز
        </button>

        <button
          className="
            block
            w-full
            rounded-xl
            px-3
            py-2
            text-right
            text-sm
            transition
            hover:bg-slate-100
            dark:hover:bg-slate-800
          "
          onClick={() => {
            onPublish(true);
            onClose();
          }}
        >
          انتشار بازه
        </button>

        <button
          className="
            block
            w-full
            rounded-xl
            px-3
            py-2
            text-right
            text-sm
            transition
            hover:bg-slate-100
            dark:hover:bg-slate-800
          "
          onClick={() => {
            onPublish(false);
            onClose();
          }}
        >
          پیش‌نویس کردن بازه
        </button>

        <button
          className="
            block
            w-full
            rounded-xl
            px-3
            py-2
            text-right
            text-sm
            transition
            hover:bg-slate-100
            dark:hover:bg-slate-800
          "
          onClick={() => {
            onTransfer();
            onClose();
          }}
        >
          ورود / خروج JSON
        </button>

        <div className="my-2 border-t border-slate-200 dark:border-slate-700" />

        <button
          className="
            block
            w-full
            rounded-xl
            px-3
            py-2
            text-right
            text-xs
            text-slate-400
            transition
            hover:bg-slate-100
            dark:hover:bg-slate-800
          "
          onClick={onClose}
        >
          بستن
        </button>
      </div>
    </ViewportPopover>
  );
}
