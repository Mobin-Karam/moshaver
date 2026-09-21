import {
  ArrowRight,
  BarChart3,
  Bell,
  BookmarkPlus,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Database,
  Heart,
  Headphones,
  KeyRound,
  ListMusic,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Monitor,
  MoonStar,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useStudentStore } from "../../services/student-store";
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from "../../services/notification-service";
import { useRelaxationPlayer } from "../../services/relaxation-player";

export function MorePage() {
  const location = useLocation();
  const { section } = useParams<{ section?: string }>();
  const student = useStudentStore((state) => state.student);
  const access = useStudentStore((state) => state.access);
  const user = useStudentStore((state) => state.user);
  const syncStatus = useStudentStore((state) => state.syncStatus);
  const logout = useStudentStore((state) => state.logout);
  const notifications = useStudentStore((state) => state.notifications);
  const subjects = useStudentStore((state) => state.subjects);
  const relationships = useStudentStore((state) => state.relationships);
  const mistakes = useStudentStore((state) => state.mistakes);
  const loadProfileDomains = useStudentStore(
    (state) => state.loadProfileDomains,
  );
  const loadNotifications = useStudentStore((state) => state.loadNotifications);
  const markNotificationRead = useStudentStore(
    (state) => state.markNotificationRead,
  );
  const markAllNotificationsRead = useStudentStore(
    (state) => state.markAllNotificationsRead,
  );
  const authSessions = useStudentStore((state) => state.authSessions);
  const loadAuthSessions = useStudentStore((state) => state.loadAuthSessions);
  const revokeAuthSession = useStudentStore((state) => state.revokeAuthSession);
  const error = useStudentStore((state) => state.error);
  const nightReportDraft = useStudentStore((state) => state.nightReportDraft);
  const recoveryRequestDraft = useStudentStore(
    (state) => state.recoveryRequestDraft,
  );
  const saveNightReportDraft = useStudentStore(
    (state) => state.saveNightReportDraft,
  );
  const saveRecoveryRequestDraft = useStudentStore(
    (state) => state.saveRecoveryRequestDraft,
  );
  const submitNightReport = useStudentStore((state) => state.submitNightReport);
  const submitRecoveryRequest = useStudentStore(
    (state) => state.submitRecoveryRequest,
  );
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    void loadNotifications();
    void loadAuthSessions();
    if (access?.mode === "student") void loadProfileDomains();
  }, [access?.mode, loadAuthSessions, loadNotifications, loadProfileDomains]);

  useEffect(() => {
    void getNotificationPermission().then(setNotificationPermission);
  }, []);
  useEffect(() => {
    if (location.hash)
      requestAnimationFrame(() =>
        document
          .querySelector(location.hash)
          ?.scrollIntoView({ block: "center" }),
      );
  }, [location.hash]);

  const studentOnly = access?.mode === "student";
  const details: Record<
    string,
    { title: string; eyebrow: string; content: React.ReactNode }
  > = {
    profile: {
      title: "پروفایل آموزشی",
      eyebrow: "پرونده من",
      content: studentOnly ? (
        <article className="surface p-4">
          <div>
            <small>پروفایل آموزشی</small>
            <h2 className="mt-1 font-semibold">
              {student?.name || user?.username || "دانش‌آموز"}
            </h2>
            <p className="mt-1 text-sm text-ink/65">
              {[student?.grade, student?.major].filter(Boolean).join(" · ") ||
                "پرونده دانش‌آموز"}
            </p>
          </div>
          <div className="mt-4">
            <h2 className="font-semibold">درس‌ها و ارتباطات پرونده</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-paper p-3">
                <strong className="text-sm">درس‌های فعال</strong>
                <p className="mt-1 text-sm text-ink/65">
                  {subjects
                    .filter((item) => item.enabled)
                    .map((item) => item.displayName || item.subject.name)
                    .join("، ") || "درسی ثبت نشده است."}
                </p>
              </div>
              <div className="rounded-md bg-paper p-3">
                <strong className="text-sm">ارتباط‌های فعال</strong>
                <p className="mt-1 text-sm text-ink/65">
                  {relationships
                    .filter((item) => item.status === "ACTIVE")
                    .map(
                      (item) =>
                        `${item.type}: ${[item.fromUser?.firstName, item.fromUser?.lastName].filter(Boolean).join(" ") || item.fromUser?.username || "کاربر"}`,
                    )
                    .join("، ") || "ارتباط فعالی ثبت نشده است."}
                </p>
              </div>
            </div>
            <div className="mt-2 rounded-md bg-paper p-3">
              <strong className="text-sm">اشتباه‌های نیازمند مرور</strong>
              <p className="mt-1 text-sm text-ink/65">
                {mistakes.length
                  ? `${mistakes.length.toLocaleString("fa-IR")} مورد در دفترچه اشتباهات`
                  : "موردی ثبت نشده است."}
              </p>
            </div>
          </div>
        </article>
      ) : (
        <article className="surface p-4">
          <h2 className="font-semibold">نمای خانواده</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            این بخش فقط خواندنی است.
          </p>
        </article>
      ),
    },
    relaxation: {
      title: "آرامش و تمرکز",
      eyebrow: "کتابخانه صوتی",
      content: studentOnly ? <RelaxationLibrary /> : null,
    },
    report: {
      title: "گزارش شبانه",
      eyebrow: "گزارش و برنامه‌ریزی",
      content: studentOnly ? (
        <article className="surface p-4">
          <div className="flex items-start gap-3">
            <MoonStar className="mt-0.5 shrink-0 text-mint" size={20} />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">گزارش شبانه</h2>
              <p className="mt-1 text-sm text-ink/60">
                پیش‌نویس ابتدا روی دستگاه حفظ و سپس با API v2 ثبت می‌شود.
              </p>
              <NightReportForm
                draft={nightReportDraft}
                onSave={saveNightReportDraft}
                onSubmit={submitNightReport}
              />
            </div>
          </div>
        </article>
      ) : null,
    },
    recovery: {
      title: "درخواست جبران",
      eyebrow: "گزارش و برنامه‌ریزی",
      content: studentOnly ? (
        <article className="surface p-4">
          <div className="flex items-start gap-3">
            <RotateCcw className="mt-0.5 shrink-0 text-ink/45" size={20} />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">درخواست جبران</h2>
              <p className="mt-1 text-sm text-ink/60">
                پیش‌نویس ابتدا روی دستگاه حفظ و سپس با API v2 ارسال می‌شود.
              </p>
              <RecoveryRequestForm
                draft={recoveryRequestDraft}
                onSave={saveRecoveryRequestDraft}
                onSubmit={submitRecoveryRequest}
              />
            </div>
          </div>
        </article>
      ) : null,
    },
    security: {
      title: "امنیت حساب",
      eyebrow: "امنیت و دستگاه",
      content: (
        <div className="more-detail-stack">
          <article className="surface p-4">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 shrink-0 text-ink/45" size={20} />
              <div>
                <h2 className="font-semibold">رمز عبور</h2>
                <p className="mt-1 text-sm text-ink/60">
                  تغییر رمز حساب از مسیر امن API v2 انجام می‌شود و نشست‌های دیگر
                  را می‌بندد.
                </p>
              </div>
            </div>
          </article>
          <article className="surface p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 shrink-0 text-mint" size={20} />
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">نشست‌های حساب</h2>
                <p className="mt-1 text-sm text-ink/60">
                  نشست‌های فعال حساب را بررسی و نشست‌های دیگر را لغو کنید.
                </p>
                {authSessions.length ? (
                  <div className="mt-3 space-y-2">
                    {authSessions.map((session) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-md bg-paper px-3 py-3"
                        key={session.id}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Monitor className="shrink-0 text-ink/55" size={17} />
                          <div className="min-w-0 text-sm">
                            <p className="truncate font-medium">
                              {session.current ? "نشست فعلی" : "نشست دیگر"}
                            </p>
                            <p className="text-xs text-ink/55">
                              ایجاد: {formatDate(session.createdAt)} | انقضا:{" "}
                              {formatDate(session.expiresAt)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-md bg-white px-2 py-1 text-xs text-red-700"
                          onClick={() => void revokeAuthSession(session.id)}
                        >
                          {session.current ? "خروج از این نشست" : "لغو نشست"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-md bg-paper px-3 py-3 text-sm text-ink/60">
                    نشستی برای نمایش وجود ندارد.
                  </p>
                )}
              </div>
            </div>
          </article>
        </div>
      ),
    },
    notifications: {
      title: "اعلان‌ها",
      eyebrow: "امنیت و دستگاه",
      content: (
        <div className="more-detail-stack">
          <article className="surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">اعلان دستگاه</h2>
                <p className="mt-1 text-sm text-ink/60">
                  اعلان پایدار سرور با SSE، Push وب یا اعلان بومی دستگاه.
                </p>
              </div>
              {notificationPermission === "granted" ? (
                <span className="rounded-full bg-mint/15 px-3 py-1 text-xs text-mint">
                  فعال
                </span>
              ) : notificationPermission === "unsupported" ? (
                <span className="text-xs text-ink/50">پشتیبانی نمی‌شود</span>
              ) : (
                <button
                  type="button"
                  className="rounded-md bg-ink px-3 py-2 text-sm text-white"
                  onClick={() =>
                    void requestNotificationPermission().then(
                      setNotificationPermission,
                    )
                  }
                >
                  فعال‌سازی
                </button>
              )}
            </div>
          </article>
          <article className="surface p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">اعلان‌ها</h2>
              <div className="flex items-center gap-2 text-sm text-ink/65">
                <span>
                  خوانده‌نشده:{" "}
                  {
                    notifications.filter((notification) => !notification.readAt)
                      .length
                  }
                </span>
                <button
                  type="button"
                  className="rounded-md bg-paper px-2 py-1 text-xs"
                  onClick={() => void markAllNotificationsRead()}
                >
                  خواندن همه
                </button>
              </div>
            </div>
            {error ? (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            {notifications.length ? (
              <div className="mt-3 space-y-2">
                {notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    className={`block w-full rounded-md bg-paper px-3 py-3 text-right ${notification.readAt ? "opacity-70" : ""}`}
                    onClick={() =>
                      !notification.readAt &&
                      void markNotificationRead(notification.id)
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium">{notification.title}</h3>
                      {!notification.readAt ? (
                        <span
                          className="mt-1 size-2 shrink-0 rounded-full bg-mint"
                          aria-label="خوانده‌نشده"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-ink/65">
                      {notification.message}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-md bg-paper px-3 py-3 text-sm text-ink/60">
                اعلانی برای نمایش وجود ندارد.
              </p>
            )}
          </article>
        </div>
      ),
    },
    sync: {
      title: "ذخیره‌سازی و همگام‌سازی",
      eyebrow: "داده‌های برنامه",
      content: (
        <article className="surface p-4" id="sync-status">
          <h2 className="font-semibold">ذخیره‌سازی و همگام‌سازی</h2>
          <p className="mt-2 text-sm text-ink/65">وضعیت: {syncStatus}</p>
        </article>
      ),
    },
  };

  if (section) {
    const detail = details[section];
    return (
      <section className="more-page more-detail-page">
        <Link to="/more" className="more-back">
          <ArrowRight />
          بازگشت به بیشتر
        </Link>
        {detail ? (
          <>
            <header className="more-detail-heading">
              <small>{detail.eyebrow}</small>
              <h1>{detail.title}</h1>
            </header>
            {detail.content}
          </>
        ) : (
          <article className="surface p-4">
            <h1 className="font-semibold">این بخش پیدا نشد</h1>
            <p className="mt-2 text-sm text-ink/65">
              از صفحه بیشتر یک گزینه دیگر را انتخاب کنید.
            </p>
          </article>
        )}
      </section>
    );
  }

  const tiles = [
    {
      to: "/more/profile",
      title: studentOnly ? "پروفایل آموزشی" : "نمای خانواده",
      description: "درس‌ها، پایه و ارتباط‌های فعال",
      icon: UserRound,
      tone: "primary",
    },
    ...(studentOnly
      ? [
          {
            to: "/more/relaxation",
            title: "آرامش و تمرکز",
            description: "موسیقی، صف پخش و نشانک‌ها",
            icon: Headphones,
            tone: "violet",
          },
          {
            to: "/more/report",
            title: "گزارش شبانه",
            description: "ثبت مطالعه، خواب و حال امروز",
            icon: MoonStar,
            tone: "mint",
          },
          {
            to: "/more/recovery",
            title: "درخواست جبران",
            description: "ثبت روز ازدست‌رفته و توضیحات",
            icon: RotateCcw,
            tone: "saffron",
          },
        ]
      : []),
    {
      to: "/learning",
      title: "پیشرفت و مرور",
      description: "گزارش مطالعه و مرورهای ثبت‌شده",
      icon: BarChart3,
      tone: "mint",
    },
    {
      to: "/more/security",
      title: "امنیت حساب",
      description: "رمز عبور و نشست‌های فعال",
      icon: ShieldCheck,
      tone: "ink",
    },
    {
      to: "/more/notifications",
      title: "اعلان‌ها",
      description: `${notifications.filter((item) => !item.readAt).length.toLocaleString("fa-IR")} اعلان خوانده‌نشده`,
      icon: Bell,
      tone: "saffron",
    },
    {
      to: "/more/sync",
      title: "ذخیره و همگام‌سازی",
      description: `وضعیت: ${syncStatus}`,
      icon: Database,
      tone: "primary",
    },
  ];

  return (
    <section className="more-page">
      <header className="more-hero">
        <span>
          <Sparkles />
        </span>
        <div>
          <small>همه امکانات در یک‌جا</small>
          <h1>بیشتر</h1>
          <p>برای ورود به هر بخش، کارت آن را انتخاب کنید.</p>
        </div>
      </header>
      {access?.canUseChat ? (
        <Link to="/chat" className="more-chat-card">
          <span>
            <MessageCircle />
          </span>
          <div>
            <small>ارتباط مستقیم</small>
            <h2>گفتگو با مشاور</h2>
            <p>پیام‌ها و راهنمایی‌های آموزشی</p>
          </div>
          <ChevronLeft />
        </Link>
      ) : null}
      <nav className="more-feature-grid" aria-label="امکانات بیشتر">
        {tiles.map(({ to, title, description, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className={`more-feature-card more-feature-card--${tone}`}
          >
            <span>
              <Icon />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            <ChevronLeft />
          </Link>
        ))}
      </nav>
      <button className="more-logout" onClick={() => void logout()}>
        <LogOut size={18} />
        خروج از حساب
      </button>
    </section>
  );
}

export function RelaxationLibrary() {
  const music = useRelaxationPlayer();
  useEffect(() => {
    if (music.status === "idle") void music.load();
  }, [music]);
  const remaining = Math.max(0, music.duration - music.currentTime);
  return (
    <article className="relaxation-card" aria-labelledby="relaxation-title">
      <div className="relaxation-card__glow" />
      <header>
        <span>
          <Headphones />
        </span>
        <div>
          <small>پیشنهاد آرامش امروز</small>
          <h2 id="relaxation-title">
            {music.selected?.title || "موسیقی امروز"}
          </h2>
          <p>
            {music.selected
              ? `${music.selected.artist || "منتخب سامانه"} · ${music.selectedBy === "AUTO" ? "انتخاب خودکار" : "انتخاب شما"}`
              : "هنوز موسیقی فعالی ثبت نشده است."}
          </p>
        </div>
      </header>
      {music.status === "loading" ? (
        <p className="relaxation-state">
          <LoaderCircle className="spin" /> در حال دریافت فهرست…
        </p>
      ) : null}
      {music.error ? (
        <div className="relaxation-error" role="alert">
          <p>{music.error}</p>
          <button type="button" onClick={() => void music.load()}>
            تلاش دوباره
          </button>
        </div>
      ) : null}
      {music.selected ? (
        <div className="relaxation-player">
          <button
            type="button"
            className="relaxation-play"
            onClick={() => void music.toggle()}
            aria-label={music.playing ? "مکث موسیقی آرامش" : "پخش موسیقی آرامش"}
          >
            {music.buffering ? (
              <LoaderCircle className="spin" />
            ) : music.playing ? (
              <Pause />
            ) : (
              <Play />
            )}
          </button>
          <div className="relaxation-timeline">
            <div>
              <span dir="ltr">{formatAudioTime(music.currentTime)}</span>
              <strong dir="ltr">-{formatAudioTime(remaining)}</strong>
            </div>
            <input
              type="range"
              min="0"
              max={music.duration || 0}
              step="1"
              value={music.currentTime}
              onChange={(event) => music.seek(Number(event.target.value))}
              aria-label="موقعیت پخش موسیقی"
            />
            <i style={{ inlineSize: `${music.bufferedPercent}%` }} />
          </div>
          <div className="audio-quick-controls">
            <button
              type="button"
              onClick={() => music.seekBy(-15)}
              aria-label="پانزده ثانیه عقب"
            >
              <SkipBack />
            </button>
            <button
              type="button"
              onClick={() => music.seekBy(15)}
              aria-label="پانزده ثانیه جلو"
            >
              <SkipForward />
            </button>
            <button
              type="button"
              className={
                music.favorites.includes(music.selected.id) ? "is-active" : ""
              }
              onClick={() => music.toggleFavorite()}
              aria-label="افزودن یا حذف از علاقه‌مندی"
            >
              <Heart
                fill={
                  music.favorites.includes(music.selected.id)
                    ? "currentColor"
                    : "none"
                }
              />
            </button>
            <button
              type="button"
              onClick={() => music.addBookmark()}
              aria-label="نشان‌گذاری زمان فعلی"
            >
              <BookmarkPlus />
            </button>
            <select
              value={music.speed}
              onChange={(event) => music.setSpeed(Number(event.target.value))}
              aria-label="سرعت پخش"
            >
              <option value="0.75">۰٫۷۵×</option>
              <option value="1">۱×</option>
              <option value="1.25">۱٫۲۵×</option>
              <option value="1.5">۱٫۵×</option>
              <option value="2">۲×</option>
            </select>
          </div>
        </div>
      ) : null}
      <div className="audio-secondary-controls">
        <button
          type="button"
          className={music.shuffle ? "is-active" : ""}
          onClick={music.toggleShuffle}
        >
          <Shuffle />
          پخش تصادفی
        </button>
        <button
          type="button"
          className={music.repeat !== "off" ? "is-active" : ""}
          onClick={() =>
            music.setRepeat(
              music.repeat === "off"
                ? "all"
                : music.repeat === "all"
                  ? "one"
                  : "off",
            )
          }
        >
          <Repeat />
          {music.repeat === "one"
            ? "تکرار یک صوت"
            : music.repeat === "all"
              ? "تکرار فهرست"
              : "بدون تکرار"}
        </button>
        <select
          value={music.sleepEndsAt ? "active" : ""}
          onChange={(event) =>
            music.setSleepTimer(
              event.target.value ? Number(event.target.value) : null,
            )
          }
          aria-label="زمان‌سنج خواب"
        >
          <option value="">زمان‌سنج خواب</option>
          {music.sleepEndsAt ? (
            <option value="active" disabled>
              زمان‌سنج فعال است
            </option>
          ) : null}
          <option value="10">۱۰ دقیقه</option>
          <option value="20">۲۰ دقیقه</option>
          <option value="30">۳۰ دقیقه</option>
          <option value="45">۴۵ دقیقه</option>
          <option value="60">۶۰ دقیقه</option>
        </select>
      </div>
      {music.queue.length ? (
        <section className="audio-queue" aria-labelledby="audio-queue-title">
          <header>
            <span>
              <small>بعدی‌ها</small>
              <strong id="audio-queue-title">صف پخش</strong>
            </span>
            <button type="button" onClick={music.clearQueue}>
              پاک‌کردن صف
            </button>
          </header>
          {music.queue.map((track, index) => (
            <div
              key={track.id}
              className={music.selected?.id === track.id ? "is-current" : ""}
            >
              <button
                type="button"
                onClick={() => void music.playTrack(track.id)}
              >
                <strong>{track.title}</strong>
                <small>{track.artist || "بدون نام گوینده"}</small>
              </button>
              <span>
                <button
                  type="button"
                  onClick={() => music.moveQueue(track.id, -1)}
                  disabled={index === 0}
                  aria-label={`انتقال ${track.title} به بالا`}
                >
                  <ChevronUp />
                </button>
                <button
                  type="button"
                  onClick={() => music.moveQueue(track.id, 1)}
                  disabled={index === music.queue.length - 1}
                  aria-label={`انتقال ${track.title} به پایین`}
                >
                  <ChevronDown />
                </button>
                <button
                  type="button"
                  onClick={() => music.removeFromQueue(track.id)}
                  disabled={music.selected?.id === track.id}
                  aria-label={`حذف ${track.title} از صف`}
                >
                  <Trash2 />
                </button>
              </span>
            </div>
          ))}
        </section>
      ) : null}
      {music.bookmarks.length ? (
        <section className="audio-bookmarks">
          <header>
            <small>ادامه از لحظه مهم</small>
            <strong>نشانک‌ها</strong>
          </header>
          {music.bookmarks
            .filter((bookmark) =>
              music.tracks.some((track) => track.id === bookmark.trackId),
            )
            .slice(-5)
            .reverse()
            .map((bookmark) => {
              const track = music.tracks.find(
                (item) => item.id === bookmark.trackId,
              )!;
              return (
                <div key={bookmark.id}>
                  <button
                    type="button"
                    onClick={() => {
                      void music
                        .playTrack(track.id)
                        .then(() => music.seek(bookmark.position));
                    }}
                  >
                    <strong>{track.title}</strong>
                    <small dir="ltr">
                      {formatAudioTime(bookmark.position)}
                    </small>
                  </button>
                  <button
                    type="button"
                    onClick={() => music.removeBookmark(bookmark.id)}
                    aria-label={`حذف نشانک ${track.title}`}
                  >
                    <Trash2 />
                  </button>
                </div>
              );
            })}
        </section>
      ) : null}
      {music.tracks.length ? (
        <div className="music-library">
          <div className="music-library__title">
            <ListMusic />
            <strong>فهرست صوتی</strong>
            <span>{music.tracks.length.toLocaleString("fa-IR")} صوت</span>
          </div>
          {music.tracks.map((track, index) => (
            <button
              type="button"
              key={track.id}
              className={music.selected?.id === track.id ? "is-selected" : ""}
              onClick={() => void music.playTrack(track.id)}
            >
              <span>{(index + 1).toLocaleString("fa-IR")}</span>
              <div>
                <strong>{track.title}</strong>
                <small>{track.artist || "بدون نام گوینده"}</small>
              </div>
              {music.selected?.id === track.id && music.playing ? (
                <span aria-label="در حال پخش">●</span>
              ) : (
                <Play />
              )}
            </button>
          ))}
        </div>
      ) : music.status === "ready" ? (
        <p className="relaxation-state">
          مدیر سامانه هنوز صوت فعالی اضافه نکرده است.
        </p>
      ) : null}
    </article>
  );
}

function formatAudioTime(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

type SaveState = "idle" | "saving" | "success" | "error";

export function NightReportForm({
  draft,
  onSave,
  onSubmit,
}: {
  draft: ReturnType<typeof useStudentStore.getState>["nightReportDraft"];
  onSave: ReturnType<typeof useStudentStore.getState>["saveNightReportDraft"];
  onSubmit: ReturnType<typeof useStudentStore.getState>["submitNightReport"];
}) {
  const [sleepHours, setSleepHours] = useState(draft?.sleepHours ?? "");
  const [studyMinutes, setStudyMinutes] = useState(draft?.studyMinutes ?? "");
  const [mood, setMood] = useState(draft?.mood ?? "");
  const [note, setNote] = useState(draft?.note ?? "");
  const [status, setStatus] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "saving") return;
    const sleep = Number(sleepHours);
    const study = Number(studyMinutes);
    if (!sleepHours || !Number.isFinite(sleep) || sleep < 0 || sleep > 24)
      return invalid("مدت خواب را بین ۰ تا ۲۴ ساعت وارد کنید.");
    if (!studyMinutes || !Number.isInteger(study) || study < 0 || study > 1440)
      return invalid(
        "مدت مطالعه را به‌صورت عدد صحیح بین ۰ تا ۱۴۴۰ دقیقه وارد کنید.",
      );
    if (!mood.trim()) return invalid("حال‌وهوای امروز را انتخاب کنید.");
    setStatus("saving");
    setMessage("در حال ذخیره پیش‌نویس");
    try {
      const values = { sleepHours, studyMinutes, mood, note: note.trim() };
      await onSave(values);
      await onSubmit(values);
      setStatus("success");
      setMessage("گزارش با موفقیت ثبت شد.");
    } catch {
      setStatus("error");
      setMessage("ذخیره پیش‌نویس انجام نشد.");
    }
  }

  function invalid(text: string) {
    setStatus("error");
    setMessage(text);
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="خواب (ساعت)"
          type="number"
          min="0"
          max="24"
          step="0.5"
          value={sleepHours}
          onChange={setSleepHours}
        />
        <Field
          label="مطالعه (دقیقه)"
          type="number"
          min="0"
          max="1440"
          step="1"
          value={studyMinutes}
          onChange={setStudyMinutes}
        />
      </div>
      <label className="block space-y-1 text-sm">
        <span>حال‌وهوای امروز</span>
        <select
          className="w-full rounded-md border border-black/10 bg-white px-3 py-2"
          value={mood}
          onChange={(event) => setMood(event.target.value)}
        >
          <option value="">انتخاب کنید</option>
          <option value="خوب">خوب</option>
          <option value="معمولی">معمولی</option>
          <option value="خسته">خسته</option>
          <option value="پراسترس">پراسترس</option>
        </select>
      </label>
      <Field
        label="یادداشت (اختیاری)"
        value={note}
        onChange={setNote}
        multiline
      />
      <SaveStatus status={status} message={message} />
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-mint px-3 py-2 text-sm text-white disabled:opacity-60"
      >
        {status === "saving" ? "در حال ذخیره" : "ذخیره گزارش"}
      </button>
    </form>
  );
}

export function RecoveryRequestForm({
  draft,
  onSave,
  onSubmit,
}: {
  draft: ReturnType<typeof useStudentStore.getState>["recoveryRequestDraft"];
  onSave: ReturnType<
    typeof useStudentStore.getState
  >["saveRecoveryRequestDraft"];
  onSubmit: ReturnType<
    typeof useStudentStore.getState
  >["submitRecoveryRequest"];
}) {
  const [date, setDate] = useState(
    draft?.date ?? new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState(draft?.reason ?? "");
  const [details, setDetails] = useState(draft?.details ?? "");
  const [status, setStatus] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "saving") return;
    if (!date || !reason.trim() || details.trim().length < 10) {
      setStatus("error");
      setMessage("تاریخ، دلیل و توضیح حداقل ۱۰ حرفی را کامل کنید.");
      return;
    }
    setStatus("saving");
    setMessage("در حال ذخیره پیش‌نویس");
    try {
      const values = { date, reason: reason.trim(), details: details.trim() };
      await onSave(values);
      await onSubmit(values);
      setStatus("success");
      setMessage("درخواست با موفقیت ارسال شد.");
    } catch {
      setStatus("error");
      setMessage("ذخیره پیش‌نویس انجام نشد.");
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={submit}>
      <Field
        label="تاریخ روز ازدست‌رفته"
        type="date"
        value={date}
        onChange={setDate}
      />
      <Field label="دلیل درخواست" value={reason} onChange={setReason} />
      <Field label="توضیحات" value={details} onChange={setDetails} multiline />
      <SaveStatus status={status} message={message} />
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-md bg-saffron px-3 py-2 text-sm text-white disabled:opacity-60"
      >
        {status === "saving" ? "در حال ذخیره" : "ذخیره درخواست"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block space-y-1 text-sm">
      <span>{label}</span>
      {multiline ? (
        <textarea
          className="min-h-20 w-full rounded-md border border-black/10 bg-white px-3 py-2"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className="w-full rounded-md border border-black/10 bg-white px-3 py-2"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...props}
        />
      )}
    </label>
  );
}

function SaveStatus({
  status,
  message,
}: {
  status: SaveState;
  message: string;
}) {
  if (status === "idle") return null;
  return (
    <p
      role={status === "error" ? "alert" : "status"}
      className={`rounded-md px-3 py-2 text-sm ${status === "error" ? "bg-red-50 text-red-700" : status === "success" ? "bg-mint/10 text-mint" : "bg-paper text-ink/65"}`}
    >
      {message}
    </p>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
