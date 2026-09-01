(function (global) {
  "use strict";
  var KEY="moshaver_admin_theme";
  function systemDark(){return !!(global.matchMedia&&global.matchMedia("(prefers-color-scheme: dark)").matches);}
  function stored(){try{var value=localStorage.getItem(KEY);return value==="dark"||value==="light"?value:"auto";}catch(e){return "auto";}}
  function effective(mode){return mode==="auto"?(systemDark()?"dark":"light"):mode;}
  function syncButton(mode){var button=document.getElementById("themeToggleBtn"),label=document.getElementById("themeLabel"),icon=document.getElementById("themeIcon");if(!button)return;var active=effective(mode);button.setAttribute("aria-pressed",active==="dark"?"true":"false");button.title="تغییر به پوسته "+(active==="dark"?"روشن":"تیره");if(label)label.textContent=active==="dark"?"روشن":"تیره";if(icon)icon.textContent=active==="dark"?"☀":"☾";}
  function apply(mode,persist){mode=mode||stored();var active=effective(mode);document.documentElement.setAttribute("data-theme",active);document.documentElement.setAttribute("data-theme-mode",mode);var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",active==="dark"?"#0b141d":"#173A5B");if(persist)try{localStorage.setItem(KEY,mode);}catch(e){}syncButton(mode);}
  function toggle(){apply(effective(stored())==="dark"?"light":"dark",true);}
  apply(stored(),false);
  if(global.matchMedia){var media=global.matchMedia("(prefers-color-scheme: dark)"),changed=function(){if(stored()==="auto")apply("auto",false);};if(media.addEventListener)media.addEventListener("change",changed);else if(media.addListener)media.addListener(changed);}
  document.addEventListener("DOMContentLoaded",function(){var button=document.getElementById("themeToggleBtn");if(button)button.addEventListener("click",toggle);syncButton(stored());});
  global.MoshaverAdminTheme={apply:apply,toggle:toggle,current:stored};
})(window);
