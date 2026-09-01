import { CheckCircle2, Copy, Server } from "lucide-react";
import { useState } from "react";
import { getBackendTargetUrl, getSelectedApiVersion } from "../../../shared/api/api";
import { Button, Card } from "../../../shared/ui/ui";

export function ApiConnectionCard() {
  const [copied, setCopied] = useState(false);
  const target = getBackendTargetUrl();
  const version = getSelectedApiVersion();
  async function copy() {
    await navigator.clipboard.writeText(target);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return <Card className="h-full"><div className="mb-4 flex items-start gap-3"><span className="grid size-10 place-items-center rounded-lg bg-violet-50 text-violet-700"><Server size={20}/></span><div><h3 className="font-bold">اتصال API</h3><p className="text-xs text-slate-500">مقصد واقعی درخواست‌های این پنل</p></div></div><div className="rounded-lg border bg-slate-950 p-3 text-left text-xs text-slate-100" dir="ltr"><span className="mb-2 inline-flex rounded-full bg-emerald-500/20 px-2 py-1 font-bold text-emerald-300">API {version}</span><p className="break-all font-mono">{target}</p></div><div className="mt-3 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">تغییر نسخه در ابزار انتخاب سرور پس از بارگذاری مجدد اعمال می‌شود.</span><Button className="shrink-0" variant="soft" onClick={()=>void copy()}>{copied?<CheckCircle2 size={15}/>:<Copy size={15}/>} {copied?"کپی شد":"کپی"}</Button></div></Card>;
}
