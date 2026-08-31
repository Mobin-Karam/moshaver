import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Download,
  FileJson,
  FileUp,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { DragEvent, useRef, useState } from "react";
import { api } from "../services/api";
import { fa } from "../lib/utils";
import { useLocale } from "./locale";
import { useModal } from "./modal";
import { Button, Card, Field, Textarea } from "./ui";

export type TransferPreview = {
  schemaVersion?: number;
  summary?: {
    plans?: number;
    tasks?: number;
    exams?: number;
    questions?: number;
    conflicts?: number;
  };
  errors?: string[];
  warnings?: string[];
  conflicts?: string[];
};
type ImportResult = {
  importId?: string;
  plans?: number;
  tasks?: number;
  exams?: number;
  questions?: number;
  skippedPlans?: number;
  skippedExams?: number;
  published?: boolean;
};
type Props = {
  studentId: string;
  scope: "all" | "plans" | "exams";
  title: string;
  description: string;
  exportFrom?: string;
  exportTo?: string;
  showPlanReplacement?: boolean;
  showExamReplacement?: boolean;
  onImported: () => void;
};
type Tab = "import" | "export";
type ConflictPolicy = "stop" | "skip" | "replace";

export function DataTransferWorkspace(props: Props) {
  const modal = useModal(),
    { formatDate } = useLocale(),
    fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("import"),
    [json, setJson] = useState(""),
    [fileName, setFileName] = useState(""),
    [advanced, setAdvanced] = useState(false),
    [dragging, setDragging] = useState(false);
  const [planPolicy, setPlanPolicy] = useState<ConflictPolicy>("stop"),
    [examPolicy, setExamPolicy] = useState<ConflictPolicy>("stop"),
    [result, setResult] = useState<ImportResult | null>(null);
  const preview = useMutation({
    mutationFn: (data: unknown) =>
      api.post<TransferPreview>("/admin/import/preview", {
        studentId: props.studentId,
        data,
      }),
    meta: { successMessage: false },
  });
  const commit = useMutation({
    mutationFn: ({ data, published }: { data: unknown; published: boolean }) =>
      api.post<ImportResult>("/admin/import/commit", {
        studentId: props.studentId,
        data,
        publishImported: published,
        replaceExistingPlans: planPolicy === "replace",
        replaceExistingExams: examPolicy === "replace",
        skipExistingPlans: planPolicy === "skip",
        skipExistingExams: examPolicy === "skip",
        sourceName:
          fileName || `Admin v2 ${props.scope} ${new Date().toISOString()}`,
      }),
    onSuccess(data) {
      setResult(data);
      props.onImported();
    },
    meta: { successMessage: "ورود اطلاعات با موفقیت تکمیل شد." },
  });
  const download = useMutation({
    mutationFn: ({ path, filename }: { path: string; filename: string }) =>
      downloadJson(path, filename),
    meta: { successMessage: "فایل JSON آماده و دانلود شد." },
  });
  const valid = !!preview.data && !preview.data.errors?.length;

  function loadFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      modal.open({
        title: "فرمت فایل قابل قبول نیست",
        description: "یک فایل JSON انتخاب کنید.",
        tone: "danger",
      });
      return;
    }
    void file.text().then((text) => {
      setJson(text);
      setFileName(file.name);
      setResult(null);
      preview.reset();
      parse(text, (data) => preview.mutate(data));
    });
  }
  function parse(text: string, action: (data: unknown) => void) {
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new Error();
      action(data);
    } catch {
      modal.open({
        title: "JSON معتبر نیست",
        description: "ساختار فایل، کوتیشن‌ها و ویرگول‌ها را بررسی کنید.",
        tone: "danger",
      });
    }
  }
  function confirmCommit(published: boolean) {
    const replacing = [
      planPolicy === "replace" && "برنامه‌های موجود",
      examPolicy === "replace" && "آزمون‌های موجود",
    ]
      .filter(Boolean)
      .join(" و ");
    void modal
      .confirm({
        title: published
          ? "ثبت و انتشار اطلاعات؟"
          : "ثبت اطلاعات به‌صورت پیش‌نویس؟",
        description: (
          <div className="grid gap-1">
            <span>{summarySentence(preview.data)}</span>
            {replacing ? (
              <strong className="text-rose-700">
                {replacing} در صورت تطابق جایگزین می‌شوند.
              </strong>
            ) : null}
          </div>
        ),
        tone: replacing ? "danger" : "default",
        confirmLabel: published ? "ثبت و انتشار" : "ثبت پیش‌نویس",
      })
      .then(
        (ok) => ok && parse(json, (data) => commit.mutate({ data, published })),
      );
  }
  function reset() {
    setJson("");
    setFileName("");
    setResult(null);
    setAdvanced(false);
    setPlanPolicy("stop");
    setExamPolicy("stop");
    preview.reset();
    if (fileRef.current) fileRef.current.value = "";
  }
  const exportPath = `/admin/export/json?studentId=${encodeURIComponent(props.studentId)}&scope=${props.scope}${props.exportFrom ? `&from=${props.exportFrom}` : ""}${props.exportTo ? `&to=${props.exportTo}` : ""}`;
  const templatePath = `/admin/import/template?studentId=${encodeURIComponent(props.studentId)}&scope=${props.scope}`;
  const filename = `moshaver-${props.scope}-${props.exportFrom || "all"}-${props.exportTo || "all"}.json`;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200 bg-gradient-to-l from-teal-50 via-white to-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white">
              <FileJson size={22} />
            </span>
            <div>
              <h3 className="text-lg font-black">{props.title}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                {props.description}
              </p>
            </div>
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1">
            <TabButton
              active={tab === "import"}
              onClick={() => setTab("import")}
            >
              <FileUp size={16} />
              ورود اطلاعات
            </TabButton>
            <TabButton
              active={tab === "export"}
              onClick={() => setTab("export")}
            >
              <Download size={16} />
              خروجی گرفتن
            </TabButton>
          </div>
        </div>
      </div>
      {tab === "import" ? (
        <div className="p-4 sm:p-5">
          {result ? (
            <ResultView result={result} onReset={reset} />
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(340px,.8fr)_minmax(0,1.2fr)]">
              <section className="grid content-start gap-3">
                <Step
                  number={1}
                  title="فایل را انتخاب کنید"
                  active={!preview.data}
                />
                <div
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event: DragEvent<HTMLDivElement>) => {
                    event.preventDefault();
                    setDragging(false);
                    loadFile(event.dataTransfer.files[0]);
                  }}
                  className={`grid min-h-52 place-items-center rounded-xl border-2 border-dashed p-6 text-center transition ${dragging ? "border-brand bg-teal-50" : fileName ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-slate-50 hover:border-teal-300"}`}
                >
                  <div className="grid justify-items-center gap-3">
                    {fileName ? (
                      <CheckCircle2 size={38} className="text-emerald-600" />
                    ) : (
                      <UploadCloud size={42} className="text-slate-400" />
                    )}
                    <div>
                      <strong className="block">
                        {fileName || "فایل JSON را اینجا رها کنید"}
                      </strong>
                      <span className="mt-1 block text-xs text-slate-500">
                        {fileName
                          ? "فایل به‌صورت خودکار اعتبارسنجی شد"
                          : "یا از رایانه انتخاب کنید"}
                      </span>
                    </div>
                    <input
                      ref={fileRef}
                      className="sr-only"
                      type="file"
                      accept="application/json,.json"
                      onChange={(event) => loadFile(event.target.files?.[0])}
                    />
                    <Button
                      type="button"
                      variant="soft"
                      onClick={() => fileRef.current?.click()}
                    >
                      {fileName ? "تغییر فایل" : "انتخاب فایل"}
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm font-semibold text-brand"
                  onClick={() => setAdvanced((value) => !value)}
                >
                  <ChevronLeft
                    size={16}
                    className={`transition ${advanced ? "-rotate-90" : ""}`}
                  />
                  ورود دستی JSON
                </button>
                {advanced ? (
                  <Field label="متن JSON">
                    <Textarea
                      dir="ltr"
                      rows={10}
                      value={json}
                      onChange={(event) => {
                        setJson(event.target.value);
                        setFileName("");
                        setResult(null);
                        preview.reset();
                      }}
                      placeholder='{"schemaVersion": 2, ...}'
                    />
                    <Button
                      variant="soft"
                      loading={preview.isPending}
                      disabled={!json || !props.studentId}
                      onClick={() =>
                        parse(json, (data) => preview.mutate(data))
                      }
                    >
                      اعتبارسنجی متن
                    </Button>
                  </Field>
                ) : null}
                <Button
                  variant="ghost"
                  disabled={!props.studentId}
                  loading={
                    download.isPending &&
                    download.variables?.path === templatePath
                  }
                  onClick={() =>
                    download.mutate({
                      path: templatePath,
                      filename: `moshaver-${props.scope}-template.json`,
                    })
                  }
                >
                  دانلود فایل نمونه و قالب
                </Button>
              </section>
              <section className="grid content-start gap-4">
                <Step
                  number={2}
                  title="بررسی و رفع مشکل"
                  active={!!preview.data}
                />
                {preview.isPending ? (
                  <ReviewLoading />
                ) : preview.data ? (
                  <Review preview={preview.data} />
                ) : (
                  <EmptyReview />
                )}
                <div className="border-t border-slate-200 pt-4">
                  <Step
                    number={3}
                    title="روش ثبت را انتخاب کنید"
                    active={valid}
                  />
                  <div
                    className={`mt-3 grid gap-3 ${valid ? "" : "pointer-events-none opacity-45"}`}
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      {props.showPlanReplacement ? (
                        <ConflictPolicyPicker
                          value={planPolicy}
                          onChange={setPlanPolicy}
                          title="برنامه‌های هم‌تاریخ"
                          description="برنامه دارای سابقه انجام‌شده هرگز جایگزین نمی‌شود."
                        />
                      ) : null}
                      {props.showExamReplacement ? (
                        <ConflictPolicyPicker
                          value={examPolicy}
                          onChange={setExamPolicy}
                          title="آزمون‌های تکراری"
                          description="تطبیق بر اساس عنوان و تاریخ آزمون انجام می‌شود."
                        />
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        loading={commit.isPending}
                        disabled={!valid}
                        onClick={() => confirmCommit(false)}
                      >
                        ثبت به‌صورت پیش‌نویس
                      </Button>
                      <Button
                        loading={commit.isPending}
                        disabled={!valid}
                        onClick={() => confirmCommit(true)}
                      >
                        ثبت و انتشار برای دانش‌آموز
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-white text-brand shadow-sm">
                <Download size={20} />
              </span>
              <div>
                <h4 className="font-black">آماده‌سازی خروجی</h4>
                <p className="text-sm text-slate-500">
                  فایل استاندارد schema-v2 و قابل ورود مجدد تولید می‌شود.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ExportFact
                label="محدوده"
                value={
                  props.scope === "exams"
                    ? "همه آزمون‌ها"
                    : props.scope === "plans"
                      ? "برنامه‌ها"
                      : "برنامه‌ها و آزمون‌های مرتبط"
                }
              />
              <ExportFact
                label="بازه"
                value={
                  props.exportFrom && props.exportTo
                    ? `${formatDate(props.exportFrom)} تا ${formatDate(props.exportTo)}`
                    : "تمام تاریخ‌ها"
                }
              />
              <ExportFact label="ساختار" value="JSON schema-v2" />
              <ExportFact
                label="محتوا"
                value={
                  props.scope === "exams"
                    ? "سؤال، پاسخ، بودجه و زمان‌بندی"
                    : "فعالیت، یادداشت و پیوند آزمون"
                }
              />
            </div>
          </section>
          <aside className="grid content-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-5">
            <ShieldCheck size={28} className="text-brand" />
            <h4 className="font-black">خروجی قابل بازیابی</h4>
            <p className="text-sm leading-6 text-slate-600">
              شناسه‌های داخلی به ارجاع‌های قابل‌حمل تبدیل می‌شوند تا اتصال
              برنامه و آزمون هنگام ورود مجدد حفظ شود.
            </p>
            <Button
              loading={
                download.isPending && download.variables?.path === exportPath
              }
              disabled={!props.studentId}
              onClick={() => download.mutate({ path: exportPath, filename })}
            >
              <Download size={17} />
              دانلود خروجی JSON
            </Button>
            <Button variant="ghost" onClick={() => setTab("import")}>
              بازگشت به ورود اطلاعات
            </Button>
          </aside>
        </div>
      )}
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${active ? "bg-white text-brand shadow-sm" : "text-slate-500"}`}
    >
      {children}
    </button>
  );
}
function Step({
  number,
  title,
  active,
}: {
  number: number;
  title: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid size-7 place-items-center rounded-full text-xs font-black ${active ? "bg-brand text-white" : "bg-slate-100 text-slate-400"}`}
      >
        {fa(number)}
      </span>
      <strong className={active ? "text-ink" : "text-slate-400"}>
        {title}
      </strong>
    </div>
  );
}
function EmptyReview() {
  return (
    <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
      <div>
        <FileJson className="mx-auto text-slate-300" size={38} />
        <strong className="mt-3 block text-slate-500">
          پیش‌نمایش هنوز آماده نیست
        </strong>
        <p className="mt-1 text-xs text-slate-400">
          پس از انتخاب فایل، نتیجه بررسی اینجا نمایش داده می‌شود.
        </p>
      </div>
    </div>
  );
}
function ReviewLoading() {
  return (
    <div className="grid min-h-52 place-items-center rounded-xl border border-slate-200 bg-slate-50">
      <div className="text-center">
        <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-teal-100 border-t-brand" />
        <strong className="mt-3 block text-sm">
          در حال بررسی ساختار و تداخل‌ها…
        </strong>
      </div>
    </div>
  );
}
function Review({ preview }: { preview: TransferPreview }) {
  const summary = preview.summary || {},
    hasErrors = !!preview.errors?.length;
  return (
    <div className="grid gap-3">
      <div
        className={`flex items-start gap-3 rounded-xl border p-4 ${hasErrors ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}
      >
        {hasErrors ? (
          <XCircle className="shrink-0 text-rose-600" />
        ) : (
          <CheckCircle2 className="shrink-0 text-emerald-600" />
        )}
        <div>
          <strong className={hasErrors ? "text-rose-800" : "text-emerald-800"}>
            {hasErrors
              ? "فایل نیاز به اصلاح دارد"
              : "فایل معتبر و آماده ثبت است"}
          </strong>
          <p className="mt-1 text-xs text-slate-600">
            نسخه ساختار: {fa(preview.schemaVersion || 2)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Count label="برنامه" value={summary.plans} />
        <Count label="فعالیت" value={summary.tasks} />
        <Count label="آزمون" value={summary.exams} />
        <Count label="سؤال" value={summary.questions} />
        <Count
          label="تداخل"
          value={summary.conflicts}
          warning={!!summary.conflicts}
        />
      </div>
      {preview.errors?.length ? (
        <IssueList
          title="خطاهای مسدودکننده"
          items={preview.errors}
          tone="red"
        />
      ) : null}
      {preview.warnings?.length ? (
        <IssueList
          title="موارد نیازمند توجه"
          items={preview.warnings}
          tone="amber"
        />
      ) : null}
      {preview.conflicts?.length ? (
        <IssueList
          title="تداخل‌های زمانی"
          items={preview.conflicts}
          tone="amber"
        />
      ) : null}
    </div>
  );
}
function Count({
  label,
  value = 0,
  warning,
}: {
  label: string;
  value?: number;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-3 text-center ${warning ? "border-amber-200" : "border-slate-200"}`}
    >
      <strong className={warning ? "text-amber-700" : "text-ink"}>
        {fa(value)}
      </strong>
      <span className="mt-1 block text-xs text-slate-500">{label}</span>
    </div>
  );
}
function IssueList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "red" | "amber";
}) {
  return (
    <details
      open={tone === "red"}
      className={`rounded-lg border p-3 ${tone === "red" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}
    >
      <summary className="cursor-pointer font-bold">
        {tone === "red" ? (
          <XCircle className="ml-2 inline" size={16} />
        ) : (
          <AlertTriangle className="ml-2 inline" size={16} />
        )}{" "}
        {title} ({fa(items.length)})
      </summary>
      <ul className="mt-2 list-inside list-disc text-xs leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}
function ConflictPolicyPicker({
  value,
  onChange,
  title,
  description,
}: {
  value: ConflictPolicy;
  onChange: (value: ConflictPolicy) => void;
  title: string;
  description: string;
}) {
  const options: { value: ConflictPolicy; label: string; hint: string }[] = [
    { value: "stop", label: "توقف امن", hint: "بدون تغییر اطلاعات قبلی" },
    {
      value: "skip",
      label: "رد کردن تکراری‌ها",
      hint: "فقط موارد جدید ثبت شوند",
    },
    { value: "replace", label: "جایگزینی", hint: "اطلاعات قبلی بازنویسی شوند" },
  ];
  return (
    <fieldset className="rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-sm font-black">{title}</legend>
      <p className="mb-3 text-xs leading-5 text-slate-500">{description}</p>
      <div className="grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition ${value === option.value ? (option.value === "replace" ? "border-rose-300 bg-rose-50" : "border-teal-300 bg-teal-50") : "border-slate-200 hover:bg-slate-50"}`}
          >
            <input
              type="radio"
              name={`${title}-policy`}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>
              <strong className="block text-xs">{option.label}</strong>
              <small className="text-[11px] text-slate-500">
                {option.hint}
              </small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function ResultView({
  result,
  onReset,
}: {
  result: ImportResult;
  onReset: () => void;
}) {
  return (
    <div className="grid min-h-80 place-items-center p-6 text-center">
      <div className="max-w-xl">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 size={34} />
        </span>
        <h4 className="mt-4 text-xl font-black">ورود اطلاعات تکمیل شد</h4>
        <p className="mt-2 text-sm text-slate-500">
          {result.published
            ? "اطلاعات برای دانش‌آموز منتشر شد."
            : "اطلاعات به‌صورت پیش‌نویس ذخیره شد."}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Count label="برنامه" value={result.plans} />
          <Count label="فعالیت" value={result.tasks} />
          <Count label="آزمون" value={result.exams} />
          <Count label="سؤال" value={result.questions} />
        </div>
        {result.skippedPlans || result.skippedExams ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {fa((result.skippedPlans || 0) + (result.skippedExams || 0))} مورد
            تکراری بدون تغییر رد شد.
          </p>
        ) : null}
        <Button className="mt-5" variant="soft" onClick={onReset}>
          ورود فایل دیگر
        </Button>
      </div>
    </div>
  );
}
function ExportFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <span className="text-xs text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm">{value}</strong>
    </div>
  );
}
function summarySentence(preview?: TransferPreview) {
  const summary = preview?.summary || {};
  return `${fa(summary.plans || 0)} برنامه، ${fa(summary.tasks || 0)} فعالیت، ${fa(summary.exams || 0)} آزمون و ${fa(summary.questions || 0)} سؤال ثبت می‌شود.`;
}
async function downloadJson(path: string, filename: string) {
  const data = await api.get<unknown>(path);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
