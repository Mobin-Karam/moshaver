import { Card, EmptyState } from "../../../shared/ui/ui";
import { PlannerCanvas } from "./PlannerCanvas";

export function PlannerContent(props:any){
  const {studentId}=props;
  return (
    <Card className="h-[calc(100vh-235px)] min-h-[480px] overflow-hidden p-0">
      {!studentId ? (
        <div className="grid h-full place-items-center p-6">
          <EmptyState title="دانش‌آموزی انتخاب نشده است"/>
        </div>
      ) : <PlannerCanvas {...props}/>}
    </Card>
  );
}
