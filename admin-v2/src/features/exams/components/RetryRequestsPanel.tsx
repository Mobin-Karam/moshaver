import {
  Check,
  X,
} from "lucide-react";
import {
  Button,
  Card,
} from "../../../shared/ui/ui";
import type { RetryRequest } from "../model/exam.types";

export function RetryRequestsPanel({
  requests,
  onReview,
}: {
  requests: RetryRequest[];
  onReview: (
    request: RetryRequest,
    status:
      | "approved"
      | "rejected",
  ) => void;
}) {
  if (!requests.length) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <details open>
        <summary className="cursor-pointer font-bold">
          {requests.length} درخواست تلاش
          مجدد در انتظار بررسی
        </summary>

        <div className="grid gap-2">
          {requests.map(
            (request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
              >
                <div>
                  <strong>
                    {request.examTitle ||
                      "آزمون"}
                  </strong>

                  <p className="text-xs text-slate-500">
                    {request.reason ||
                      request.message ||
                      "بدون توضیح"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      onReview(
                        request,
                        "approved",
                      )
                    }
                  >
                    <Check size={15} />
                    تأیید
                  </Button>

                  <Button
                    variant="danger"
                    onClick={() =>
                      onReview(
                        request,
                        "rejected",
                      )
                    }
                  >
                    <X size={15} />
                    رد
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      </details>
    </Card>
  );
}
