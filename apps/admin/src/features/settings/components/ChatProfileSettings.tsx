import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, RefreshCw } from "lucide-react";
import { chatApi } from "../../chat/api/chat.api";
import { notify } from "../../../shared/ui/notifications";
import { Button, Card, ErrorState, Field, Input, Textarea } from "../../../shared/ui/ui";

export function ChatProfileSettings() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["chat-profile", "me"], queryFn: chatApi.myProfile });
  const [draft, setDraft] = useState({ displayName: "", bio: "", avatarUrl: "" });
  useEffect(() => {
    if (profile.data)
      setDraft({
        displayName: profile.data.displayName ?? "",
        bio: profile.data.bio ?? "",
        avatarUrl: profile.data.avatarUrl ?? "",
      });
  }, [profile.data]);
  const save = useMutation({
    mutationFn: () => chatApi.updateMyProfile(draft),
    onSuccess: async () => {
      notify("پروفایل گفتگو ذخیره شد.", "success");
      await queryClient.invalidateQueries({ queryKey: ["chat-profile"] });
    },
    onError: () => notify("ذخیره پروفایل گفتگو انجام نشد.", "error"),
  });
  if (profile.isError)
    return (
      <ErrorState
        title="پروفایل گفتگو دریافت نشد."
        action={
          <Button variant="soft" onClick={() => void profile.refetch()}>
            <RefreshCw size={16} /> تلاش دوباره
          </Button>
        }
      />
    );
  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-black">
        <MessageCircle size={18} /> پروفایل گفتگو
      </h2>
      {profile.isLoading ? (
        <p role="status" className="mt-4 text-sm text-slate-500">
          در حال دریافت پروفایل…
        </p>
      ) : (
        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <Field label="نام نمایشی">
            <Input
              maxLength={80}
              value={draft.displayName}
              onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
            />
          </Field>
          <Field label="معرفی کوتاه">
            <Textarea
              maxLength={500}
              value={draft.bio}
              onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
            />
          </Field>
          <Field label="نشانی تصویر (HTTPS)">
            <Input
              dir="ltr"
              type="url"
              value={draft.avatarUrl}
              onChange={(event) => setDraft({ ...draft, avatarUrl: event.target.value })}
            />
          </Field>
          <Button className="w-fit" loading={save.isPending}>
            ذخیره پروفایل
          </Button>
        </form>
      )}
    </Card>
  );
}
