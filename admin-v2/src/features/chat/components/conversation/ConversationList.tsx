import type { Conversation } from "../../../../shared/types/domain";
import { EmptyState } from "../../../../shared/ui/ui";
import { ConversationListItem } from "./ConversationListItem";

export function ConversationList({ items, activeId, emptyTitle, onSelect }: {
  items: Conversation[];
  activeId?: string;
  emptyTitle: string;
  onSelect: (item: Conversation) => void;
}) {
  if (!items.length) return <EmptyState title={emptyTitle} />;
  return items.map((item) => (
    <ConversationListItem
      key={item.id}
      item={item}
      active={activeId === item.id}
      onSelect={onSelect}
    />
  ));
}
