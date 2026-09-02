import {
  useMemo,
} from "react";
import type { AdminNotification } from "../model/notification-model";

export function useFilteredNotifications({
  items,
  filter,
  typeFilter,
  search,
}: {
  items: AdminNotification[];
  filter: "all" | "unread";
  typeFilter: string;
  search: string;
}) {
  return useMemo(() => {
    const needle =
      search
        .trim()
        .toLocaleLowerCase(
          "fa",
        );

    return items.filter(
      (item) =>
        (filter === "all" ||
          !item.isRead) &&
        (typeFilter === "all" ||
          item.type ===
            typeFilter) &&
        (!needle ||
          `${item.title} ${
            item.body || ""
          }`
            .toLocaleLowerCase(
              "fa",
            )
            .includes(needle)),
    );
  }, [
    filter,
    items,
    search,
    typeFilter,
  ]);
}
