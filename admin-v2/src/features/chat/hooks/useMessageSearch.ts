import { useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "../../../shared/types/domain";
import { normalizePersianText } from "../../../shared/lib/utils";

function normalize(value: string) {
  return normalizePersianText(value).toLocaleLowerCase("fa");
}

export function useMessageSearch(items: ChatMessage[], conversationId?: string) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const matches = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return [];
    return items.filter((message) => !message.deletedAt && normalize(message.text || "").includes(needle)).map((message) => message.id);
  }, [items, query]);

  useEffect(() => { setQuery(""); setOpen(false); setIndex(0); }, [conversationId]);
  useEffect(() => { setIndex((current) => matches.length ? Math.min(current, matches.length - 1) : 0); }, [matches.length]);

  function next() { setIndex((current) => matches.length ? (current + 1) % matches.length : 0); }
  function previous() { setIndex((current) => matches.length ? (current - 1 + matches.length) % matches.length : 0); }

  return { query, setQuery, open, setOpen, index, matches, currentId: matches[index], next, previous };
}
