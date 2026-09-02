import { Card } from "../../../shared/ui/ui";
export function SystemMetric({ label, value }: { label: string; value: string }) { return <Card className="p-3"><span className="text-xs text-slate-500">{label}</span><strong className="mt-2 block text-lg">{value}</strong></Card>; }
