import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Music2, PauseCircle, PlayCircle, Plus, Power } from "lucide-react";
import { useRef, useState } from "react";
import { notify } from "../../../shared/ui/notifications";
import { Button, Card, EmptyState, Field, Input } from "../../../shared/ui/ui";
import { createRelaxationTrack, getRelaxationTracks, updateRelaxationTrack, type RelaxationTrackDraft } from "../api/system.api";

const emptyDraft: RelaxationTrackDraft = { title: "", artist: "", url: "", active: true };

export function RelaxationMusicManager() {
  const qc = useQueryClient();
  const audio = useRef<HTMLAudioElement>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const tracks = useQuery({ queryKey: ["relaxation-tracks"], queryFn: getRelaxationTracks });
  const create = useMutation({ mutationFn: () => createRelaxationTrack(draft), onSuccess: () => { setDraft(emptyDraft); notify("موسیقی آرامش‌بخش اضافه شد."); void qc.invalidateQueries({ queryKey: ["relaxation-tracks"] }); }, onError: (error) => notify(error instanceof Error ? error.message : "ثبت موسیقی ناموفق بود.", "error") });
  const toggle = useMutation({ mutationFn: ({ id, body }: { id: string; body: RelaxationTrackDraft }) => updateRelaxationTrack(id, body), onSuccess: () => void qc.invalidateQueries({ queryKey: ["relaxation-tracks"] }), onError: (error) => notify(error instanceof Error ? error.message : "تغییر وضعیت ناموفق بود.", "error") });

  function preview(id: string, url: string) {
    if (!audio.current) return;
    if (playingId === id && !audio.current.paused) { audio.current.pause(); setPlayingId(null); return; }
    audio.current.src = url;
    void audio.current.play().then(() => setPlayingId(id)).catch(() => notify("پخش این پیوند در مرورگر ممکن نیست.", "error"));
  }

  return <Card className="grid gap-4 p-5" aria-labelledby="relaxation-music-title">
    <audio ref={audio} preload="none" onEnded={() => setPlayingId(null)} />
    <div><span className="flex items-center gap-2 font-black" id="relaxation-music-title"><Music2 size={19} className="text-brand"/>موسیقی آرامش‌بخش دانش‌آموز</span><p className="mt-1 text-xs leading-5 text-slate-500">فقط پیوند HTTPS ذخیره می‌شود؛ فایل روی سامانه دانلود یا نگهداری نمی‌شود.</p></div>
    <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
      <Field label="عنوان"><Input required maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></Field>
      <Field label="هنرمند یا منبع"><Input maxLength={120} value={draft.artist} onChange={(event) => setDraft({ ...draft, artist: event.target.value })}/></Field>
      <div className="md:col-span-2"><Field label="پیوند مستقیم MP3 (HTTPS)"><Input required type="url" dir="ltr" placeholder="https://example.com/music.mp3" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })}/></Field></div>
      <Button className="md:col-span-2" disabled={create.isPending || !draft.title.trim() || !draft.url.startsWith("https://")}><Plus size={16}/>{create.isPending ? "در حال ثبت…" : "افزودن به فهرست روزانه"}</Button>
    </form>
    {tracks.isError ? <EmptyState title="دریافت موسیقی‌ها ناموفق بود." action={<Button variant="soft" onClick={() => void tracks.refetch()}>تلاش دوباره</Button>}/> : null}
    <div className="grid gap-2">{tracks.data?.map((track) => <div key={track.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><button type="button" className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand" onClick={() => preview(track.id, track.url)} aria-label={playingId === track.id ? `مکث ${track.title}` : `پخش آزمایشی ${track.title}`}>{playingId === track.id ? <PauseCircle/> : <PlayCircle/>}</button><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{track.title}</strong><span className="block truncate text-xs text-slate-500">{track.artist || "بدون نام هنرمند"}</span></div><Button variant="soft" onClick={() => toggle.mutate({ id: track.id, body: { title: track.title, artist: track.artist, url: track.url, active: !track.active } })}><Power size={15}/>{track.active ? "فعال" : "غیرفعال"}</Button></div>)}</div>
  </Card>;
}
