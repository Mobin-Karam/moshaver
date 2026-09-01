import { useState } from "react";
import { RotateCw, Server } from "lucide-react";
import {
  BackendTarget,
  getBackendTargetUrl,
  getSelectedBackend,
  setSelectedBackend,
} from "../../shared/api/api";
import { Button, Select } from "../../shared/ui/ui";

const options: Array<{ value: BackendTarget | ""; label: string }> = [
  { value: "", label: "Env default" },
  { value: "local", label: "Local backend" },
  { value: "remote", label: "Remote backend" },
];

function labelFor(value: BackendTarget | "") {
  if (value === "local") return "http://localhost:4000/api/v1";
  if (value === "remote") return "https://api.mahakaram.ir/api/v1";
  return getBackendTargetUrl();
}

export function DevBackendSwitcher() {
  const [selected, setSelected] = useState<BackendTarget | "">(
    getSelectedBackend() ?? "",
  );

  if (!import.meta.env.DEV) return null;

  return (
    <div
      className="flex min-w-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 text-xs sm:gap-1.5"
      dir="ltr"
      title={`Backend: ${labelFor(selected)}`}
    >
      <Server size={15} className="hidden shrink-0 text-slate-500 sm:block" />
      <Select
        aria-label="Backend server"
        className="h-8 w-[7.25rem] border-0 bg-transparent px-1 text-[11px] sm:w-36 sm:text-xs"
        value={selected}
        onChange={(event) => {
          const next = event.target.value as BackendTarget | "";
          setSelected(next);
          setSelectedBackend(next || null);
        }}
      >
        {options.map((option) => (
          <option key={option.value || "env"} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <span className="hidden max-w-52 truncate text-slate-500 2xl:block">
        {labelFor(selected)}
      </span>
      <Button
        className="h-8 shrink-0 px-2"
        variant="soft"
        title="Reload with selected backend"
        onClick={() => window.location.reload()}
      >
        <RotateCw size={14} />
      </Button>
    </div>
  );
}
