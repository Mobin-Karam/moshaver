import { useState } from "react";
import { todayIso } from "../../../shared/lib/utils";

export function usePlannerState() {
  const [date, setDate] = useState(todayIso());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [drawer, setDrawer] = useState(null);

  return {
    date,
    setDate,
    search,
    setSearch,
    filter,
    setFilter,
    drawer,
    setDrawer,
  };
}
