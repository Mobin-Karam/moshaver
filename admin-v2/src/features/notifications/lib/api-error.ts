type ErrorRecord = {
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
  response?: {
    status?: unknown;
    data?: unknown;
  };
  cause?: unknown;
};

function asStatus(value: unknown) {
  const status = Number(value);
  return Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : undefined;
}

export function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const record = error as ErrorRecord;

  return (
    asStatus(record.status) ??
    asStatus(record.statusCode) ??
    asStatus(record.response?.status) ??
    getHttpStatus(record.cause)
  );
}

export function isAuthHttpError(error: unknown) {
  const status = getHttpStatus(error);
  return status === 401 || status === 403;
}

export function shouldRetryNotificationRequest(
  failureCount: number,
  error: unknown,
) {
  const status = getHttpStatus(error);

  // Retrying these responses only creates duplicate console/network noise.
  if (status === 400 || status === 401 || status === 403 || status === 404) {
    return false;
  }

  return failureCount < 2;
}

export function notificationRequestErrorMessage(error: unknown) {
  const status = getHttpStatus(error);

  if (status === 401) {
    return "نشست کاربری معتبر نیست. دوباره وارد حساب شوید.";
  }

  if (status === 403) {
    return "حساب فعلی اجازه دسترسی به اعلان‌ها را ندارد.";
  }

  if (status === 404) {
    return "مسیر API اعلان‌ها روی سرور پیدا نشد.";
  }

  if (status && status >= 500) {
    return "سرور اعلان‌ها در دسترس نیست. کمی بعد دوباره تلاش کنید.";
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "اتصال اینترنت در دسترس نیست.";
  }

  return "دریافت اعلان‌ها ناموفق بود.";
}
