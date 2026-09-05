import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, UserPlus, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { Student } from "../../../shared/types/domain";
import { useStudents } from "../../../shared/hooks/useStudents";
import { normalizePersianText } from "../../../shared/lib/utils";
import { useModal } from "../../../shared/ui/modal";
import { useAuth } from "../../auth";
import { Button, Card } from "../../../shared/ui/ui";
import {
  archiveStudent,
  createStudent,
  getStudentAttempts,
  getStudentLearning,
  getStudentOverview,
  getStudentTopics,
  getStudentWeekly,
  resetStudentPassword,
  studentLifecycle,
  updateStudent,
} from "../api/students.api";
import { StudentAdminAccess } from "../components/StudentAdminAccess";
import { StudentDetail } from "../components/StudentDetail";
import {
  StudentEditor,
  type StudentEditorFeedback,
  type StudentEditorMode,
} from "../components/StudentEditor";
import { StudentInsights } from "../components/StudentInsights";
import { StudentList } from "../components/StudentList";
import { StudentOverview } from "../components/StudentOverview";
import { StudentOverviewStats } from "../components/StudentOverviewStats";
import { StudentSecurity } from "../components/StudentSecurity";
import {
  getStudentProfileCompleteness,
  getStudentStatus,
  getStudentUsername,
  type StudentDetailTab,
  type StudentProfileFilter,
  type StudentSort,
  type StudentSortDirection,
  type StudentStatusFilter,
} from "../components/student-ui";
import {
  countData,
  emptyStudentForm,
  studentToForm,
  type StudentForm,
} from "../model/student-form";

const detailTabs: StudentDetailTab[] = [
  "overview",
  "activity",
  "profile",
  "access",
  "security",
];
const sortValues: StudentSort[] = [
  "name",
  "username",
  "grade",
  "lastSeen",
  "completeness",
];
const statusValues: StudentStatusFilter[] = [
  "all",
  "active",
  "inactive",
  "archived",
];

function sameForm(a: StudentForm, b: StudentForm) {
  return (Object.keys(a) as (keyof StudentForm)[]).every(
    (key) => a[key] === b[key],
  );
}

function readableError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  )
    return (error as { message: string }).message;
  return fallback;
}

function normalizedUsername(value: string) {
  return normalizePersianText(value).trim().toLocaleLowerCase("en-US");
}

