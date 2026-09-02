import type {
  Dispatch,
  SetStateAction,
} from "react";
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
  save: (
    value: PushPreferences,
  ) => Promise<void>;
  setStatus: Dispatch<
    SetStateAction<
      PushStatus | null
    >
  >;
}) {
  const enabled =
    status?.preferences[
      name
    ] !== false;

  return (
    <label className="flex items-center justify-between rounded-md border p-3 text-sm">
      <span>
        {label}
      </span>

      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => {
          if (!status) {
            return;
          }

          const preferences = {
            ...status.preferences,
            [name]:
              event.target
                .checked,
          };

          setStatus({
            ...status,
            preferences,
          });

          void save(
            preferences,
          ).catch(() =>
            setStatus(status),
          );
        }}
      />
    </label>
  );
}
