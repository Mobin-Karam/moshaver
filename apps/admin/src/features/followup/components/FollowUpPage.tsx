import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { useAuth } from "../../auth";
import { notify } from "../../../shared/ui/notifications";
import { Badge, Button, Card, EmptyState, ErrorState } from "../../../shared/ui/ui";
import { listRecoveryRequests, moderateRecoveryRequest } from "../api/followup.api";

export function FollowUpPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const requests = useQuery({ queryKey: ["recovery-requests"], queryFn: listRecoveryRequests });
  const moderate = useMutation({
    mutationFn: moderateRecoveryRequest,
    onSuccess: async () => {
      notify("وضعیت درخواست پیگیری به‌روزرسانی شد.", "success");
      await queryClient.invalidateQueries({ queryKey: ["recovery-requests"] });
    },
    onError: () => notify("به‌روزرسانی درخواست انجام نشد.", "error"),
  });
  const pending = (requests.data ?? []).filter((item) => item.status === "pending");

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold text-brand">عملیات پشتیبانی</p>
        <h1 className="text-xl font-black">مرکز پیگیری</h1>
        <p className="mt-1 text-sm text-slate-500">
          درخواست‌های بازیابی برنامه در تمام محدوده مجاز شما
        </p>
      </div>
      {requests.isLoading ? (
        <Card role="status" className="p-8 text-center">
          در حال دریافت درخواست‌ها…
        </Card>
      ) : null}
      {requests.isError ? (
        <ErrorState
          title="درخواست‌های پیگیری دریافت نشد."
          action={
            <Button variant="soft" onClick={() => void requests.refetch()}>
              <RefreshCw size={16} /> تلاش دوباره
            </Button>
          }
        />
      ) : null}
      {!requests.isLoading && !requests.isError && !pending.length ? (
        <EmptyState
          title="درخواست بازیابی بازی وجود ندارد."
          description="درخواست‌های تازه دانش‌آموزان در این بخش ظاهر می‌شوند."
        />
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {pending.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge tone="blue">درخواست بازیابی</Badge>
                <h2 className="mt-2 font-black">{item.student?.name ?? "دانش‌آموز"}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  برنامه {item.planDate ?? item.plan_date ?? "—"}
                </p>
              </div>
            </div>
            {item.reason ? <p className="mt-3 text-sm font-bold">{item.reason}</p> : null}
            {item.note ? (
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
                {item.note}
              </p>
            ) : null}
            {auth.can("recovery_requests.manage") ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  loading={moderate.isPending && moderate.variables?.id === item.id}
                  onClick={() => moderate.mutate({ id: item.id, status: "resolved" })}
                >
                  <CheckCircle2 size={15} /> حل شد
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={moderate.isPending && moderate.variables?.id === item.id}
                  onClick={() => moderate.mutate({ id: item.id, status: "dismissed" })}
                >
                  <XCircle size={15} /> رد درخواست
                </Button>
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
