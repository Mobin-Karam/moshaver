import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../../shared/ui/ui";
import { useLocale } from "../../../shared/ui/locale";
import { apiBaseUrl } from "../../../shared/api/api";
import { useModal } from "../../../shared/ui/modal";
import { getSessions, revokeSession } from "../api/settings.api";
import { LocationSettings } from "../components/LocationSettings";
import { SessionsSettings } from "../components/SessionsSettings";
export function SettingsPage() {
 const qc = useQueryClient(), modal = useModal(), locale = useLocale();
 const sessions = useQuery({ queryKey: ["sessions"], queryFn: getSessions });
 const revoke = useMutation({ mutationFn: revokeSession, onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }), meta: { successMessage: "نشست با موفقیت بسته شد." } });
 return <div className="grid gap-5"><LocationSettings locale={locale} /><Card><h3 className="mb-2 font-bold">API</h3><p className="text-sm text-slate-600" dir="ltr">{apiBaseUrl}</p></Card><SessionsSettings sessions={sessions} revoke={revoke} formatDateTime={locale.formatDateTime} confirm={(id) => void modal.confirm({ title: "بستن نشست؟", description: "دسترسی این دستگاه فوراً لغو می‌شود.", tone: "danger", confirmLabel: "بستن نشست" }).then((confirmed) => confirmed && revoke.mutate(id))} /></div>;
}
