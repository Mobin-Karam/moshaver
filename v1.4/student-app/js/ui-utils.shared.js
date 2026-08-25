(function (global) {
  "use strict";

  function el(id) {
    return document.getElementById(id);
  }

  function q(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qa(selector, root) {
    return (root || document).querySelectorAll(selector);
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char];
    });
  }

  function faNum(value) {
    var digits = "۰۱۲۳۴۵۶۷۸۹";
    return String(value == null ? "" : value).replace(/[0-9]/g, function (digit) {
      return digits.charAt(Number(digit));
    });
  }

  function icon(name, className) {
    var classAttr = className ? ' class="' + esc(className) + '"' : "";
    return (
      "<svg" +
      classAttr +
      '><use href="#i-' +
      esc(name) +
      '" xlink:href="#i-' +
      esc(name) +
      '"></use></svg>'
    );
  }

  function appendIcon(parent, name, className) {
    var wrap = document.createElement("span");
    wrap.innerHTML = icon(name, className);
    parent.appendChild(wrap.firstChild);
  }

  function toast(message, type) {
    var stack = el("toastStack");
    if (!stack) return null;
    var kind = type || (/خطا|نامعتبر|نشد|نیست/.test(String(message)) ? "error" : "success");
    var card = document.createElement("div");
    var iconWrap = document.createElement("span");
    var body = document.createElement("div");
    var title = document.createElement("strong");
    var text = document.createElement("p");
    card.className = "toast-card " + kind;
    iconWrap.className = "toast-icon";
    appendIcon(iconWrap, kind === "error" ? "alert" : "check2");
    title.textContent = kind === "error" ? "نیاز به توجه" : "انجام شد";
    text.textContent = String(message == null ? "" : message);
    body.appendChild(title);
    body.appendChild(text);
    card.appendChild(iconWrap);
    card.appendChild(body);
    stack.appendChild(card);
    setTimeout(function () {
      card.classList.add("leaving");
      setTimeout(function () {
        if (card.parentNode) card.parentNode.removeChild(card);
      }, 220);
    }, 3600);
    return card;
  }

  function binarySearch(sorted, target, compare) {
    var lo = 0, hi = sorted.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (compare(sorted[mid], target) < 0) lo = mid + 1; else hi = mid; }
    return lo;
  }

  function binaryInsertUnique(sorted, item, compare) {
    var at = binarySearch(sorted, item, compare);
    if (at < sorted.length && compare(sorted[at], item) === 0) return false;
    sorted.splice(at, 0, item);
    return true;
  }

  global.MoshaverUI = {
    el: el,
    q: q,
    qa: qa,
    esc: esc,
    faNum: faNum,
    icon: icon,
    toast: toast,
    binarySearch: binarySearch,
    binaryInsertUnique: binaryInsertUnique,
  };
})(window);
