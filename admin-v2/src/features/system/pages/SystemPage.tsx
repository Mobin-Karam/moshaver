import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useModal } from "../../../shared/ui/modal";
import { changeAdminPassword, downloadDatabaseBackup, getAudit, getDatabaseMeta, getImportHistory, getReleases, getSessions, restoreDatabase, saveAppRelease } from "../api/system.api";
import { AccountSecurityPanel } from "../components/AccountSecurityPanel";
import { DatabaseBackupPanel } from "../components/DatabaseBackupPanel";
import { ReleasePanel } from "../components/ReleasePanel";
import { SystemHistory } from "../components/SystemHistory";
import { SystemMetric } from "../components/SystemMetric";
import { SystemSessionsPanel } from "../components/SystemSessionsPanel";
export function SystemPage() {
 const qc = useQueryClient(); const modal = useModal();
 const [file,setFile] = useState<File|null>(null); const [passwords,setPasswords] = useState({currentPassword:"",newPassword:""}); const [release,setRelease] = useState({app:"admin",version:"",notes:""});
 const database = useQuery({queryKey:["system-database"],queryFn:getDatabaseMeta}); const sessions=useQuery({queryKey:["sessions"],queryFn:getSessions}); const imports=useQuery({queryKey:["import-history"],queryFn:getImportHistory}); const releases=useQuery({queryKey:["app-releases"],queryFn:getReleases}); const audit=useQuery({queryKey:["audit"],queryFn:getAudit});
 const restore=useMutation({mutationFn:()=>{if(!file) throw new Error("فایل انتخاب نشده است."); return restoreDatabase(file);}});
 const changePassword=useMutation({mutationFn:()=>changeAdminPassword(passwords),onSuccess:()=>setPasswords({currentPassword:"",newPassword:""})});
 const saveRelease=useMutation({mutationFn:()=>saveAppRelease(release),onSuccess:()=>{setRelease({...release,version:"",notes:""}); qc.invalidateQueries({queryKey:["app-releases"]});}});
 async function download(){const result=await downloadDatabaseBackup(); const url=URL.createObjectURL(result.blob); const anchor=document.createElement("a"); anchor.href=url; anchor.download=result.filename; anchor.click(); URL.revokeObjectURL(url);}
 const meta=database.data;
 return <div className="grid gap-5"><section className="grid gap-3 md:grid-cols-4"><SystemMetric label="پایگاه داده" value={meta?.database || meta?.status || "-"}/><SystemMetric label="نسخه" value={meta?.version || "-"}/><SystemMetric label="نشست فعال" value={String(meta?.activeSessions || 0)}/><SystemMetric label="اتصال زنده" value={String(meta?.realtimeConnections || 0)}/></section><DatabaseBackupPanel file={file} busy={restore.isPending} setFile={setFile} onDownload={()=>void download()} onRestore={()=>void modal.confirm({title:"بازیابی پایگاه داده؟",description:"پایگاه داده فعلی جایگزین و سرویس بک‌اند دوباره راه‌اندازی می‌شود. این عملیات پرخطر است.",tone:"danger",confirmLabel:"بازیابی"}).then((confirmed)=>confirmed&&restore.mutate())}/><section className="grid gap-4 lg:grid-cols-2"><AccountSecurityPanel passwords={passwords} setPasswords={setPasswords} busy={changePassword.isPending} onSubmit={()=>void modal.confirm({title:"تغییر رمز مدیر؟",description:"پس از تغییر رمز، نشست‌های دیگر این حساب بسته می‌شوند.",confirmLabel:"تغییر رمز"}).then((confirmed)=>confirmed&&changePassword.mutate())}/><SystemSessionsPanel sessions={sessions.data}/></section><ReleasePanel release={release} setRelease={setRelease} busy={saveRelease.isPending} onSubmit={()=>void modal.confirm({title:"ثبت انتشار جدید؟",description:`${release.app} • ${release.version}`,confirmLabel:"ثبت انتشار"}).then((confirmed)=>confirmed&&saveRelease.mutate())}/><SystemHistory title="تاریخچه انتشار" rows={releases.data}/><SystemHistory title="تاریخچه ورود JSON" rows={imports.data}/><SystemHistory title="گزارش ممیزی" rows={audit.data}/></div>;
}
