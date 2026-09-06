import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users } from "lucide-react";
import { listOrganizationMembers } from "../../access/api/access.api";
import { Button, EmptyState, Field, Select } from "../../../shared/ui/ui";
import { assignSubjectTeacher, getSubjectTeachers, unassignSubjectTeacher } from "../api/subjects.api";

export function TeacherAssignments({subjectId,organizationId}:{subjectId:string;organizationId:string}){
 const qc=useQueryClient(),[teacherId,setTeacherId]=useState("");
 const assignments=useQuery({queryKey:["subject-teachers",subjectId,organizationId],queryFn:()=>getSubjectTeachers(subjectId,organizationId)});
 const members=useQuery({queryKey:["organization-members",organizationId],queryFn:()=>listOrganizationMembers(organizationId)});
 const refresh=()=>qc.invalidateQueries({queryKey:["subject-teachers",subjectId,organizationId]});
 const assign=useMutation({mutationFn:()=>assignSubjectTeacher(subjectId,teacherId,organizationId),onSuccess:async()=>{setTeacherId("");await refresh();}});
 const remove=useMutation({mutationFn:(id:string)=>unassignSubjectTeacher(subjectId,id,organizationId),onSuccess:refresh});
 const teachers=(members.data||[]).filter(member=>member.status==="ACTIVE"&&member.roles.includes("TEACHER")&&!assignments.data?.some(item=>item.teacher.id===member.user.id));
 return <div className="grid gap-3"><form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={e=>{e.preventDefault();assign.mutate();}}><Field label="دبیر سازمان"><Select required value={teacherId} onChange={e=>setTeacherId(e.target.value)}><option value="">انتخاب دبیر…</option>{teachers.map(item=><option key={item.user.id} value={item.user.id}>{[item.user.firstName,item.user.lastName].filter(Boolean).join(" ")||item.user.username}</option>)}</Select></Field><Button className="sm:mt-6" loading={assign.isPending} disabled={!teacherId}><UserPlus size={16}/>تخصیص</Button></form>{assign.isError?<p role="alert" className="text-sm text-rose-700">تخصیص دبیر ناموفق بود؛ عضویت و نقش دبیر را بررسی کنید.</p>:null}<div className="flex items-center gap-2"><Users size={16}/><strong className="text-sm">دبیران این درس</strong></div>{assignments.isLoading?<div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"/>:assignments.isError?<div role="alert"><p className="text-sm text-rose-700">دبیران دریافت نشدند.</p><Button variant="soft" onClick={()=>assignments.refetch()}>تلاش دوباره</Button></div>:!assignments.data?.length?<EmptyState title="هنوز دبیری تخصیص داده نشده است."/>:<div className="grid gap-2">{assignments.data.map(item=><div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 dark:border-slate-800"><strong>{[item.teacher.firstName,item.teacher.lastName].filter(Boolean).join(" ")||item.teacher.username}</strong><Button variant="danger" loading={remove.isPending} onClick={()=>remove.mutate(item.teacher.id)}>حذف تخصیص</Button></div>)}</div>}</div>;
}
