(function (global) {
  "use strict";
  var button = document.getElementById("focusPauseBtn");
  if (button) button.addEventListener("click", function () {
    if (typeof global.MoshaverToggleStudyPause === "function") global.MoshaverToggleStudyPause();
  });
})(window);
