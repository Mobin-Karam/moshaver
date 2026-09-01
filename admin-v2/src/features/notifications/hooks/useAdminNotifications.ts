import { useContext } from "react";
import { NotificationContext } from "../components/NotificationProvider";

export function useAdminNotifications() {
  const value =
    useContext(
      NotificationContext,
    );

  if (!value) {
    throw new Error(
      "useAdminNotifications must be used inside NotificationProvider",
    );
  }

  return value;
}
