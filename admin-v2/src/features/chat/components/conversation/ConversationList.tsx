import type { Conversation } from "../../../../shared/types/domain";
import { EmptyState } from "../../../../shared/ui/ui";
import { ConversationListItem } from "./ConversationListItem";

export function ConversationList({ items, activeId, favoriteIds, drafts, emptyTitle, onSelect, onToggleFavorite }: {
  items: Conversation[];
  activeId?: string;
  favoriteIds: Set<string>;
  drafts: Record<string, string>;
  emptyTitle: string;
  onSelect: (item: Conversation) => void;
  onToggleFavorite: (id: string) => void;
}) {
  if (!items.length) return <EmptyState title={emptyTitle} />;
  return items.map((item) => (
    <ConversationListItem
      key={item.id}
      item={item}
      active={activeId === item.id}
      favorite={favoriteIds.has(item.id)}
      draft={drafts[item.id] || ""}
      onSelect={onSelect}
      onToggleFavorite={onToggleFavorite}
    />
  ));
}
