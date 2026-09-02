import {
  CheckCircle2,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { useBackendHealth } from "../hooks/useBackendHealth";

export function BackendHealthStatus() {
  const { health, checkHealth } = useBackendHealth();

  return (
    <div
      className={[
        "mb-4 flex items-center gap-2 rounded-md border p-3 text-xs",
        health.error
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
      ].join(" ")}
    >
      {health.loading ? (
        <RefreshCw className="animate-spin" size={16} />
      ) : health.error ? (
        <WifiOff size={16} />
      ) : (
        <CheckCircle2 size={16} />
      )}

      <span className="min-w-0 flex-1 truncate">
        {health.loading
          ? "در حال بررسی اتصال…"
          : health.error ||
            `اتصال برقرار است • نسخه ${health.data?.version || "—"}`}
      </span>

      <button
        type="button"
        aria-label="بررسی دوباره اتصال"
        onClick={() => void checkHealth()}
      >
        <RefreshCw size={15} />
      </button>
    </div>
  );
}
