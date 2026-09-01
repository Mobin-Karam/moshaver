import { Card, Field, Select } from "../../../shared/ui/ui";
import { locations, useLocale, type LocationId } from "../../../shared/ui/locale";
export function LocationSettings({ locale }: { locale: ReturnType<typeof useLocale> }) {
  return <Card><h3 className="mb-3 font-bold">موقعیت و تقویم</h3><div className="grid gap-3 md:grid-cols-2"><Field label="موقعیت"><Select value={locale.profile.id} onChange={(event) => locale.setLocation(event.target.value as LocationId)}>{locations.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field><div className="rounded-md bg-slate-50 p-3 text-sm"><span className="block text-slate-500">تقویم و منطقه زمانی</span><strong>{locale.profile.calendar === "persian" ? "هجری شمسی" : "میلادی"} • {locale.profile.timeZone}</strong><p className="mt-1 text-slate-500">امروز: {locale.formatDate(new Date(), { weekday: "long" })}</p></div></div></Card>;
}
