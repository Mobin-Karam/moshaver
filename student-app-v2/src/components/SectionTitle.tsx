export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div>
      {eyebrow ? <span className="text-xs text-ink/60">{eyebrow}</span> : null}
      <h1 className="text-2xl font-semibold">{title}</h1>
    </div>
  );
}
