(function (global) {
  "use strict";

  function isoDate(date) {
    return (
      date.getFullYear() +
      "-" +
      ("0" + (date.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + date.getDate()).slice(-2)
    );
  }

  function today() {
    return isoDate(new Date());
  }

  function shift(iso, days) {
    var date = new Date(iso + "T12:00:00");
    date.setDate(date.getDate() + days);
    return isoDate(date);
  }

  function firstOfMonth(iso) {
    return iso.slice(0, 8) + "01";
  }

  function lastOfMonth(iso) {
    var date = new Date(iso.slice(0, 7) + "-01T12:00:00");
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return isoDate(date);
  }

  function startWeek(iso) {
    var date = new Date(iso + "T12:00:00");
    var diff = (date.getDay() + 1) % 7;
    return shift(iso, -diff);
  }

  function faNum(value) {
    if (global.MoshaverUI && global.MoshaverUI.faNum) {
      return global.MoshaverUI.faNum(value);
    }
    var digits = "۰۱۲۳۴۵۶۷۸۹";
    return String(value == null ? "" : value).replace(/[0-9]/g, function (digit) {
      return digits.charAt(Number(digit));
    });
  }

  function shamsi(value, withTime) {
    if (!value) return "—";
    var date = new Date(String(value).length === 10 ? value + "T12:00:00" : value);
    if (isNaN(date.getTime())) return String(value);
    try {
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", withTime ? {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
      } : { year: "numeric", month: "long", day: "numeric" }).format(date);
    } catch (e) { return String(value); }
  }

  global.MoshaverAdminDates = {
    today: today,
    shift: shift,
    firstOfMonth: firstOfMonth,
    lastOfMonth: lastOfMonth,
    startWeek: startWeek,
    faNum: faNum,
    shamsi: shamsi,
  };
})(window);
