import { useState, type Dispatch, type SetStateAction } from "react";
import { LoaderCircle } from "lucide-react";
import { notify } from "../../../shared/ui/notifications";
import type {
  PushPreferences,
  PushStatus,
} from "../model/notification-model";

export function NotificationPreference({
  label,
  name,
  status,
  save,
  setStatus,
}: {
  label: string;
  name: keyof PushPreferences;
  status: PushStatus | null;
  save: (value: PushPreferences) => Promise<void>;
  setStatus: Dispatch<SetStateAction<PushStatus | null>>;
}) {
  const [saving, setSaving] = useState(false);
  const enabled = status?.preferences[name] !== false;

  async function updatePreference(nextEnabled: boolean) {
    if (!status || saving) {
      return;
    }

    const previous = status;
    const preferences = {
      ...status.preferences,
      [name]: nextEnabled,
    };

    setStatus({ ...status, preferences });
    setSaving(true);

    try {
      await save(preferences);
    } catch {
      setStatus(previous);
      notify("ذخیره ترجیح اعلان انجام نشد.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <label
      className={[
        "flex items-center justify-between gap-3 rounded-xl border p-3 text-sm transition",
        "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
        saving ? "opacity-70" : "hover:border-brand/40",
      ].join(" ")}
    >
      <span className="text-slate-700 dark:text-slate-200">{label}</span>

      <span className="flex items-center gap-2">
        {saving ? (
          <LoaderCircle className="animate-spin text-slate-400" size={14} />
        ) : null}
        <input
          type="checkbox"
          checked={enabled}
          disabled={!status || saving}
          onChange={(event) => void updatePreference(event.target.checked)}
          aria-label={`اعلان ${label}`}
          className="size-4 accent-brand"
        />
      </span>
    </label>
  );
}
