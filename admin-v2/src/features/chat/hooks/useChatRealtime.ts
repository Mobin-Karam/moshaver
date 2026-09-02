import { useEffect } from "react";
import { api } from "../../../shared/api/api";

export function useChatRealtime(
  onEvent: (type: string, data: Record<string, unknown>) => void,
) {
  useEffect(() => {
    const source = api.openEvents((type, data) => {
      if (type.startsWith("chat.")) onEvent(type, data);
    });
    return () => source.close();
  }, [onEvent]);
}
