import { Card } from "../../../shared/ui/ui";

export function TodayActivityCard() {
  return (
    <Card>
      <h3 className="mb-3 font-bold">
        فعالیت امروز
      </h3>

      <div className="grid gap-3 text-sm">
        <p>
          <strong>07:00</strong> روان‌شناسی
        </p>

        <p>
          <strong>09:00</strong> آزمون
        </p>

        <p>
          <strong>11:00</strong> مرور
        </p>
      </div>
    </Card>
  );
}
