import {
  Bell,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Cloud,
  Headphones,
  LogOut,
  MessageCircle,
  Moon,
  MoonStar,
  NotebookTabs,
  LibraryBig,
  ListChecks,
  Palette,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  TrendingUp,
  UserRoundPlus,
  UsersRound,
  Wifi,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useRelaxationPlayer } from "../../services/relaxation-player";
import { useStudentStore } from "../../services/student-store";
import { apiClient } from "../../services/api-client";
import {
  NightReportForm,
  RecoveryRequestForm,
  RelaxationLibrary,
} from "./MorePage";
import { ReportsHistory } from "./ReportsHistory";
import { GuardianInsightsPage } from "./GuardianInsightsPage";
import { PasswordChangeForm } from "./PasswordChangeForm";
import { PushSettings } from "./PushSettings";
import { StudentInsightsPage } from "./StudentInsightsPage";
import { MistakeNotebook } from "./MistakeNotebook";

export type StudentTheme = "light" | "dark" | "system";

export function MoreRouterPage({
  theme,
  onThemeChange,
}: {
  theme: StudentTheme;
  onThemeChange(theme: StudentTheme): void;
}) {
  const { section } = useParams();
  if (!section) return <MoreHub />;
  if (section === "audio")
    return (
      <MoreSection title="فهرست صوتی" subtitle="پخش، صف و آرامش امروز">
        <RelaxationLibrary />
      </MoreSection>
    );
  if (section === "reports") return <ReportsPage />;
  if (section === "insights") return <MoreSection title="روند و پیشنهادها" subtitle="تحلیل عملکرد و تصمیم درباره پیشنهادهای مشاور"><StudentInsightsPage /></MoreSection>;
  if (section === "mistakes") return <MoreSection title="دفترچه اشتباهات" subtitle="دلیل خطاها و وضعیت مرور"><MistakeNotebook /></MoreSection>;
  if (section === "profile") return <ProfilePage />;
  if (section === "chat-profile") return <ChatProfilePage />;
  if (section === "guardian") return <GuardianSelectionPage />;
  if (section === "family") return <MoreSection title="همراهی خانواده" subtitle="پیشرفت، گزارش‌ها و دلگرمی"><GuardianInsightsPage /></MoreSection>;
  if (section === "settings")
    return <SettingsPage theme={theme} onThemeChange={onThemeChange} />;
  return <Navigate to="/more" replace />;
}

