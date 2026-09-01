import { MessageCircle, RefreshCw } from "lucide-react";
import type { Conversation } from "../../../../shared/types/domain";
import { Badge, Button, Card, EmptyState } from "../../../../shared/ui/ui";
import { CreateGroupButton } from "../group/GroupChatControls";
import type { ConversationFilter } from "../../model/chat.types";
import { toFa } from "../../lib/chat-formatters";
import { ConversationList } from "./ConversationList";
import { ConversationSearch } from "./ConversationSearch";
import { ConversationSkeleton } from "./ConversationSkeleton";

export function ConversationSidebar({ visible, items, activeId, search, filter, total, unread, loading, error, fetching, hasMore, fetchingMore, onSearch, onFilter, onSelect, onRetry, onMore, onGroupCreated }: {
  visible: boolean; items: Conversation[]; activeId?: string; search: string;
  filter: ConversationFilter; total: number; unread: number; loading: boolean;
  error: boolean; fetching: boolean; hasMore: boolean; fetchingMore: boolean;
  onSearch: (value: string) => void; onFilter: (value: ConversationFilter) => void;
  onSelect: (item: Conversation) => void; onRetry: () => void; onMore: () => void;
  onGroupCreated: (id: string) => void;
}) {
  return <Card className={`${visible ? "flex" : "hidden lg:flex"} min-h-0 flex-col overflow-hidden p-0`}>
    <div className="border-b p-3">
      <div className="flex flex-wrap items-center gap-2"><MessageCircle size={18} /><strong>گفتگوها</strong><Badge tone="blue">{total}</Badge>{unread ? <Badge tone="red">{toFa(unread)} خوانده‌نشده</Badge> : null}<span className="mr-auto"><CreateGroupButton onCreated={onGroupCreated} /></span>{fetching && !fetchingMore ? <RefreshCw className="animate-spin text-slate-400" size={15} /> : null}</div>
      <ConversationSearch search={search} filter={filter} onSearch={onSearch} onFilter={onFilter} />
    </div>
    <div className="min-h-0 flex-1 overflow-auto">
      {loading ? <ConversationSkeleton /> : error ? <EmptyState title="دریافت گفتگوها ناموفق بود." action={<Button variant="soft" onClick={onRetry}>تلاش دوباره</Button>} /> : <ConversationList items={items} activeId={activeId} emptyTitle={search || filter !== "all" ? "گفتگویی مطابق جستجو و فیلتر نیست." : "گفتگویی وجود ندارد."} onSelect={onSelect} />}
      {hasMore ? <div className="p-3"><Button className="w-full" variant="soft" loading={fetchingMore} onClick={onMore}>گفتگوهای بیشتر</Button></div> : null}
    </div>
  </Card>;
}
