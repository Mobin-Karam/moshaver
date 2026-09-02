import { api } from "../../../shared/api/api";
import type { Exam, Plan } from "../../../shared/types/domain";
import type { PlanDraft, TaskDraft, TaskFilter } from "../model/planner.types";
import { normalizePersianText } from "../../../shared/lib/utils";
import { normalizeTaskDraft, timeToMinutes } from "../lib/planner-model";
export function plansUrl(studentId:string,from:string,to:string,search:string,filter:TaskFilter){return `/admin/plans?studentId=${encodeURIComponent(studentId)}&from=${from}&to=${to}&search=${encodeURIComponent(normalizePersianText(search))}&status=${filter}`}
export const getPlans=(studentId:string,from:string,to:string,search:string,filter:TaskFilter)=>api.get<Plan[]>(plansUrl(studentId,from,to,search,filter));
export const getPlanForDate=(studentId:string,date:string)=>api.get<Plan|null>(`/admin/plans?studentId=${encodeURIComponent(studentId)}&date=${encodeURIComponent(date)}`);
export const getPlannerExams=(studentId:string)=>api.get<Exam[]>(`/admin/exams?studentId=${encodeURIComponent(studentId)}`);
export const createPlan=(studentId:string,body:PlanDraft)=>api.post<Plan>("/admin/plans",{...body,studentId});
export const updatePlan=(id:string,body:Partial<PlanDraft>)=>api.patch<Plan>(`/admin/plans/${id}`,body);
export const deletePlan=(id:string)=>api.delete(`/admin/plans/${id}`);
export const duplicatePlan=(id:string,planDate:string)=>api.post(`/admin/plans/${id}/duplicate`,{planDate});
export const savePlannerTask=(planId:string,task:TaskDraft&{id?:string})=>task.id?api.patch<Plan>(`/admin/tasks/${task.id}`,normalizeTaskDraft(task)):api.post<Plan>(`/admin/plans/${planId}/tasks`,normalizeTaskDraft(task));
export const deletePlannerTask=(id:string)=>api.delete(`/admin/tasks/${id}`);
export const movePlannerTask=(taskId:string,planId:string,start:string,end:string)=>api.patch<Plan>(`/admin/tasks/${taskId}`,{planId,start,end,sortOrder:timeToMinutes(start)});
export const publishPlanRange=(studentId:string,from:string,to:string,published:boolean)=>api.post("/admin/plans/publish-range",{studentId,from,to,published});