function MoreHub() {
  const access = useStudentStore((state) => state.access);
  const student = useStudentStore((state) => state.student);
  const user = useStudentStore((state) => state.user);
  return (
    <section className="more-hub">
      <header className="more-hub__identity">
        <span>
          <CircleUserRound />
        </span>
        <div>
          <small>فضای شخصی</small>
          <h1>{student?.name || user?.username || "دانش‌آموز"}</h1>
          <p>
            {[student?.grade, student?.major].filter(Boolean).join(" · ") ||
              "مدیریت حساب و ابزارهای شما"}
          </p>
        </div>
      </header>
      {access?.canUseChat ? (
        <section className="more-chat-featured" aria-label="ارتباط با مشاور">
          <MoreRow
            to="/chat"
            icon={<MessageCircle />}
            title="گفت‌وگو با مشاور"
            subtitle="پیام‌ها، پاسخ‌های برنامه و گفتگوهای شما"
          />
        </section>
      ) : null}
      <MoreGroup title="یادگیری">
        {access?.mode === "guardian" ? <MoreRow to="/more/family" icon={<UsersRound />} title="همراهی خانواده" subtitle="پیشرفت، گزارش‌ها و ارسال دلگرمی" tone="amber" /> : null}
        {access?.mode === "student" ? (
          <MoreRow
            to="/more/insights"
            icon={<TrendingUp />}
            title="روند و پیشنهادها"
            subtitle="تحلیل عملکرد و پیشنهادهای مشاور"
            tone="blue"
          />
        ) : null}
        {access?.mode === "student" ? (
          <MoreRow
            to="/more/audio"
            icon={<Headphones />}
            title="صوت‌ها و آرامش"
            subtitle="پیشنهاد امروز، صف و نشانک‌ها"
            tone="purple"
          />
        ) : null}
        {access?.canReadLearning ? <MoreRow
          to="/learning"
          icon={<BookOpenCheck />}
          title="پیشرفت و مرور"
          subtitle="گزارش یادگیری و مرورهای ثبت‌شده"
        /> : null}
        {access?.canReadResources ? <MoreRow
          to="/resources"
          icon={<LibraryBig />}
          title="منابع آموزشی"
          subtitle="ویدئوها و پیوندهای منتشرشده برای شما"
          tone="blue"
        /> : null}
        {access?.canUseQuizzes ? <MoreRow
          to="/quizzes"
          icon={<ListChecks />}
          title="آزمونک‌ها"
          subtitle="تمرین کوتاه، نتیجه فوری و مرور پاسخ‌ها"
          tone="purple"
        /> : null}
        {access?.mode === "student" ? <MoreRow to="/more/mistakes" icon={<NotebookTabs />} title="دفترچه اشتباهات" subtitle="دسته‌بندی خطاها و ثبت مرور" tone="amber" /> : null}
        {access?.mode === "student" ? (
          <MoreRow
            to="/more/reports"
            icon={<MoonStar />}
            title="گزارش و جبران"
            subtitle="گزارش شبانه و درخواست جبران"
            tone="amber"
          />
        ) : null}
      </MoreGroup>
      <MoreGroup title="حساب و برنامه">
        <MoreRow
          to="/notifications"
          icon={<Bell />}
          title="اعلان‌ها"
          subtitle="پیام‌ها و یادآوری‌های سامانه"
          tone="blue"
        />
        <MoreRow
          to="/more/profile"
          icon={<CircleUserRound />}
          title="پروفایل آموزشی"
          subtitle="مشخصات و ارتباط‌های پرونده"
        />
        {access?.mode === "student" ? (
          <MoreRow
            to="/more/guardian"
            icon={<UserRoundPlus />}
            title="انتخاب سرپرست"
            subtitle="مشاهده، درخواست و مدیریت سرپرست حساب"
            tone="amber"
          />
        ) : null}
        {access?.canUseChat ? <MoreRow
          to="/more/chat-profile"
          icon={<MessageCircle />}
          title="پروفایل گفتگو"
          subtitle="نام نمایشی، شناسه و درباره من"
          tone="blue"
        /> : null}
        <MoreRow
          to="/more/settings"
          icon={<Settings />}
          title="تنظیمات"
          subtitle="ظاهر، اعلان، داده و امنیت"
          tone="neutral"
        />
      </MoreGroup>
    </section>
  );
}

function MoreSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="more-subpage">
      <header className="more-subpage__header">
        <Link to="/more" aria-label="بازگشت به بیشتر">
          <ChevronRight />
        </Link>
        <span>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </span>
      </header>
      {children}
    </section>
  );
}

function ReportsPage() {
  const [historyRevision, setHistoryRevision] = useState(0);
  const draft = useStudentStore((state) => state.nightReportDraft);
  const recovery = useStudentStore((state) => state.recoveryRequestDraft);
  const saveDraft = useStudentStore((state) => state.saveNightReportDraft);
  const saveRecovery = useStudentStore(
    (state) => state.saveRecoveryRequestDraft,
  );
  const submit = useStudentStore((state) => state.submitNightReport);
  const submitRecovery = useStudentStore(
    (state) => state.submitRecoveryRequest,
  );
  return (
    <MoreSection
      title="گزارش و جبران"
      subtitle="ثبت وضعیت امروز و اصلاح برنامه"
    >
      <div className="more-settings-group">
        <header>
          <MoonStar />
          <span>
            <strong>گزارش شبانه</strong>
            <small>خواب، مطالعه و حال‌وهوای امروز</small>
          </span>
        </header>
        <NightReportForm draft={draft} onSave={saveDraft} onSubmit={async (value) => { await submit(value); setHistoryRevision((current) => current + 1); }} />
      </div>
      <div className="more-settings-group">
        <header>
          <RotateCcw />
          <span>
            <strong>درخواست جبران</strong>
            <small>درخواست بازبرنامه‌ریزی برای روز ازدست‌رفته</small>
          </span>
        </header>
        <RecoveryRequestForm
          draft={recovery}
          onSave={saveRecovery}
          onSubmit={async (value) => { await submitRecovery(value); setHistoryRevision((current) => current + 1); }}
        />
      </div>
      <ReportsHistory revision={historyRevision} />
    </MoreSection>
  );
}

