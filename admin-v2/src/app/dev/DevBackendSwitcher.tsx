import { useState } from "react";
import { RotateCw, Server } from "lucide-react";
import {
  ApiVersion,
  BackendTarget,
  getBackendTargetUrl,
  getSelectedBackend,
  getSelectedApiVersion,
  setSelectedBackend,
  setSelectedApiVersion,
} from "../../shared/api/api";
import { Button, Select } from "../../shared/ui/ui";

const options: Array<{ value: BackendTarget | ""; label: string }> = [
  { value: "", label: "Env default" },
  { value: "local", label: "Local backend" },
  { value: "remote", label: "Remote backend" },
];

function labelFor(value: BackendTarget | "", version: ApiVersion) {
  if (value === "local") return `http://localhost:4000/api/${version}`;
  if (value === "remote") return `https://api.mahakaram.ir/api/${version}`;
  return getBackendTargetUrl();
}

export function DevBackendSwitcher() {
  const [selected, setSelected] = useState<BackendTarget | "">(
    getSelectedBackend() ?? "",
  );
  const [version, setVersion] = useState<ApiVersion>(getSelectedApiVersion());

  if (!import.meta.env.DEV) return null;

  return (
    <div
      className="flex min-w-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 text-xs sm:gap-1.5"
      dir="ltr"
      title={`Backend: ${labelFor(selected, version)}`}
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
      <Select
        aria-label="API version"
        className="h-8 w-[4.5rem] border-0 bg-transparent px-1 text-[11px] sm:text-xs"
        value={version}
        onChange={(event) => {
          const next = event.target.value as ApiVersion;
          setVersion(next);
          setSelectedApiVersion(next);
        }}
      >
        <option value="v1">API v1</option>
        <option value="v2">API v2</option>
      </Select>
      <span className="hidden max-w-52 truncate text-slate-500 2xl:block">
        {labelFor(selected, version)}
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
