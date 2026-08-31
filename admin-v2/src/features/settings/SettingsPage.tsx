import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Select,
} from "../../components/ui";
import { locations, useLocale, type LocationId } from "../../components/locale";
import { api, apiBaseUrl } from "../../services/api";
import { useModal } from "../../components/modal";

type Session = {
  id: string;
  current?: boolean;
  ipAddress?: string;
  userAgent?: string;
  lastSeenAt?: string;
};

export function SettingsPage() {
  const qc = useQueryClient(),
    modal = useModal(),
    locale = useLocale();
  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<Session[]>("/auth/sessions"),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
    meta: { successMessage: "نشست با موفقیت بسته شد." },
  });
  return (
    <div className="grid gap-5">
      <div>
        <h2 className="text-2xl font-black">تنظیمات</h2>
        <p className="text-slate-500">موقعیت، تقویم، نشست‌ها و API</p>
      </div>
      <Card>
        <h3 className="mb-3 font-bold">موقعیت و تقویم</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="موقعیت">
            <Select
              value={locale.profile.id}
              onChange={(event) =>
                locale.setLocation(event.target.value as LocationId)
              }
            >
              {locations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <span className="block text-slate-500">تقویم و منطقه زمانی</span>
            <strong>
              {locale.profile.calendar === "persian" ? "هجری شمسی" : "میلادی"} •{" "}
              {locale.profile.timeZone}
            </strong>
            <p className="mt-1 text-slate-500">
              امروز: {locale.formatDate(new Date(), { weekday: "long" })}
            </p>
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="mb-2 font-bold">API</h3>
        <p className="text-sm text-slate-600" dir="ltr">
          {apiBaseUrl}
        </p>
      </Card>
      <Card>
        <h3 className="mb-3 font-bold">نشست‌های فعال</h3>
        {sessions.data?.length ? (
          <div className="grid gap-2">
            {sessions.data.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <strong>{session.current ? "نشست فعلی" : "نشست فعال"}</strong>
                  <p className="text-xs text-slate-500">
                    {session.ipAddress || "IP نامشخص"} -{" "}
                    {(session.userAgent || "").slice(0, 80)}
                  </p>
                  {session.lastSeenAt ? (
                    <small className="text-slate-400">
                      {locale.formatDateTime(session.lastSeenAt)}
                    </small>
                  ) : null}
                </div>
                {session.current ? (
                  <Badge>فعلی</Badge>
                ) : (
                  <Button
                    variant="danger"
                    loading={
                      revoke.isPending && revoke.variables === session.id
                    }
                    onClick={() =>
                      void modal
                        .confirm({
                          title: "بستن نشست؟",
                          description: "دسترسی این دستگاه فوراً لغو می‌شود.",
                          tone: "danger",
                          confirmLabel: "بستن نشست",
                        })
                        .then(
                          (confirmed) => confirmed && revoke.mutate(session.id),
                        )
                    }
                  >
                    بستن
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="نشستی پیدا نشد." />
        )}
      </Card>
    </div>
  );
}
