import { useState } from "react";
import { RotateCw, Server } from "lucide-react";
import { BackendTarget, getBackendTargetUrl, getSelectedBackend, setSelectedBackend } from "../services/api";
import { Button, Select } from "./ui";

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
  const [selected, setSelected] = useState<BackendTarget | "">(getSelectedBackend() ?? "");

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-md border border-slate-200 bg-white p-2 text-xs shadow-lg" dir="ltr">
      <Server size={16} className="shrink-0 text-slate-500" />
      <Select
        aria-label="Backend server"
        className="h-8 w-40 text-xs"
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
      <span className="hidden max-w-64 truncate text-slate-500 md:block">{labelFor(selected)}</span>
      <Button className="h-8 px-2" variant="soft" title="Reload with selected backend" onClick={() => window.location.reload()}>
        <RotateCw size={14} />
      </Button>
    </div>
  );
}