function ProfilePage() {
  const student = useStudentStore((state) => state.student);
  const subjects = useStudentStore((state) => state.subjects);
  const relationships = useStudentStore((state) => state.relationships);
  const mistakes = useStudentStore((state) => state.mistakes);
  const load = useStudentStore((state) => state.loadProfileDomains);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <MoreSection title="پروفایل آموزشی" subtitle="اطلاعات پرونده و ارتباط‌ها">
      <div className="more-profile-card">
        <CircleUserRound />
        <h2>{student?.name || "دانش‌آموز"}</h2>
        <p>
          {[student?.grade, student?.major].filter(Boolean).join(" · ") ||
            "مشخصات آموزشی"}
        </p>
      </div>
      <MoreGroup title="پرونده">
        <InfoRow
          title="درس‌های فعال"
          value={
            subjects
              .filter((item) => item.enabled)
              .map((item) => item.displayName || item.subject.name)
              .join("، ") || "درسی ثبت نشده است."
          }
        />
        <InfoRow
          title="ارتباط‌های فعال"
          value={
            relationships
              .filter((item) => item.status === "ACTIVE")
              .map(
                (item) =>
                  [item.fromUser?.firstName, item.fromUser?.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  item.fromUser?.username ||
                  "کاربر",
              )
              .join("، ") || "ارتباط فعالی ثبت نشده است."
          }
        />
        <InfoRow
          title="دفترچه اشتباهات"
          value={
            mistakes.length
              ? `${mistakes.length.toLocaleString("fa-IR")} مورد نیازمند مرور`
              : "موردی ثبت نشده است."
          }
        />
      </MoreGroup>
    </MoreSection>
  );
}

type ChatProfile = { id: string; username: string; displayName: string; bio: string; avatarUrl: string; usernameChange?: { count: number; allowed: boolean; nextAllowedAt?: string | null } };
function ChatProfilePage() {
  const [profile, setProfile] = useState<ChatProfile | null>(null);
  const [draft, setDraft] = useState({ displayName: "", username: "", bio: "", avatarUrl: "" });
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  useEffect(() => { void apiClient.request<ChatProfile>("GET", "/chat/profile").then((value) => { setProfile(value); setDraft({ displayName: value.displayName, username: value.username, bio: value.bio, avatarUrl: value.avatarUrl }); setStatus("ready"); }).catch(() => setStatus("error")); }, []);
  async function save() {
    setStatus("saving");
    try { const value = await apiClient.request<ChatProfile, typeof draft>("PATCH", "/chat/profile", draft); setProfile(value); setDraft({ displayName: value.displayName, username: value.username, bio: value.bio, avatarUrl: value.avatarUrl }); setStatus("ready"); }
    catch { setStatus("error"); }
  }
  return <MoreSection title="پروفایل گفتگو" subtitle="هویت شما در پیام‌ها و گروه‌ها">
    {status === "loading" ? <p className="settings-empty">در حال دریافت پروفایل...</p> : null}
    {profile ? <form className="chat-profile-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <div className="chat-profile-form__avatar">{draft.avatarUrl ? <img src={draft.avatarUrl} alt="تصویر پروفایل" /> : (draft.displayName || draft.username || "ک").slice(0, 1)}</div>
      <label>نام نمایشی<input value={draft.displayName} maxLength={100} onChange={(event) => setDraft((value) => ({ ...value, displayName: event.target.value }))} /></label>
      <label>نام کاربری<span className="chat-profile-form__username"><b>@</b><input aria-label="نام کاربری" dir="ltr" value={draft.username} maxLength={32} onChange={(event) => setDraft((value) => ({ ...value, username: event.target.value.toLowerCase() }))} /></span><small>{profile.usernameChange?.allowed ? "امکان تغییر نام کاربری فعال است." : profile.usernameChange?.nextAllowedAt ? `تغییر بعدی از ${new Intl.DateTimeFormat("fa-IR").format(new Date(profile.usernameChange.nextAllowedAt))}` : "نام کاربری یکتا است."}</small></label>
      <label>درباره من<textarea rows={3} value={draft.bio} maxLength={500} onChange={(event) => setDraft((value) => ({ ...value, bio: event.target.value }))} /></label>
      <label>نشانی تصویر پروفایل<input dir="ltr" inputMode="url" placeholder="https://..." value={draft.avatarUrl} maxLength={1200} onChange={(event) => setDraft((value) => ({ ...value, avatarUrl: event.target.value }))} /></label>
      {status === "error" ? <p role="alert">دریافت یا ذخیره پروفایل ناموفق بود. دوباره تلاش کنید.</p> : null}
      <button type="submit" disabled={status === "saving"}>{status === "saving" ? "در حال ذخیره" : "ذخیره پروفایل"}</button>
    </form> : status === "error" ? <button className="settings-logout" onClick={() => location.reload()}>تلاش دوباره</button> : null}
  </MoreSection>;
}

