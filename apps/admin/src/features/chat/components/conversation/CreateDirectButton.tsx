import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { useModal } from "../../../../shared/ui/modal";
import { notifications } from "../../../../shared/ui/notifications";
import { Button, EmptyState, Field, Input } from "../../../../shared/ui/ui";
import { chatApi } from "../../api/chat.api";

export function CreateDirectButton({ onCreated }: { onCreated: (id: string) => void }) {
  const modal = useModal();
  return (
    <Button
      size="sm"
      variant="soft"
      onClick={() =>
        modal.open({
          title: "گفتگوی مستقیم تازه",
          description: "کاربر مجاز را پیدا کنید و گفتگو را باز کنید.",
          content: (
            <CreateDirectForm
              onCreated={(id) => {
                modal.close();
                onCreated(id);
              }}
            />
          ),
        })
      }
    >
      <MessageSquarePlus size={15} /> گفتگوی جدید
    </Button>
  );
}

function CreateDirectForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const users = useQuery({
    queryKey: ["chat-users", "direct", search],
    queryFn: () => chatApi.users(search),
    enabled: search.trim().length >= 2,
  });
  const create = useMutation({
    mutationFn: chatApi.createDirect,
    onSuccess: (conversation) => {
      notifications.success("گفتگو آماده شد.");
      onCreated(conversation.id);
    },
    onError: () => notifications.error("ساخت گفتگو انجام نشد."),
  });
  return (
    <div className="grid gap-3">
      <Field label="نام یا نام کاربری">
        <Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} />
      </Field>
      {users.isLoading ? (
        <p role="status" className="text-sm text-slate-500">
          در حال جستجو…
        </p>
      ) : null}
      {users.data?.length ? (
        <div className="grid max-h-64 gap-2 overflow-auto">
          {users.data.map((user) => (
            <button
              type="button"
              key={user.id}
              disabled={create.isPending}
              className="rounded-xl border p-3 text-right hover:border-brand"
              onClick={() => create.mutate(user.id)}
            >
              <strong>{user.name || user.username}</strong>
              <span className="mt-1 block text-xs text-slate-500" dir="ltr">
                @{user.username}
              </span>
            </button>
          ))}
        </div>
      ) : search.trim().length >= 2 && !users.isLoading ? (
        <EmptyState title="کاربری پیدا نشد." />
      ) : null}
    </div>
  );
}
