import type {
  ReactNode,
} from "react";

export function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onClick}
      className={[
        "flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-500",
      ].join(" ")}
    >
      {icon}
      {label}

      <span
        className={[
          "size-2 rounded-full",
          active
            ? "bg-emerald-500"
            : "bg-slate-300",
        ].join(" ")}
      />
    </button>
  );
}
