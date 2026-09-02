import { useCallback, useState } from "react";
import { readFavoriteConversationIds, writeFavoriteConversationIds } from "../lib/chat-ui-storage";

export function useConversationFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => readFavoriteConversationIds());

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      writeFavoriteConversationIds(next);
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}
