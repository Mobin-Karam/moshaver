import {
  Card,
} from "../../../shared/ui/ui";

export function LiveSkeleton() {
  return (
    <section
      className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3"
      aria-label="در حال دریافت وضعیت زنده"
    >
      {[1, 2, 3, 4, 5, 6].map(
        (item) => (
          <Card
            key={item}
            className="h-72 animate-pulse bg-slate-100"
          />
        ),
      )}
    </section>
  );
}
