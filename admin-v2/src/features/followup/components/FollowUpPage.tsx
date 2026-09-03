import { FollowUpCenter } from "./FollowUpCenter";

export function FollowUpPage() {
  return (
    <section className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-black">
          مرکز پیگیری
        </h1>

        <p className="text-sm text-slate-500">
          Recovery requests, task issues and advisor follow-ups
        </p>
      </div>

      <FollowUpCenter />
    </section>
  );
}
