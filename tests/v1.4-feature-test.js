'use strict';
const {spawn}=require('child_process');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../v1.4/backend');
const db=path.join('/tmp','moshaver-v140-'+process.pid+'.sqlite');
try{fs.unlinkSync(db)}catch(e){}
const port=4300+(process.pid%300);
const env=Object.assign({},process.env,{NODE_ENV:'test',PORT:String(port),DATABASE_PATH:db,CORS_ORIGINS:'http://localhost:8081,http://localhost:8082',ADMIN_USERNAME:'admin',ADMIN_PASSWORD:'AdminTest12345!',STUDENT_USERNAME:'maha',STUDENT_PASSWORD:'StudentTest12345!',COOKIE_SECURE:'0',COOKIE_SAMESITE:'Lax'});
const child=spawn(process.execPath,['--experimental-sqlite','src/server.js'],{cwd:root,env,stdio:['ignore','pipe','pipe']});
child.stdout.on('data',d=>process.stdout.write(d));child.stderr.on('data',d=>process.stderr.write(d));
const base=`http://127.0.0.1:${port}/api/v1`;
function Client(){this.cookie='';this.csrf='';}
Client.prototype.req=async function(method,url,body){let h={Accept:'application/json',Origin:'http://localhost:8081'};if(this.cookie)h.Cookie=this.cookie;if(body!==undefined)h['Content-Type']='application/json';if(['POST','PUT','PATCH','DELETE'].includes(method)&&this.csrf)h['X-CSRF-Token']=this.csrf;let r=await fetch(base+url,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});let sc=r.headers.get('set-cookie');if(sc){let m=sc.match(/moshaver_session=([^;]*)/);if(m)this.cookie='moshaver_session='+m[1];}let j=await r.json().catch(()=>({}));if(j&&j.data&&j.data.csrfToken)this.csrf=j.data.csrfToken;return {status:r.status,json:j,data:j.data,error:j.error};};
async function wait(){for(let i=0;i<80;i++){try{let r=await fetch(`http://127.0.0.1:${port}/health`);if(r.ok)return;}catch(e){}await new Promise(r=>setTimeout(r,75));}throw new Error('server timeout')}
function assert(v,m){if(!v)throw new Error(m)}
(async()=>{try{
 await wait();
 const admin=new Client(),student=new Client();
 let r=await admin.req('POST','/auth/login',{username:'admin',password:'AdminTest12345!'});assert(r.status===200,'admin login '+r.status);
 r=await admin.req('GET','/auth/me');assert(r.status===200,'admin me #1');r=await admin.req('GET','/auth/me');assert(r.status===200,'admin me #2 reload persistence');
 let students=(await admin.req('GET','/admin/students')).data;assert(students&&students.items&&students.items.length,'students');let sid=students.items[0].id;
 await student.req('POST','/auth/login',{username:'maha',password:'StudentTest12345!'});
 // Future exam must stay locked until its openAt.
 let now=Date.now(),date=new Date(now).toISOString().slice(0,10),futureOpen=new Date(now+3600000).toISOString(),futureClose=new Date(now+7200000).toISOString();
 r=await admin.req('POST','/admin/exams',{studentId:sid,title:'Future gate '+Date.now(),isoDate:date,persianDate:'امروز',openAt:futureOpen,closeAt:futureClose,durationMinutes:30,maxAttempts:1,published:true,status:'upcoming'});assert(r.status===201,'future exam create '+r.status+' '+JSON.stringify(r.error));let futureExam=r.data;
 await admin.req('POST',`/admin/exams/${futureExam.id}/questions`,{question:'future?',options:['A','B','C','D'],correctOption:'a'});
 r=await student.req('POST',`/exams/${futureExam.id}/start`,{deviceLabel:'test'});assert(r.status===409&&r.error.details.reason==='not_open','future exam must be locked');
 // Live exam: exactly one base attempt, then advisor-approved extra attempt.
 let open=new Date(now-60000).toISOString(),close=new Date(now+3600000).toISOString();
 r=await admin.req('POST','/admin/exams',{studentId:sid,title:'Timed one-attempt '+Date.now(),isoDate:date,persianDate:'امروز',openAt:open,closeAt:close,durationMinutes:30,maxAttempts:1,published:true,status:'upcoming',instructions:'یک بار اجرا'});assert(r.status===201,'create exam '+r.status+' '+JSON.stringify(r.error));let exam=r.data;
 r=await admin.req('POST',`/admin/exams/${exam.id}/questions`,{question:'۲ + ۲ چند است؟',options:['۴','۳','۵','۶'],correctOption:'a',explanation:'۴'});assert(r.status===201,'add question');
 r=await student.req('GET','/exams');assert(r.status===200&&r.data.some(x=>x.id===exam.id),'student sees exam');
 r=await student.req('POST',`/exams/${exam.id}/start`,{deviceLabel:'test'});assert([200,201].includes(r.status),'start exam '+r.status+' '+JSON.stringify(r.error));let run=r.data;assert(run.quiz.questions.length===1,'question delivered');
 // Re-opening before submit resumes same run rather than consuming a second attempt.
 let resumed=await student.req('POST',`/exams/${exam.id}/start`,{deviceLabel:'test'});assert(resumed.status===200&&resumed.data.runId===run.runId&&resumed.data.resumed===true,'active exam resumes same run');
 r=await student.req('POST',`/quizzes/${run.quiz.id}/attempts`,{runId:run.runId,answers:[{questionId:run.quiz.questions[0].id,selectedOption:'a'}]});assert(r.status===201,'submit exam');
 r=await student.req('POST',`/exams/${exam.id}/start`,{deviceLabel:'test'});assert(r.status===409&&r.error.details.reason==='attempt_limit','second base attempt blocked '+JSON.stringify(r));
 r=await student.req('POST',`/exams/${exam.id}/retry-request`,{message:'لطفاً یک بار دیگر'});assert(r.status===201,'retry request');let reqId=r.data.id;
 r=await admin.req('GET',`/admin/exam-attempt-requests?studentId=${encodeURIComponent(sid)}`);assert(r.status===200&&r.data.some(x=>x.id===reqId&&x.status==='pending'),'admin sees retry');
 r=await admin.req('PATCH',`/admin/exam-attempt-requests/${reqId}`,{status:'approved',advisorNote:'تأیید شد'});assert(r.status===200,'approve retry');
 r=await student.req('POST',`/exams/${exam.id}/start`,{deviceLabel:'test'});assert([200,201].includes(r.status),'approved second start '+r.status+' '+JSON.stringify(r.error));
 // JSON import: Admin-selected student overrides any copied studentId; questions are committed too.
 let future=new Date(now+86400000).toISOString().slice(0,10);let imp={schemaVersion:2,studentId:'WRONG_WILL_BE_OVERRIDDEN',plans:[{planDate:future,title:'برنامه JSON',motivationText:'امروز با تمرکز روی یک قدم کوچک جلو برو.',published:false,tasks:[{start:'07:00',end:'08:00',type:'study',subject:'تاریخ',title:'مطالعه',testCount:0}]}],exams:[{title:'آزمون JSON',isoDate:future,openAt:future+'T08:00:00+03:30',closeAt:future+'T10:00:00+03:30',durationMinutes:60,maxAttempts:1,published:true,questions:[{question:'نمونه؟',options:['A','B','C','D'],answer:'a'}]}]};
 r=await admin.req('POST','/admin/import/preview',{studentId:sid,data:imp});assert(r.status===200&&r.data.studentId===sid&&r.data.summary.questions===1,'preview target/questions');
 r=await admin.req('POST','/admin/import/commit',{studentId:sid,data:imp,replaceExistingPlans:true,replaceExistingExams:true,publishImported:false,sourceName:'v140 test'});assert(r.status===201&&r.data.studentId===sid&&r.data.questions===1,'commit import');
 r=await admin.req('GET',`/admin/plans?studentId=${encodeURIComponent(sid)}&date=${future}`);assert(r.status===200&&r.data.motivationText==='امروز با تمرکز روی یک قدم کوچک جلو برو.','daily motivation persisted from JSON');
 r=await admin.req('POST','/admin/plans',{studentId:sid,planDate:future,title:'برنامه JSON',dayLabel:'',persianDate:'',jalaliId:'',motivationText:'پیام جدید مشاور برای همین روز',published:true});assert(r.status===200&&r.data.motivationText==='پیام جدید مشاور برای همین روز','advisor can edit daily motivation');
 r=await student.req('GET',`/dashboard?date=${future}`);assert(r.status===200&&r.data.plan&&r.data.plan.motivationText==='پیام جدید مشاور برای همین روز','student receives daily motivation on dashboard');
 r=await student.req('PUT','/notifications/read-all',{});assert(r.status===200,'read all notifications');
 // Backward compatibility: the real summer schemaVersion 1 file still previews and commits.
 let summer=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../examples/moshaver-summer-plan-1405-28mordad-to-10mehr.json'),'utf8'));
 r=await admin.req('POST','/admin/import/preview',{studentId:sid,data:summer});assert(r.status===200&&r.data.summary.plans===45&&r.data.summary.exams===4&&!r.data.errors.length,'summer v1 preview compatibility');
 r=await admin.req('POST','/admin/import/commit',{studentId:sid,data:summer,replaceExistingPlans:true,replaceExistingExams:true,publishImported:false,sourceName:'summer compatibility test'});assert(r.status===201&&r.data.plans===45&&r.data.exams===4,'summer v1 commit compatibility');
 console.log('\nV1.4.2 FEATURE TEST PASSED: reload session, exam time gate, one-attempt/resume/retry approval, JSON target+questions, legacy summer JSON, notifications.');
 }catch(e){console.error('\nV1.4 FEATURE TEST FAILED:',e.stack||e);process.exitCode=1;}finally{child.kill('SIGTERM');setTimeout(()=>{for(const x of [db,db+'-shm',db+'-wal'])try{fs.unlinkSync(x)}catch(e){}},250);}})();
