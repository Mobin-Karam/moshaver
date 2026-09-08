import { useState } from "react";
import type { Plan, PlanTask } from "../../../shared/types/domain";

export function usePlannerUI() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [warningsOpen, setWarningsOpen] = useState(true);
  const [drawer, setDrawer] = useState<{ plan: Plan; task?: PlanTask } | null>(null);

  return {
    filtersOpen,
    setFiltersOpen,
    moreOpen,
    setMoreOpen,
    paletteOpen,
    setPaletteOpen,
    summaryOpen,
    setSummaryOpen,
    warningsOpen,
    setWarningsOpen,
    drawer,
    setDrawer,
    closeOverlays() {
      setFiltersOpen(false);
      setMoreOpen(false);
      setPaletteOpen(false);
    },
  };
}
