(function (global) {
  "use strict";

  var lastFocus = null;
  var currentModal = null;

  function el(id) {
    return document.getElementById(id);
  }

  function rememberFocus() {
    if (document.activeElement && document.activeElement !== document.body) {
      lastFocus = document.activeElement;
    }
  }

  function focusFirst(modal) {
    setTimeout(function () {
      if (!modal || modal.classList.contains("hidden")) return;
      var target = modal.querySelector(
        "[autofocus], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
      );
      if (target && target.focus) target.focus();
    }, 20);
  }

  function show(modal) {
    if (!modal) return;
    rememberFocus();
    var backdrop = el("backdrop");
    if (backdrop) backdrop.classList.remove("hidden");
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    currentModal = modal;
    focusFirst(modal);
  }

  function openHtml(html) {
    var modal = el("genericModal");
    var body = el("genericModalBody");
    if (!modal || !body) return;
    body.innerHTML = html || "";
    show(modal);
  }

  function openById(id) {
    show(el(id));
  }

  function close() {
    var backdrop = el("backdrop");
    var generic = el("genericModal");
    var importModal = el("importModal");
    if (generic) {
      generic.classList.add("hidden");
      generic.setAttribute("aria-hidden", "true");
    }
    if (importModal) {
      importModal.classList.add("hidden");
      importModal.setAttribute("aria-hidden", "true");
    }
    if (backdrop) backdrop.classList.add("hidden");
    document.body.classList.remove("modal-open");
    currentModal = null;
    if (lastFocus && document.documentElement.contains(lastFocus) && lastFocus.focus) {
      lastFocus.focus();
    }
    lastFocus = null;
  }

  function trapFocus(event) {
    if (!currentModal || event.key !== "Tab") return;
    var items = currentModal.querySelectorAll(
      "input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
    );
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function bind() {
    var backdrop = el("backdrop");
    if (backdrop) backdrop.addEventListener("click", close);
    var closeButtons = document.querySelectorAll("[data-close]");
    for (var i = 0; i < closeButtons.length; i++) {
      closeButtons[i].addEventListener("click", close);
    }
    document.addEventListener("keydown", function (event) {
      if (!currentModal) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      trapFocus(event);
    });
  }

  global.MoshaverAdminModal = {
    openHtml: openHtml,
    openById: openById,
    close: close,
    bind: bind,
  };
})(window);
