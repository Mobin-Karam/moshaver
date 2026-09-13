import { ArrowRight, CheckCheck, LoaderCircle, Search, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { Conversation } from "../../../../shared/types/domain";
import type { GroupDetail } from "../../model/group.types";
import { GroupInfoButton } from "../group/GroupChatControls";
import { chatApi } from "../../api/chat.api";
import { notify } from "../../../../shared/ui/notifications";

export function ChatHeader({
  conversation,
  group,
  groupLoading,
  markingRead,
  searchOpen,
  onBack,
  onMarkRead,
  onToggleSearch,
  onGroupChanged,
  canOverrideUsername = false,
}: {
  conversation: Conversation;
  group?: GroupDetail;
  groupLoading: boolean;
  markingRead: boolean;
  searchOpen: boolean;
  onBack: () => void;
  onMarkRead: () => void;
  onToggleSearch: () => void;
  onGroupChanged: () => void;
  canOverrideUsername?: boolean;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const peerId = conversation.type !== "group" ? conversation.peer?.id : undefined;
  const profile = useQuery({ queryKey: ["chat-profile", peerId], queryFn: () => chatApi.profile(peerId!), enabled: profileOpen && !!peerId });
  const allowUsername = useMutation({ mutationFn: () => chatApi.allowUsernameChange(peerId!), onSuccess: () => notify("امکان تغییر نام کاربری فعال شد.", "success"), onError: () => notify("فعال‌سازی ناموفق بود.", "error") });
  return (
    <><div className="chat-surface flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          className="grid size-9 shrink-0 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          aria-label="بازگشت به گفتگوها"
          onClick={onBack}
        >
          <ArrowRight size={19} />
        </button>
        <button type="button" disabled={!peerId} onClick={() => setProfileOpen(true)} aria-label={peerId ? "مشاهده پروفایل گفتگو" : "تصویر گروه"} className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand/10 font-bold text-brand disabled:opacity-100">
          {conversation.peer?.avatarUrl ? <img src={conversation.peer.avatarUrl} alt="" className="size-full object-cover" /> : (conversation.type === "group"
            ? conversation.title || "گروه"
            : conversation.student?.name || conversation.peer?.name || "گفتگو"
          ).slice(0, 1)}
          {conversation.presence?.online ? (
            <i className="absolute bottom-0 left-0 size-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800" />
          ) : null}
        </button>
        <div className="min-w-0">
          <strong className="block truncate">
            {conversation.type === "group"
              ? conversation.title
              : conversation.student?.name || conversation.peer?.name || "گفتگو"}
          </strong>
          <span
            className={`text-xs ${conversation.presence?.online ? "text-emerald-600" : "text-slate-500"}`}
          >
            {conversation.type === "group"
              ? `${conversation.memberCount || group?.memberCount || 0} عضو • ${groupLoading ? "در حال دریافت نقش" : group?.myRole === "owner" ? "مالک" : group?.myRole === "admin" ? "مدیر" : "عضو"}`
              : conversation.presence?.online
                ? "آنلاین"
                : conversation.student?.grade || "آفلاین"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-pressed={searchOpen}
          title="جستجو در پیام‌ها (Ctrl/Cmd+F)"
          aria-label="جستجو در پیام‌ها"
          className={`grid size-9 place-items-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800 ${searchOpen ? "bg-brand/10 text-brand" : "text-slate-500"}`}
          onClick={onToggleSearch}
        >
          <Search size={17} />
        </button>
        {conversation.type === "group" ? (
          <GroupInfoButton conversationId={conversation.id} onChanged={onGroupChanged} />
        ) : null}
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
          onClick={onMarkRead}
          disabled={markingRead || !conversation.unread}
        >
          {markingRead ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <CheckCheck size={17} />
          )}
          <span className="hidden sm:inline">خوانده شد</span>
        </button>
      </div>
    </div>{profileOpen ? <div className="fixed inset-0 z-[90] grid place-items-end bg-slate-950/40 backdrop-blur-sm sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="پروفایل گفتگو"><article className="relative grid w-full max-w-md justify-items-center gap-2 rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:rounded-3xl"><button type="button" className="absolute left-3 top-3 grid size-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setProfileOpen(false)} aria-label="بستن پروفایل"><X size={18} /></button>{profile.isLoading ? <LoaderCircle className="animate-spin" /> : profile.data ? <><span className="grid size-20 place-items-center overflow-hidden rounded-full bg-brand/10 text-2xl font-bold text-brand">{profile.data.avatarUrl ? <img src={profile.data.avatarUrl} alt="" className="size-full object-cover" /> : profile.data.displayName.slice(0, 1)}</span><h2 className="text-lg font-bold">{profile.data.displayName}</h2><b className="text-sm text-brand" dir="ltr">@{profile.data.username}</b><p className="max-w-sm text-center text-sm leading-7 text-slate-600 dark:text-slate-300">{profile.data.bio || "اطلاعات بیشتری ثبت نشده است."}</p>{canOverrideUsername ? <button type="button" className="mt-2 rounded-xl bg-brand/10 px-4 py-2 text-xs font-semibold text-brand" disabled={allowUsername.isPending} onClick={() => allowUsername.mutate()}>اجازه تغییر نام کاربری</button> : null}</> : <p className="text-sm text-rose-600">دریافت پروفایل ناموفق بود.</p>}</article></div> : null}</>
  );
}
