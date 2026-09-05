import { api } from "../../../shared/api/api";
import type { Exam, Plan } from "../../../shared/types/domain";
import type { PlanDraft, TaskDraft, TaskFilter } from "../model/planner.types";
import { normalizePersianText } from "../../../shared/lib/utils";
import { normalizeTaskDraft, timeToMinutes } from "../lib/planner-model";
export function plansUrl(studentId:string,from:string,to:string,search:string,filter:TaskFilter){return `/plans?studentId=${encodeURIComponent(studentId)}&from=${from}&to=${to}&search=${encodeURIComponent(normalizePersianText(search))}&status=${filter}`}
export const getPlans=(studentId:string,from:string,to:string,search:string,filter:TaskFilter)=>api.get<Plan[]>(plansUrl(studentId,from,to,search,filter));
export const getPlanForDate=(studentId:string,date:string)=>api.get<Plan[]>(`/plans?studentId=${encodeURIComponent(studentId)}&date=${encodeURIComponent(date)}`).then((items)=>items[0]??null);
export const getPlannerExams=(studentId:string)=>api.get<Exam[]>(`/exams?studentId=${encodeURIComponent(studentId)}`);
export const createPlan=(studentId:string,body:PlanDraft)=>api.post<Plan>("/plans",{...body,studentId});
export const updatePlan=(id:string,body:Partial<PlanDraft>)=>api.patch<Plan>(`/plans/${id}`,body);
export const deletePlan=(id:string)=>api.delete(`/plans/${id}`);
export const duplicatePlan=(id:string,planDate:string)=>api.post(`/plans/${id}/duplicate`,{planDate});
export const savePlannerTask=(planId:string,task:TaskDraft&{id?:string})=>task.id?api.patch<Plan>(`/tasks/${task.id}`,normalizeTaskDraft(task)):api.post<Plan>(`/plans/${planId}/tasks`,normalizeTaskDraft(task));
export const deletePlannerTask=(id:string)=>api.delete(`/tasks/${id}`);
export const movePlannerTask=(taskId:string,planId:string,start:string,end:string)=>api.patch<Plan>(`/tasks/${taskId}`,{planId,start,end,sortOrder:timeToMinutes(start)});
export const publishPlanRange=(studentId:string,from:string,to:string,published:boolean)=>api.post("/plans/publish-range",{studentId,from,to,published});