type GuardianRelationship = {
  id: string;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED";
  fromUser: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  organizationId?: string | null;
};
type GuardianCandidate = {
  id: string;
  username: string;
  name: string;
  organization: { id: string; name: string } | null;
};
type GuardianSelection = {
  relationships: GuardianRelationship[];
  change: { allowed: boolean; nextAllowedAt?: string | null };
};

function GuardianSelectionPage() {
  const [selection, setSelection] = useState<GuardianSelection | null>(null);
  const [candidates, setCandidates] = useState<GuardianCandidate[]>([]);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadSelection() {
    const value = await apiClient.request<GuardianSelection>(
      "GET",
      "/student/guardian-selection",
    );
    setSelection(value);
  }

  useEffect(() => {
    void loadSelection().catch(() =>
      setError("دریافت وضعیت سرپرست انجام نشد. دوباره تلاش کنید."),
    );
  }, []);

  useEffect(() => {
    if (selection && !selection.change.allowed) {
      setCandidates([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void apiClient
        .request<GuardianCandidate[]>(
          "GET",
          `/student/guardian-candidates?search=${encodeURIComponent(search.trim())}`,
        )
        .then(setCandidates)
        .catch(() => setError("جست‌وجوی سرپرست‌ها انجام نشد."));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, selection?.change.allowed]);

  async function request(candidate: GuardianCandidate) {
    setBusyId(candidate.id);
    setError("");
    try {
      await apiClient.request("POST", "/student/guardian-selection", {
        guardianUserId: candidate.id,
      });
      await loadSelection();
    } catch {
      setError("ثبت درخواست ناموفق بود یا محدودیت تغییر سرپرست فعال است.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(id: string) {
    setBusyId(id);
    setError("");
    try {
      await apiClient.request("DELETE", `/student/guardian-selection/${id}`);
      await loadSelection();
    } catch {
      setError("لغو درخواست انجام نشد. دوباره تلاش کنید.");
    } finally {
      setBusyId(null);
    }
  }

  const current = selection?.relationships.filter(
    (item) => item.status === "ACTIVE" || item.status === "PENDING",
  );
  return (
    <MoreSection title="انتخاب سرپرست" subtitle="مدیریت امن ارتباط خانوادگی">
      <section className="guardian-selection-card">
        <header>
          <UserRoundPlus />
          <span>
            <strong>سرپرست‌های حساب</strong>
            <small>درخواست پس از تأیید سرپرست فعال می‌شود.</small>
          </span>
        </header>
        {!selection ? (
          <p className="settings-empty">در حال دریافت وضعیت...</p>
        ) : current?.length ? (
          <div className="guardian-current-list">
            {current.map((item) => {
              const name =
                [item.fromUser.firstName, item.fromUser.lastName]
                  .filter(Boolean)
                  .join(" ") || item.fromUser.username;
              return (
                <article key={item.id}>
                  <span>{name.slice(0, 1)}</span>
                  <div>
                    <strong>{name}</strong>
                    <small dir="ltr">@{item.fromUser.username}</small>
                  </div>
                  <b className={`is-${item.status.toLowerCase()}`}>
                    {item.status === "ACTIVE" ? "تأییدشده" : "در انتظار"}
                  </b>
                  {item.status === "PENDING" ? (
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => void cancel(item.id)}
                    >
                      لغو
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="settings-empty">هنوز سرپرستی انتخاب نشده است.</p>
        )}
      </section>

      {selection && !selection.change.allowed ? (
        <p className="guardian-cooldown" role="status">
          برای امنیت حساب، تغییر بعدی از {selection.change.nextAllowedAt
            ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(
                new Date(selection.change.nextAllowedAt),
              )
            : "پایان دوره محدودیت"} امکان‌پذیر است.
        </p>
      ) : (
        <section className="guardian-picker-card">
          <label>
            <Search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجوی نام یا نام کاربری سرپرست"
              aria-label="جست‌وجوی سرپرست"
            />
          </label>
          <div className="guardian-candidate-list">
            {candidates.map((candidate) => (
              <article key={candidate.id}>
                <span>{candidate.name.slice(0, 1)}</span>
                <div>
                  <strong>{candidate.name}</strong>
                  <small>
                    @{candidate.username}
                    {candidate.organization
                      ? ` · ${candidate.organization.name}`
                      : ""}
                  </small>
                </div>
                <button
                  type="button"
                  disabled={
                    busyId === candidate.id ||
                    current?.some(
                      (item) => item.fromUser.id === candidate.id,
                    )
                  }
                  onClick={() => void request(candidate)}
                >
                  {busyId === candidate.id ? "در حال ثبت" : "انتخاب"}
                </button>
              </article>
            ))}
            {selection && !candidates.length ? (
              <p className="settings-empty">
                سرپرست فعالی در سازمان شما پیدا نشد.
              </p>
            ) : null}
          </div>
        </section>
      )}
      {error ? <p className="guardian-selection-error" role="alert">{error}</p> : null}
    </MoreSection>
  );
}

function SettingsPage({
  theme,
  onThemeChange,
}: {
  theme: StudentTheme;
  onThemeChange(theme: StudentTheme): void;
}) {
  const syncStatus = useStudentStore((state) => state.syncStatus);
  const access = useStudentStore((state) => state.access);
  const sessions = useStudentStore((state) => state.authSessions);
  const loadSessions = useStudentStore((state) => state.loadAuthSessions);
  const revoke = useStudentStore((state) => state.revokeAuthSession);
  const logout = useStudentStore((state) => state.logout);
  const preferences = useRelaxationPlayer((state) => state.preferences);
  const setPreference = useRelaxationPlayer((state) => state.setPreference);
  const [guardianReadOnly, setGuardianReadOnly] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  useEffect(() => {
    void loadSessions();
    if (access?.mode === "student") {
      void apiClient.request<{ guardianReadOnly: boolean }>("GET", "/student/chat-privacy")
        .then((value) => setGuardianReadOnly(value.guardianReadOnly))
        .catch(() => undefined);
    }
  }, [access?.mode, loadSessions]);
  async function updateGuardianPrivacy(value: boolean) {
    const previous = guardianReadOnly;
    setGuardianReadOnly(value); setPrivacySaving(true);
    try {
      const saved = await apiClient.request<{ guardianReadOnly: boolean }, { guardianReadOnly: boolean }>("PATCH", "/student/chat-privacy", { guardianReadOnly: value });
      setGuardianReadOnly(saved.guardianReadOnly);
    } catch { setGuardianReadOnly(previous); }
    finally { setPrivacySaving(false); }
  }
  return (
    <MoreSection title="تنظیمات" subtitle="ظاهر و رفتار برنامه">
      <div className="more-settings-group">
        <header>
          <Palette />
          <span>
            <strong>ظاهر</strong>
            <small>انتخاب حالت روشن یا تاریک</small>
          </span>
        </header>
        <div className="theme-options" role="group" aria-label="پوسته برنامه">
          <button
            className={theme === "light" ? "is-active" : ""}
            onClick={() => onThemeChange("light")}
          >
            <Sun />
            روشن
          </button>
          <button
            className={theme === "dark" ? "is-active" : ""}
            onClick={() => onThemeChange("dark")}
          >
            <Moon />
            تاریک
          </button>
          <button
            className={theme === "system" ? "is-active" : ""}
            onClick={() => onThemeChange("system")}
          >
            <Smartphone />
            دستگاه
          </button>
        </div>
      </div>
      <SettingsGroup
        title="اعلان‌ها"
        subtitle="مجوز اعلان روی این دستگاه"
        icon={<Bell />}
      >
        <PushSettings />
      </SettingsGroup>
      {access?.mode === "student" ? <SettingsGroup
        title="حریم خصوصی گفتگو"
        subtitle="کنترل مشاهده گفتگو توسط سرپرست"
        icon={<MessageCircle />}
      >
        <SettingToggle
          label={privacySaving ? "در حال ذخیره دسترسی سرپرست" : "نمایش فقط‌خواندنی گفتگوها به سرپرست"}
          checked={guardianReadOnly}
          onChange={(value) => void updateGuardianPrivacy(value)}
        />
        <p className="settings-empty">سرپرست فقط در صورت فعال‌سازی شما و وجود ارتباط تأییدشده می‌تواند گفتگوها را ببیند؛ امکان ارسال، ویرایش، حذف یا واکنش ندارد.</p>
      </SettingsGroup> : null}
      <SettingsGroup
        title="داده و پخش صوت"
        subtitle="کنترل مصرف اینترنت"
        icon={<Wifi />}
      >
        <SettingToggle
          label="فقط هنگام پخش، صوت را دریافت کن"
          checked={preferences.streamOnlyWhilePlaying}
          onChange={(value) => setPreference("streamOnlyWhilePlaying", value)}
        />
        <SettingToggle
          label="دانلود فقط با وای‌فای"
          checked={preferences.wifiDownloadsOnly}
          onChange={(value) => setPreference("wifiDownloadsOnly", value)}
        />
        <SettingToggle
          label="پیش‌بارگذاری صوت بعدی"
          checked={preferences.preloadNext}
          onChange={(value) => setPreference("preloadNext", value)}
        />
      </SettingsGroup>
      <SettingsGroup
        title="همگام‌سازی"
        subtitle="ذخیره امن تغییرات"
        icon={<Cloud />}
      >
        <SettingAction label="وضعیت فعلی" value={syncLabel(syncStatus)} />
      </SettingsGroup>
      <SettingsGroup
        title="امنیت و نشست‌ها"
        subtitle="دستگاه‌های متصل به حساب"
        icon={<ShieldCheck />}
      >
        {sessions.length ? (
          sessions.map((session) => (
            <SettingAction
              key={session.id}
              label={session.current ? "نشست فعلی" : "نشست دیگر"}
              value={new Intl.DateTimeFormat("fa-IR").format(
                new Date(session.createdAt),
              )}
              action={
                <button onClick={() => void revoke(session.id)}>
                  {session.current ? "خروج" : "لغو"}
                </button>
              }
            />
          ))
        ) : (
          <p className="settings-empty">نشستی برای نمایش وجود ندارد.</p>
        )}
        <PasswordChangeForm />
      </SettingsGroup>
      <button className="settings-logout" onClick={() => void logout()}>
        <LogOut />
        خروج از حساب
      </button>
    </MoreSection>
  );
}

function MoreGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="more-row-group">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}
function MoreRow({
  to,
  icon,
  title,
  subtitle,
  tone = "green",
}: {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  tone?: string;
}) {
  return (
    <Link to={to} className="more-nav-row">
      <span className={`is-${tone}`}>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
      <ChevronLeft />
    </Link>
  );
}
function InfoRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="more-info-row">
      <strong>{title}</strong>
      <p>{value}</p>
    </div>
  );
}
function SettingsGroup({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="more-settings-group">
      <header>
        {icon}
        <span>
          <strong>{title}</strong>
          <small>{subtitle}</small>
        </span>
      </header>
      {children}
    </section>
  );
}
function SettingAction({
  label,
  value,
  action,
  icon,
}: {
  label: string;
  value: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="setting-row">
      {icon}
      <span>
        <strong>{label}</strong>
        <small>{value}</small>
      </span>
      {action}
    </div>
  );
}
function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange(value: boolean): void;
}) {
  return (
    <label className="setting-row">
      <span>
        <strong>{label}</strong>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}
function syncLabel(status: string) {
  return status === "offline"
    ? "آفلاین"
    : status === "syncing"
      ? "در حال همگام‌سازی"
      : status === "failed"
        ? "نیازمند تلاش دوباره"
        : "همگام و به‌روز";
}
