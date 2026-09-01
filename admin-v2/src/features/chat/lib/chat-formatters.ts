export function formatTime(value?: string) {
  return value
    ? new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))
    : "";
}

export function formatDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(value))
    : "";
}

export function formatConversationTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  return Date.now() - date.getTime() < 86_400_000
    ? formatTime(value)
    : new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        month: "numeric",
        day: "numeric",
      }).format(date);
}

export function toFa(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}
