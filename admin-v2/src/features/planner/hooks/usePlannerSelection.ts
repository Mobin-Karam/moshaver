import { useMemo, useState } from "react";

export function usePlannerSelection() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id:string) => {
    setSelected((current)=>
      current.includes(id)
        ? current.filter((item)=>item!==id)
        : [...current,id]
    );
  };

  const clear = ()=>setSelected([]);

  const selectedCount = useMemo(
    ()=>selected.length,
    [selected],
  );

  return {
    selected,
    selectedCount,
    toggle,
    clear,
    setSelected,
  };
}
