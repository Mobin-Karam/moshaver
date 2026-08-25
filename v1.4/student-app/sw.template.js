var APP_VERSION='__APP_VERSION__';
var CACHE='moshaver-student-'+APP_VERSION;
var SHELL=['./','./index.html','./css/app.css?v=__APP_VERSION__','./js/ui-utils.shared.js?v=__APP_VERSION__','./js/api-client.shared.js?v=__APP_VERSION__','./js/api.js?v=__APP_VERSION__','./js/notification-store.js?v=__APP_VERSION__','./js/push-client.js?v=__APP_VERSION__','./js/notification-sync.js?v=__APP_VERSION__','./js/notification-ui.js?v=__APP_VERSION__','./js/update.js?v=__APP_VERSION__','./js/chat-markdown.js?v=__APP_VERSION__','./js/app.js?v=__APP_VERSION__','./js/focus-controls.js?v=__APP_VERSION__','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/logo.svg','./icons/svg/today.svg','./icons/svg/schedule.svg','./icons/svg/exams.svg','./icons/svg/progress.svg','./icons/svg/more.svg','./icons/svg/study.svg','./icons/svg/quiz.svg','./icons/svg/review.svg'];
self.addEventListener('install',function(event){event.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL);}));});
self.addEventListener('activate',function(event){event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){if(k.indexOf('moshaver-student-')===0&&k!==CACHE)return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('message',function(event){if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('push',function(event){
  var payload={};try{payload=event.data?event.data.json():{};}catch(e){payload={title:'اعلان مشاور',body:event.data?event.data.text():''};}
  var id=String(payload.notificationId||'notification-'+Date.now()),url=String(payload.url||'/');
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){var visible=list.some(function(client){return client.visibilityState==='visible';});if(visible)return Promise.all(list.map(function(client){client.postMessage({type:'PUSH_RECEIVED'});}));return self.registration.showNotification(String(payload.title||'اعلان مشاور'),{body:String(payload.body||''),tag:id,renotify:false,icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',data:{notificationId:id,url:url},vibrate:[100,50,100]});}));
});
self.addEventListener('pushsubscriptionchange',function(event){
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){return Promise.all(list.map(function(client){client.postMessage({type:'PUSH_SUBSCRIPTION_CHANGED'});}));}));
});
self.addEventListener('notificationclick',function(event){
  event.notification.close();var target=new URL((event.notification.data&&event.notification.data.url)||'/',self.location.origin);if(target.origin!==self.location.origin)target=new URL('/',self.location.origin);
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){for(var i=0;i<list.length;i++){if('focus' in list[i]){list[i].postMessage({type:'NOTIFICATION_CLICK',url:target.pathname+target.search});return list[i].focus();}}return clients.openWindow?clients.openWindow(target.href):null;}));
});
self.addEventListener('fetch',function(event){
  var req=event.request;if(req.method!=='GET')return;
  var u=new URL(req.url);if(u.pathname.indexOf('/api/')>=0||u.origin!==self.location.origin||/\/(config\.js|version\.json|sw\.js)$/.test(u.pathname))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(function(r){var copy=r.clone();caches.open(CACHE).then(function(c){c.put('./index.html',copy);});return r;}).catch(function(){return caches.match('./index.html');}));return;
  }
  event.respondWith(caches.match(req).then(function(hit){return hit||fetch(req).then(function(r){if(r&&r.status===200){var copy=r.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});}return r;});}));
});
