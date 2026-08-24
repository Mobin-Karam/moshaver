(function (global) {
  "use strict";

  function setButtonBusy(button, busy, label) {
    if (!button) return;
    if (busy) {
      if (!button.getAttribute("data-old-label")) {
        button.setAttribute("data-old-label", button.innerHTML);
      }
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      if (label) button.innerHTML = label;
      return;
    }
    button.disabled = false;
    button.removeAttribute("aria-busy");
    var old = button.getAttribute("data-old-label");
    if (old) {
      button.innerHTML = old;
      button.removeAttribute("data-old-label");
    }
  }

  function autoGrow(textarea, maxHeight) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(maxHeight || 140, textarea.scrollHeight) + "px";
  }

  global.MoshaverAdminForms = {
    setButtonBusy: setButtonBusy,
    autoGrow: autoGrow,
  };
})(window);
