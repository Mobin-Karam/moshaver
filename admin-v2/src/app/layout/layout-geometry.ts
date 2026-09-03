export function adminContentOffsetClass({
  showContextRail,
  mainCollapsed,
  contextCollapsed,
}: {
  showContextRail: boolean;
  mainCollapsed: boolean;
  contextCollapsed: boolean;
}) {
  if (!showContextRail) return mainCollapsed ? "lg:mr-[4.5rem]" : "lg:mr-64";

  // Between lg and xl the contextual rail is intentionally forced into its
  // compact 4rem form so the two fixed rails do not consume almost half of a
  // 1024–1279px viewport. At xl the user's persisted collapse preference wins.
  if (mainCollapsed) {
    return contextCollapsed
      ? "lg:mr-[8.5rem]"
      : "lg:mr-[8.5rem] xl:mr-[17.5rem]";
  }

  return contextCollapsed
    ? "lg:mr-80"
    : "lg:mr-80 xl:mr-[29rem]";
}
