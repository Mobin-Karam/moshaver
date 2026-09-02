import type { Exam } from "../../../shared/types/domain";

const attemptDateFormatter =
  new Intl.DateTimeFormat(
    "fa-IR-u-ca-persian",
    {
      dateStyle: "medium",
    },
  );

const persianDayFormatter =
  new Intl.DateTimeFormat(
    "fa-IR-u-ca-persian",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  );

export function formatAttemptDate(
  value?: string,
) {
  return value
    ? attemptDateFormatter.format(
        new Date(value),
      )
    : "—";
}

export function optionLabel(
  value?: string,
) {
  const options: Record<
    string,
    string
  > = {
    a: "۱",
    b: "۲",
    c: "۳",
    d: "۴",
  };

  return value
    ? `گزینه ${
        options[value] || value
      }`
    : "بدون پاسخ";
}

export function persianDateForIso(
  isoDate: string,
) {
  if (!isoDate) {
    return "";
  }

  return persianDayFormatter.format(
    new Date(
      `${isoDate}T12:00:00`,
    ),
  );
}

export function replaceIsoDay(
  value: string,
  isoDate: string,
) {
  return /^\d{4}-\d{2}-\d{2}/.test(
    value,
  )
    ? value.replace(
        /^\d{4}-\d{2}-\d{2}/,
        isoDate,
      )
    : value;
}

export function statusLabel(
  status?: Exam["status"],
) {
  return (
    {
      upcoming: "آینده",
      active: "فعال",
      completed: "تمام",
      cancelled: "لغو",
    } as const
  )[status || "upcoming"];
}
