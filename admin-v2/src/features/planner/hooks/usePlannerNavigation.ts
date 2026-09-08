import { useCallback, useState } from "react";
import { todayIso } from "../../../shared/lib/utils";
import type { PlannerMode } from "../model/planner.types";

export function usePlannerNavigation(initial: PlannerMode = "week") {
  const [date, setDate] = useState(todayIso());
  const [mode, setMode] = useState<PlannerMode>(initial);

  const next = useCallback(() => setDate((d) => d), []);
  const previous = useCallback(() => setDate((d) => d), []);

  return {
    date,
    setDate,
    mode,
    setMode,
    next,
    previous,
  };
}
