(function(global){
'use strict';

var base=(global.APP_CONFIG&&global.APP_CONFIG.API_BASE_URL)||'/api/v1';
var CSRF_KEY='moshaver_admin_csrf';
var authFailureHandler=null;
var refreshInFlight=false;
var refreshWaiters=[];
var active=[];

function csrf(){try{return sessionStorage.getItem(CSRF_KEY)||'';}catch(e){return '';}}
function setCsrf(v){try{if(v)sessionStorage.setItem(CSRF_KEY,v);else sessionStorage.removeItem(CSRF_KEY);}catch(e){}}
function isMutating(method){return ['POST','PUT','PATCH','DELETE'].indexOf(String(method||'').toUpperCase())>=0;}
function parsePayload(xhr){try{return JSON.parse(xhr.responseText||'{}');}catch(e){return null;}}
function errorFrom(xhr,payload){
  return {
    status:xhr.status||0,
    message:payload&&payload.error&&payload.error.message?payload.error.message:(xhr.status===0?'اینترنت یا سرور در دسترس نیست.':'خطای سرور'),
    code:payload&&payload.error&&payload.error.code?payload.error.code:(xhr.status===0?'NETWORK':'HTTP_ERROR'),
    details:payload&&payload.error?payload.error.details:null
  };
}
function removeActive(ctrl){var i=active.indexOf(ctrl);if(i>=0)active.splice(i,1);}
function notifyAuthFailure(err,path){
  if(path==='/auth/login'||path==='/auth/logout')return;
  if(authFailureHandler)authFailureHandler(err);
}
function refreshCsrf(done){
  refreshWaiters.push(done||function(){});
  if(refreshInFlight)return;
  refreshInFlight=true;
  var x=new XMLHttpRequest();
  x.open('GET',base+'/auth/me',true);
  x.withCredentials=true;
  x.setRequestHeader('Accept','application/json');
  x.onreadystatechange=function(){
    if(x.readyState!==4)return;
    var p=parsePayload(x),err=null,data=null;
    if(x.status>=200&&x.status<300&&p&&p.ok&&p.data){
      data=p.data;
      if(data.csrfToken)setCsrf(data.csrfToken);
    }else{
      err=errorFrom(x,p);
      if(x.status===401)setCsrf('');
    }
    var list=refreshWaiters.slice();refreshWaiters=[];refreshInFlight=false;
    for(var i=0;i<list.length;i++)list[i](err,data);
    if(err&&err.status===401)notifyAuthFailure(err,'/auth/me');
  };
  x.onerror=function(){
    var err={status:0,message:'اینترنت یا سرور در دسترس نیست.',code:'NETWORK'},list=refreshWaiters.slice();
    refreshWaiters=[];refreshInFlight=false;
    for(var i=0;i<list.length;i++)list[i](err,null);
  };
  x.send();
}
function request(method,path,body,callback,options){
  options=options||{};
  var ctrl={xhr:null,aborted:false,finished:false,abort:function(){this.aborted=true;if(this.xhr){try{this.xhr.abort();}catch(e){}}removeActive(this);}};
  active.push(ctrl);
  var csrfRetried=false;
  function finish(err,data,status){
    if(ctrl.finished||ctrl.aborted)return;
    ctrl.finished=true;removeActive(ctrl);
    if(callback)callback(err,data,status);
  }
  function send(){
    if(ctrl.aborted)return;
    var xhr=new XMLHttpRequest();ctrl.xhr=xhr;
    xhr.open(method,base+path,true);
    xhr.withCredentials=true;
    xhr.setRequestHeader('Accept','application/json');
    if(body!=null)xhr.setRequestHeader('Content-Type','application/json');
    var token=csrf();
    if(isMutating(method)&&token)xhr.setRequestHeader('X-CSRF-Token',token);
    xhr.onreadystatechange=function(){
      if(xhr.readyState!==4||ctrl.aborted)return;
      var payload=parsePayload(xhr);
      if(xhr.status>=200&&xhr.status<300&&payload&&payload.ok){
        if(payload.data&&payload.data.csrfToken)setCsrf(payload.data.csrfToken);
        finish(null,payload.data,xhr.status);return;
      }
      var err=errorFrom(xhr,payload);
      if(xhr.status===403&&err.code==='CSRF'&&isMutating(method)&&!csrfRetried&&!options.noCsrfRetry){
        csrfRetried=true;
        refreshCsrf(function(refreshErr){
          if(ctrl.aborted)return;
          if(refreshErr){finish(refreshErr,null,refreshErr.status);return;}
          send();
        });
        return;
      }
      if(xhr.status===401){
        setCsrf('');
        if(!options.suppressAuthFailure)notifyAuthFailure(err,path);
      }
      finish(err,null,xhr.status);
    };
    xhr.onerror=function(){
      if(ctrl.aborted)return;
      finish({status:0,message:'اینترنت یا سرور در دسترس نیست.',code:'NETWORK'},null,0);
    };
    xhr.onabort=function(){removeActive(ctrl);};
    xhr.send(body==null?null:JSON.stringify(body));
  }
  send();
  return ctrl;
}
function abortAll(){
  var list=active.slice();
  for(var i=0;i<list.length;i++)list[i].abort();
}
function openEvents(onEvent,onState){
  if(!global.EventSource)return null;
  var es=new EventSource(base+'/events',{withCredentials:true});
  var names=['chat.message.created','chat.messages.read','presence.changed','study.started','study.finished','quiz.completed','report.submitted','recovery.requested','issue.created','plan.published','plan.updated','advisor.comment.created','notification.created','review.created','exam.retry_requested','exam.retry_reviewed','exam.updated'];
  names.forEach(function(name){
    es.addEventListener(name,function(ev){
      var data={};try{data=JSON.parse(ev.data||'{}');}catch(e){}
      if(onEvent)onEvent(name,data,ev.lastEventId);
    });
  });
  es.onopen=function(){if(onState)onState('open');};
  es.onerror=function(){if(onState)onState('reconnecting');};
  return es;
}
function clearAuth(){setCsrf('');}
function setAuthFailureHandler(fn){authFailureHandler=typeof fn==='function'?fn:null;}

global.API={
  request:request,
  base:base,
  csrf:csrf,
  setCsrf:setCsrf,
  clearAuth:clearAuth,
  refreshCsrf:refreshCsrf,
  setAuthFailureHandler:setAuthFailureHandler,
  abortAll:abortAll,
  openEvents:openEvents
};
})(window);