function dateValue(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function numberParam(
  value: string | null,
  fallback: number,
  allowed?: number[],
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return allowed && !allowed.includes(parsed) ? fallback : parsed;
}

function FeedbackBanner({
  feedback,
  onDismiss,
}: {
  feedback: StudentEditorFeedback;
  onDismiss: () => void;
}) {
  if (!feedback) return null;
  return (
    <div
      aria-live="polite"
      className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-sm ${feedback.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300" : feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300"}`}
    >
      <span>{feedback.message}</span>
      <button
        type="button"
        className="grid size-6 shrink-0 place-items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        aria-label="بستن پیام"
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function StudentsPage() {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const studentStore = useStudents();
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [status, setStatus] = useState<StudentStatusFilter>(() => {
    const value = searchParams.get("status") as StudentStatusFilter | null;
    return value && statusValues.includes(value) ? value : "all";
  });
  const [profileFilter, setProfileFilter] = useState<StudentProfileFilter>(
    () => (searchParams.get("profile") === "incomplete" ? "incomplete" : "all"),
  );
  const [sort, setSortState] = useState<StudentSort>(() => {
    const value = searchParams.get("sort") as StudentSort | null;
    return value && sortValues.includes(value) ? value : "name";
  });
  const [sortDirection, setSortDirection] = useState<StudentSortDirection>(
    () => (searchParams.get("direction") === "desc" ? "desc" : "asc"),
  );
  const [page, setPage] = useState(() =>
    numberParam(searchParams.get("page"), 1),
  );
  const [pageSize, setPageSize] = useState(() =>
    numberParam(searchParams.get("pageSize"), 25, [25, 50, 100]),
  );
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState(
    () => searchParams.get("studentId") || "",
  );
  const [detailTab, setDetailTab] = useState<StudentDetailTab>(() => {
    const value = searchParams.get("tab") as StudentDetailTab | null;
    return value && detailTabs.includes(value) ? value : "overview";
  });
  const [mobileDirectory, setMobileDirectory] = useState(
    () => !searchParams.get("studentId"),
  );
  const [form, setForm] = useState<StudentForm>(emptyStudentForm());
  const [securityPassword, setSecurityPassword] = useState("");
  const [feedback, setFeedback] = useState<StudentEditorFeedback>(null);
  const deferredSearch = useDeferredValue(search);
  const { students } = studentStore;
  const qc = useQueryClient();
  const modal = useModal();

  const selected = useMemo(
    () =>
      selectedId
        ? (students.find((student) => student.id === selectedId) ?? null)
        : null,
    [selectedId, students],
  );
  const mode: StudentEditorMode = creating
    ? "create"
    : selected
      ? "edit"
      : "empty";
  const baseline = useMemo(
    () =>
      mode === "edit" && selected
        ? studentToForm(selected)
        : emptyStudentForm(),
    [mode, selected],
  );
  const dirty = useMemo(
    () => mode !== "empty" && !sameForm(form, baseline),
    [baseline, form, mode],
  );
  const saveDirty = useMemo(
    () =>
      mode === "edit"
        ? !sameForm(form, baseline)
        : mode === "create"
          ? dirty
          : false,
    [baseline, dirty, form, mode],
  );

  const usernameConflict = useMemo(() => {
    const username = normalizedUsername(form.username);
    if (!username) return null;
    return (
      students.find(
        (student) =>
          student.id !== selectedId &&
          normalizedUsername(getStudentUsername(student)) === username,
      ) ?? null
    );
  }, [form.username, selectedId, students]);
  const usernameError = usernameConflict
    ? `این نام کاربری قبلاً برای «${usernameConflict.name}» استفاده شده است.`
    : undefined;

  const counts = useMemo(
    () => ({
      all: students.length,
      active: students.filter(
        (student) => getStudentStatus(student) === "active",
      ).length,
      inactive: students.filter(
        (student) => getStudentStatus(student) === "inactive",
      ).length,
      archived: students.filter(
        (student) => getStudentStatus(student) === "archived",
      ).length,
    }),
    [students],
  );
  const incompleteCount = useMemo(
    () =>
      students.filter((student) => getStudentProfileCompleteness(student) < 100)
        .length,
    [students],
  );

  const filtered = useMemo(() => {
    const needle = normalizePersianText(deferredSearch).trim();
    const direction = sortDirection === "asc" ? 1 : -1;
    return students
      .filter(
        (student) =>
          !needle ||
          normalizePersianText(
            [
              student.name,
              student.id,
              getStudentUsername(student),
              student.grade,
              student.major,
              student.targetField || student.target_major,
              student.targetUniversity || student.target_city,
            ]
              .filter(Boolean)
              .join(" "),
          ).includes(needle),
      )
      .filter(
        (student) => status === "all" || getStudentStatus(student) === status,
      )
      .filter(
        (student) =>
          profileFilter === "all" ||
          getStudentProfileCompleteness(student) < 100,
      )
      .slice()
      .sort((a, b) => {
        if (sort === "lastSeen")
          return (
            (dateValue(a.last_seen_at) - dateValue(b.last_seen_at)) * direction
          );
        if (sort === "completeness")
          return (
            (getStudentProfileCompleteness(a) -
              getStudentProfileCompleteness(b)) *
            direction
          );
        const av =
          sort === "username"
            ? getStudentUsername(a)
            : sort === "grade"
              ? a.grade || ""
              : a.name || "";
        const bv =
          sort === "username"
            ? getStudentUsername(b)
            : sort === "grade"
              ? b.grade || ""
              : b.name || "";
        return (
          av.localeCompare(bv, "fa", { numeric: true, sensitivity: "base" }) *
          direction
        );
      });
  }, [deferredSearch, profileFilter, sort, sortDirection, status, students]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pageCount);
  const pagedStudents = useMemo(
    () => filtered.slice((activePage - 1) * pageSize, activePage * pageSize),
    [activePage, filtered, pageSize],
  );

  function updateStudentContext(id: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (id) next.set("studentId", id);
        else next.delete("studentId");
        return next;
      },
      { replace: true },
    );
  }

  function commitSelection(student: Student) {
    setCreating(false);
    setSelectedId(student.id);
    studentStore.setStudentId(student.id);
    updateStudentContext(student.id);
    setDetailTab("overview");
    setMobileDirectory(false);
    setForm(studentToForm(student));
    setSecurityPassword("");
    setFeedback(null);
  }

  function requestSelection(student: Student) {
    if (mode === "edit" && student.id === selectedId) {
      setMobileDirectory(false);
      return;
    }
    if (!dirty) return commitSelection(student);
    void modal
      .confirm({
        title: "تغییرات ذخیره‌نشده کنار گذاشته شود؟",
        description:
          "ویرایش‌های فعلی ذخیره نشده‌اند. با انتخاب دانش‌آموز دیگر، این تغییرات از بین می‌روند.",
        confirmLabel: "ادامه",
      })
      .then((ok) => {
        if (ok) commitSelection(student);
      });
  }

  function startCreate() {
    const run = () => {
      setCreating(true);
      setSelectedId("");
      updateStudentContext("");
      setDetailTab("profile");
      setMobileDirectory(false);
      setForm(emptyStudentForm());
      setSecurityPassword("");
      setFeedback(null);
    };
    if (mode === "create") {
      setMobileDirectory(false);
      return;
    }
    if (!dirty) return run();
    void modal
      .confirm({
        title: "فرم فعلی پاک شود؟",
        description:
          "تغییرات ذخیره‌نشده کنار گذاشته می‌شوند و فرم ساخت دانش‌آموز جدید باز می‌شود.",
        confirmLabel: "دانش‌آموز جدید",
      })
      .then((ok) => {
        if (ok) run();
      });
  }

  function cancelCreate() {
    const run = () => {
      const previous =
        students.find((student) => student.id === studentStore.studentId) ??
        null;
      setCreating(false);
      setMobileDirectory(true);
      setFeedback(null);
      if (previous) {
        setSelectedId(previous.id);
        setForm(studentToForm(previous));
        updateStudentContext(previous.id);
      } else {
        setSelectedId("");
        setForm(emptyStudentForm());
        updateStudentContext("");
      }
    };
    if (!dirty) return run();
    void modal
      .confirm({
        title: "ساخت دانش‌آموز لغو شود؟",
        description: "اطلاعات واردشده در فرم جدید از بین می‌رود.",
        confirmLabel: "لغو ساخت",
      })
      .then((ok) => {
        if (ok) run();
      });
  }

  function showDirectory() {
    const run = () => setMobileDirectory(true);
    if (!dirty) return run();
    void modal
      .confirm({
        title: "بازگشت به فهرست؟",
        description:
          "تغییرات ذخیره‌نشده در پروفایل باقی می‌مانند، اما بهتر است قبل از ادامه آن‌ها را ذخیره کنید.",
        confirmLabel: "بازگشت",
      })
      .then((ok) => {
        if (ok) run();
      });
  }

  function replaceCachedStudent(student: Student) {
    qc.setQueryData<Student[]>(["students"], (current) => {
      if (!Array.isArray(current)) return [student];
      return current.some((item) => item.id === student.id)
        ? current.map((item) => (item.id === student.id ? student : item))
        : [student, ...current];
    });
  }

  function patchCachedStudent(id: string, patch: Partial<Student>) {
    qc.setQueryData<Student[]>(["students"], (current) =>
      Array.isArray(current)
        ? current.map((student) =>
            student.id === id ? { ...student, ...patch } : student,
          )
        : current,
    );
  }

  const create = useMutation({
    mutationFn: (draft: StudentForm) => createStudent(draft, auth.context?.activeOrganization?.id),
    onSuccess: (student) => {
      replaceCachedStudent(student);
      commitSelection(student);
      setDetailTab("overview");
      setFeedback({
        tone: "success",
        message: "دانش‌آموز با موفقیت ساخته شد.",
      });
      void qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error) =>
      setFeedback({
        tone: "error",
        message: readableError(
          error,
          "ساخت دانش‌آموز ناموفق بود. اطلاعات را بررسی و دوباره تلاش کنید.",
        ),
      }),
  });

  const update = useMutation({
    mutationFn: () => updateStudent(selectedId, form),
    onSuccess: (student) => {
      replaceCachedStudent(student);
      setForm(studentToForm(student));
      setFeedback({ tone: "success", message: "تغییرات پروفایل ذخیره شد." });
      void qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error) =>
      setFeedback({
        tone: "error",
        message: readableError(error, "ذخیره تغییرات ناموفق بود."),
      }),
  });

  const remove = useMutation({
    mutationFn: () => archiveStudent(selectedId),
    onSuccess: () => {
      patchCachedStudent(selectedId, {
        accountStatus: "archived",
        account_status: "archived",
        active: false,
        account_active: false,
      });
      setFeedback({
        tone: "success",
        message: "حساب دانش‌آموز بایگانی شد. تاریخچه برای بازیابی حفظ شده است.",
      });
      void qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error) =>
      setFeedback({
        tone: "error",
        message: readableError(error, "بایگانی حساب ناموفق بود."),
      }),
  });

  const lifecycle = useMutation({
    mutationFn: (
      action: "activate" | "deactivate" | "restore" | "force-logout",
    ) => studentLifecycle(selectedId, action),
    onSuccess: (_, action) => {
      if (action === "activate" || action === "restore")
        patchCachedStudent(selectedId, {
          accountStatus: "active",
          account_status: "active",
          active: true,
          account_active: true,
        });
      if (action === "deactivate")
        patchCachedStudent(selectedId, {
          accountStatus: "inactive",
          account_status: "inactive",
          active: false,
          account_active: false,
        });
      const message =
        action === "force-logout"
          ? "تمام نشست‌های فعال دانش‌آموز بسته شد."
          : action === "deactivate"
            ? "حساب دانش‌آموز غیرفعال شد."
            : action === "restore"
              ? "حساب دانش‌آموز بازیابی شد."
              : "حساب دانش‌آموز فعال شد.";
      setFeedback({ tone: "success", message });
      void qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error) =>
      setFeedback({
        tone: "error",
        message: readableError(error, "اجرای عملیات حساب ناموفق بود."),
      }),
  });

  const resetPassword = useMutation({
    mutationFn: () => resetStudentPassword(selectedId, securityPassword),
    onSuccess: () => {
      setSecurityPassword("");
      setFeedback({
        tone: "success",
        message: "رمز عبور تغییر کرد و نشست‌های قبلی دانش‌آموز بسته شدند.",
      });
    },
    onError: (error) =>
      setFeedback({
        tone: "error",
        message: readableError(error, "تغییر رمز عبور ناموفق بود."),
      }),
  });

  const overview = useQuery({
    queryKey: ["student-overview", selectedId],
    enabled: mode === "edit" && !!selectedId && detailTab === "overview",
    queryFn: () => getStudentOverview(selectedId),
  });
  const activityEnabled =
    mode === "edit" && !!selectedId && detailTab === "activity";
  const learning = useQuery({
    queryKey: ["student-learning", selectedId],
    enabled: activityEnabled,
    queryFn: () => getStudentLearning(selectedId),
  });
  const attempts = useQuery({
    queryKey: ["student-attempts", selectedId],
    enabled: activityEnabled,
    queryFn: () => getStudentAttempts(selectedId),
  });
  const weekly = useQuery({
    queryKey: ["student-weekly", selectedId],
    enabled: activityEnabled,
    queryFn: () => getStudentWeekly(selectedId),
  });
  const topics = useQuery({
    queryKey: ["student-topics", selectedId],
    enabled: activityEnabled,
    queryFn: () => getStudentTopics(selectedId),
  });

  useEffect(() => {
    if (creating || studentStore.isLoading || !students.length) return;
    const fromUrl = searchParams.get("studentId") || "";
    const fromUrlStudent = fromUrl
      ? students.find((student) => student.id === fromUrl)
      : null;
    if (fromUrlStudent) {
      if (fromUrlStudent.id !== selectedId) {
        setSelectedId(fromUrlStudent.id);
        setForm(studentToForm(fromUrlStudent));
        setFeedback(null);
      }
      if (studentStore.studentId !== fromUrlStudent.id)
        studentStore.setStudentId(fromUrlStudent.id);
      return;
    }
    if (selectedId && students.some((student) => student.id === selectedId))
      return;
    const stored =
      students.find((student) => student.id === studentStore.studentId) ?? null;
    if (stored) {
      setSelectedId(stored.id);
      setForm(studentToForm(stored));
      updateStudentContext(stored.id);
    }
  }, [
    creating,
    searchParams,
    studentStore.isLoading,
    studentStore.studentId,
    students,
    selectedId,
  ]);

  useEffect(() => {
    setPage(1);
  }, [profileFilter, deferredSearch, sort, sortDirection, status, pageSize]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        const setOrDelete = (
          key: string,
          value: string,
          defaultValue?: string,
        ) => {
          if (!value || value === defaultValue) next.delete(key);
          else next.set(key, value);
        };
        setOrDelete("q", search);
        setOrDelete("status", status, "all");
        setOrDelete("profile", profileFilter, "all");
        setOrDelete("sort", sort, "name");
        setOrDelete(
          "direction",
          sortDirection,
          sort === "lastSeen" || sort === "completeness" ? "desc" : "asc",
        );
        setOrDelete("page", String(page), "1");
        setOrDelete("pageSize", String(pageSize), "25");
        setOrDelete("tab", detailTab, "overview");
        return next;
      },
      { replace: true },
    );
  }, [
    detailTab,
    page,
    pageSize,
    profileFilter,
    search,
    setSearchParams,
    sort,
    sortDirection,
    status,
  ]);

  function setField(key: keyof StudentForm, value: string) {
    setFeedback(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setSort(value: StudentSort) {
    if (value === sort) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortState(value);
    setSortDirection(
      value === "lastSeen" || value === "completeness" ? "desc" : "asc",
    );
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setProfileFilter("all");
  }

  function confirmLifecycle(
    action: "activate" | "deactivate" | "restore" | "force-logout",
  ) {
    const copy = {
      activate: [
        "فعال‌سازی حساب؟",
        "دانش‌آموز دوباره اجازه ورود خواهد داشت.",
        "فعال‌سازی",
      ],
      deactivate: [
        "غیرفعال‌سازی حساب؟",
        "نشست‌های دانش‌آموز بسته و ورود او متوقف می‌شود.",
        "غیرفعال‌سازی",
      ],
      restore: [
        "بازیابی حساب؟",
        "حساب بایگانی‌شده با تمام تاریخچه دوباره فعال می‌شود.",
        "بازیابی",
      ],
      "force-logout": [
        "خروج اجباری دانش‌آموز؟",
        "تمام نشست‌های فعال این دانش‌آموز فوراً بسته می‌شوند.",
        "خروج اجباری",
      ],
    }[action];
    void modal
      .confirm({
        title: copy[0],
        description: copy[1],
        confirmLabel: copy[2],
        tone:
          action === "deactivate" || action === "force-logout"
            ? "danger"
            : "default",
      })
      .then((ok) => ok && lifecycle.mutate(action));
  }

  const retryActivity = () =>
    void Promise.all([
      learning.refetch(),
      attempts.refetch(),
      weekly.refetch(),
      topics.refetch(),
    ]);

  const detailContent = selected ? (
    <>
      <FeedbackBanner feedback={feedback} onDismiss={() => setFeedback(null)} />
      <div className={feedback ? "mt-4" : ""}>
        {detailTab === "overview" ? (
          <StudentOverview
            student={selected}
            overview={overview.data}
            loading={overview.isLoading}
            error={overview.isError}
            onRetry={() => void overview.refetch()}
            onEdit={() => setDetailTab("profile")}
          />
        ) : null}
        {detailTab === "activity" ? (
          <StudentInsights
            onRetry={retryActivity}
            values={[
              {
                label: "موارد یادگیری",
                value: learning.data?.summary.totalItems || 0,
                loading: learning.isLoading,
                error: learning.isError,
                hint: "داده بخش یادگیری",
              },
              {
                label: "تلاش آزمون",
                value: countData(attempts.data),
                loading: attempts.isLoading,
                error: attempts.isError,
                hint: "تعداد تلاش‌های ثبت‌شده",
              },
              {
                label: "روزهای هفتگی",
                value: countData(weekly.data),
                loading: weekly.isLoading,
                error: weekly.isError,
                hint: "داده پیشرفت هفتگی",
              },
              {
                label: "موضوع عملکرد",
                value: countData(topics.data),
                loading: topics.isLoading,
                error: topics.isError,
                hint: "موضوع‌های تحلیل‌شده",
              },
            ]}
          />
        ) : null}
        {detailTab === "profile" ? (
          <StudentEditor
            mode="edit"
            form={form}
            setField={setField}
            dirty={dirty}
            saveDirty={saveDirty}
            usernameError={usernameError}
            busy={update.isPending}
            onReset={() => {
              setFeedback(null);
              setForm(baseline);
            }}
            onSave={() => update.mutate()}
          />
        ) : null}
        {detailTab === "access" ? (
          <StudentAdminAccess selectedId={selectedId} />
        ) : null}
        {detailTab === "security" ? (
          <StudentSecurity
            student={selected}
            password={securityPassword}
            setPassword={(value) => {
              setFeedback(null);
              setSecurityPassword(value);
            }}
            onArchive={() =>
              void modal
                .confirm({
                  title: "بایگانی دانش‌آموز؟",
                  description:
                    "حساب غیرفعال می‌شود اما تاریخچه برای بازیابی حفظ خواهد شد.",
                  tone: "danger",
                  confirmLabel: "بایگانی",
                })
                .then((ok) => ok && remove.mutate())
            }
            onPassword={() =>
              void modal
                .confirm({
                  title: "تغییر رمز دانش‌آموز؟",
                  description:
                    "رمز تغییر می‌کند و تمام نشست‌های قبلی دانش‌آموز بسته می‌شوند.",
                  confirmLabel: "تغییر رمز",
                })
                .then((ok) => ok && resetPassword.mutate())
            }
            onLifecycle={confirmLifecycle}
            busy={{
              remove: remove.isPending,
              password: resetPassword.isPending,
              lifecycle: lifecycle.isPending,
            }}
          />
        ) : null}
      </div>
    </>
  ) : null;

  return (
    <div className="grid gap-4 sm:gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <StudentOverviewStats
          counts={counts}
          status={status}
          onStatusChange={(next) => {
            setStatus(next);
            setProfileFilter("all");
          }}
          incomplete={incompleteCount}
          incompleteOnly={profileFilter === "incomplete"}
          onIncompleteToggle={() => {
            setProfileFilter(
              profileFilter === "incomplete" ? "all" : "incomplete",
            );
            if (profileFilter !== "incomplete") setStatus("all");
          }}
        />
        <Button onClick={startCreate}>
          <UserPlus size={16} />
          دانش‌آموز جدید
        </Button>
      </header>

      <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)] 2xl:grid-cols-[minmax(0,1.4fr)_minmax(460px,0.6fr)]">
        <div className={mobileDirectory ? "block" : "hidden xl:block"}>
          <StudentList
            students={pagedStudents}
            total={students.length}
            filteredTotal={filtered.length}
            page={activePage}
            pageCount={pageCount}
            pageSize={pageSize}
            setPage={setPage}
            setPageSize={setPageSize}
            selectedId={selectedId}
            search={search}
            setSearch={setSearch}
            status={status}
            profileFilter={profileFilter}
            sort={sort}
            sortDirection={sortDirection}
            onSort={setSort}
            onClearFilters={clearFilters}
            onSelect={requestSelection}
            loading={studentStore.isLoading}
            error={studentStore.isError}
            onRetry={() => void studentStore.refetch()}
            creating={creating}
          />
        </div>

        <div className={mobileDirectory ? "hidden xl:block" : "block"}>
          {mode === "create" ? (
            <Card className="overflow-hidden p-0 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)]">
              <div className="border-b border-slate-200 p-3 xl:hidden dark:border-slate-800">
                <button
                  type="button"
                  onClick={cancelCreate}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ArrowRight size={15} />
                  بازگشت به فهرست
                </button>
              </div>
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-3 sm:p-4">
                <FeedbackBanner
                  feedback={feedback}
                  onDismiss={() => setFeedback(null)}
                />
                <div className={feedback ? "mt-4" : ""}>
                  <StudentEditor
                    mode="create"
                    form={form}
                    setField={setField}
                    dirty={dirty}
                    saveDirty={saveDirty}
                    usernameError={usernameError}
                    busy={create.isPending}
                    onCancelCreate={cancelCreate}
                    onReset={() => {
                      setFeedback(null);
                      setForm(emptyStudentForm());
                    }}
                    onSave={() => create.mutate(form)}
                  />
                </div>
              </div>
            </Card>
          ) : selected ? (
            <StudentDetail
              student={selected}
              tab={detailTab}
              onTabChange={setDetailTab}
              onBack={showDirectory}
              dirty={dirty}
            >
              {detailContent}
            </StudentDetail>
          ) : (
            <Card className="hidden xl:block">
              <div className="grid min-h-64 place-items-center text-center">
                <div>
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <UserPlus size={20} />
                  </span>
                  <h2 className="mt-3 font-bold text-ink">
                    یک دانش‌آموز را انتخاب کنید
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    پرونده و فضای کاری در این بخش نمایش داده می‌شود.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
