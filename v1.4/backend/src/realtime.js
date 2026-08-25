'use strict';

var clients = [];

function serializeEvent(row) {
  return 'id: ' + row.id + '\n' +
    'event: ' + row.event_type + '\n' +
    'data: ' + row.payload_json.replace(/\r?\n/g,' ') + '\n\n';
}

function matches(client, row) {
  if (row.audience_user_id) return client.userId === row.audience_user_id;
  if (row.audience_role === 'all') return true;
  if (row.audience_role === 'admin') return client.role === 'admin';
  if (row.audience_role === 'student') return client.role === 'student' && client.studentId === row.student_id;
  return false;
}

function emitUser(db, userId, type, payload, now) {
  var createdAt = now(), json = JSON.stringify(payload || {});
  var result = db.prepare('INSERT INTO realtime_events (audience_role,student_id,event_type,payload_json,created_at,audience_user_id) VALUES (?,?,?,?,?,?)')
    .run('all', null, type, json, createdAt, userId);
  var row = { id:Number(result.lastInsertRowid), audience_role:'all', student_id:null, audience_user_id:userId, event_type:type, payload_json:json, created_at:createdAt };
  clients.slice().forEach(function(client) { if (matches(client,row)) try { client.res.write(serializeEvent(row)); } catch (e) { remove(client); } });
  return row.id;
}

function emit(db, audienceRole, studentId, type, payload, now) {
  var createdAt = now();
  var json = JSON.stringify(payload || {});
  var result = db.prepare('INSERT INTO realtime_events (audience_role,student_id,event_type,payload_json,created_at) VALUES (?,?,?,?,?)')
    .run(audienceRole, studentId || null, type, json, createdAt);
  var row = { id:Number(result.lastInsertRowid), audience_role:audienceRole, student_id:studentId || null, event_type:type, payload_json:json, created_at:createdAt };
  clients.slice().forEach(function(client) {
    if (!matches(client,row)) return;
    try { client.res.write(serializeEvent(row)); } catch (e) { remove(client); }
  });
  return row.id;
}

function remove(client) {
  var i = clients.indexOf(client);
  if (i >= 0) clients.splice(i,1);
  if (client.keepAlive) clearInterval(client.keepAlive);
}

function stream(db, req, res, user) {
  res.statusCode = 200;
  res.setHeader('Content-Type','text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
  res.setHeader('Connection','keep-alive');
  res.setHeader('X-Accel-Buffering','no');
  if (res.flushHeaders) res.flushHeaders();
  res.write('retry: 5000\n\n');

  var lastId = Number(req.headers['last-event-id'] || 0);
  if (lastId > 0) {
    var rows;
    if (user.role === 'admin') rows = db.prepare("SELECT * FROM realtime_events WHERE id>? AND ((audience_user_id=?) OR (audience_user_id IS NULL AND audience_role IN ('admin','all'))) ORDER BY id LIMIT 200").all(lastId,user.id);
    else rows = db.prepare("SELECT * FROM realtime_events WHERE id>? AND ((audience_user_id=?) OR (audience_user_id IS NULL AND (audience_role='all' OR (audience_role='student' AND student_id=?)))) ORDER BY id LIMIT 200").all(lastId,user.id,user.student_id);
    rows.forEach(function(row){ res.write(serializeEvent(row)); });
  }

  var client = { res:res, role:user.role, userId:user.id, studentId:user.student_id || null, keepAlive:null };
  client.keepAlive = setInterval(function(){ try{res.write(': keepalive ' + Date.now() + '\n\n');}catch(e){remove(client);} },25000);
  clients.push(client);
  req.on('close',function(){remove(client);});
  req.on('error',function(){remove(client);});
}

function cleanup(db, olderThanIso) {
  try { db.prepare('DELETE FROM realtime_events WHERE created_at<?').run(olderThanIso); } catch (e) {}
}

function count() { return clients.length; }
function closeAll(){clients.slice().forEach(function(c){try{c.res.end();}catch(e){}remove(c);});}

module.exports = { emit:emit, emitUser:emitUser, stream:stream, cleanup:cleanup, count:count, closeAll:closeAll };
