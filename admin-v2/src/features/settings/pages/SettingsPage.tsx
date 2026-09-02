import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "../../../shared/ui/locale";
import { useModal } from "../../../shared/ui/modal";
import { notify } from "../../../shared/ui/notifications";
import { getSessions, revokeSession } from "../api/settings.api";
import { LocationSettings } from "../components/LocationSettings";
import { SessionsSettings } from "../components/SessionsSettings";
import { ApiConnectionCard } from "../components/ApiConnectionCard";
export function SettingsPage() {
 const qc = useQueryClient(), modal = useModal(), locale = useLocale();
 const sessions = useQuery({ queryKey: ["sessions"], queryFn: getSessions });
 const revoke = useMutation({ mutationFn: revokeSession, onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }), meta: { successMessage: "نشست با موفقیت بسته شد." } });
 return <div className="grid gap-4"><section className="grid gap-4 lg:grid-cols-2"><LocationSettings locale={locale} onChange={()=>notify("موقعیت و تقویم این مرورگر به‌روز شد.")}/><ApiConnectionCard/></section><SessionsSettings sessions={sessions} revoke={revoke} formatDateTime={locale.formatDateTime} confirm={(id) => void modal.confirm({ title: "بستن نشست این دستگاه؟", description: "دسترسی دستگاه انتخاب‌شده فوراً لغو می‌شود و برای ورود دوباره به رمز نیاز دارد.", tone: "danger", confirmLabel: "بستن دسترسی" }).then((confirmed) => confirmed && revoke.mutate(id))} /></div>;
}
