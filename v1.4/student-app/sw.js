var APP_VERSION='1.6.0';
var CACHE='moshaver-student-'+APP_VERSION;
var SHELL=['./','./index.html','./css/app.css?v=1.6.0','./js/ui-utils.shared.js?v=1.6.0','./js/api-client.shared.js?v=1.6.0','./js/api.js?v=1.6.0','./js/update.js?v=1.6.0','./js/chat-markdown.js?v=1.6.0','./js/app.js?v=1.6.0','./js/focus-controls.js?v=1.6.0','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/logo.svg','./icons/svg/today.svg','./icons/svg/schedule.svg','./icons/svg/exams.svg','./icons/svg/progress.svg','./icons/svg/more.svg','./icons/svg/study.svg','./icons/svg/quiz.svg','./icons/svg/review.svg'];
self.addEventListener('install',function(event){event.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}));});
self.addEventListener('activate',function(event){event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){if(k.indexOf('moshaver-student-')===0&&k!==CACHE)return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('message',function(event){if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',function(event){
  var req=event.request;if(req.method!=='GET')return;
  var u=new URL(req.url);if(u.pathname.indexOf('/api/')>=0||u.origin!==self.location.origin||/\/(config\.js|version\.json|sw\.js)$/.test(u.pathname))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(function(r){var copy=r.clone();caches.open(CACHE).then(function(c){c.put('./index.html',copy);});return r;}).catch(function(){return caches.match('./index.html');}));return;
  }
  event.respondWith(caches.match(req).then(function(hit){return hit||fetch(req).then(function(r){if(r&&r.status===200){var copy=r.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}return r;});}));
});
