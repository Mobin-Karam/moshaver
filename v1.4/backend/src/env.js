'use strict';

var fs = require('fs');
var path = require('path');

function loadDotEnv() {
  var p = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(p)) return;
  var text = fs.readFileSync(p, 'utf8');
  text.split(/\r?\n/).forEach(function(line) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.charAt(0) === '#') return;
    var i = trimmed.indexOf('=');
    if (i < 1) return;
    var key = trimmed.slice(0, i).trim();
    var value = trimmed.slice(i + 1).trim();
    if ((value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') || (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")) value = value.slice(1, -1);
    if (typeof process.env[key] === 'undefined') process.env[key] = value;
  });
}
loadDotEnv();

function intEnv(name, fallback) {
  var v = parseInt(process.env[name], 10);
  return isFinite(v) ? v : fallback;
}
function boolEnv(name, fallback) {
  if (typeof process.env[name] === 'undefined') return !!fallback;
  return /^(1|true|yes|on)$/i.test(String(process.env[name]));
}
function csv(name, fallback) {
  return String(process.env[name] || fallback || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean);
}

var nodeEnv = process.env.NODE_ENV || 'development';
var production = nodeEnv === 'production';
var defaultOrigins = 'http://localhost:8080,http://127.0.0.1:8080,http://localhost:8081,http://127.0.0.1:8081,https://st.mahakaram.ir';

if (production) {
  var missing = [];
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD') missing.push('ADMIN_PASSWORD');
  if (!process.env.STUDENT_PASSWORD || process.env.STUDENT_PASSWORD === 'CHANGE_THIS_TO_A_LONG_RANDOM_PASSWORD') missing.push('STUDENT_PASSWORD');
  if (!process.env.CORS_ORIGINS) missing.push('CORS_ORIGINS');
  if (missing.length) throw new Error('Production configuration missing required environment variables: ' + missing.join(', '));
}

module.exports = {
  appName: 'Moshaver | مشاور',
  version: '1.6.0',
  nodeEnv: nodeEnv,
  production: production,
  port: intEnv('PORT', 4000),
  databasePath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data/moshaver.sqlite'),
  corsOrigins: csv('CORS_ORIGINS', defaultOrigins),
  sessionDaysStudent: intEnv('SESSION_DAYS_STUDENT', 30),
  sessionHoursAdmin: intEnv('SESSION_HOURS_ADMIN', 12),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'moshaver_session',
  cookieDomain: process.env.COOKIE_DOMAIN || '',
  cookieSecure: boolEnv('COOKIE_SECURE', production),
  cookieSameSite: /^(Strict|Lax|None)$/i.test(String(process.env.COOKIE_SAMESITE||'')) ? String(process.env.COOKIE_SAMESITE).replace(/^./,function(c){return c.toUpperCase();}).replace(/est$/,'est') : 'Strict',
  allowBearerAuth: boolEnv('ALLOW_BEARER_AUTH', !production),
  trustProxy: boolEnv('TRUST_PROXY', production),
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'DevAdmin123!ChangeMe',
  adminDisplayName: process.env.ADMIN_DISPLAY_NAME || 'مشاور',
  studentUsername: process.env.STUDENT_USERNAME || 'student',
  studentPassword: process.env.STUDENT_PASSWORD || 'DevStudent123!ChangeMe',
  studentDisplayName: process.env.STUDENT_DISPLAY_NAME || 'دانش‌آموز',
  loginWindowMinutes: intEnv('LOGIN_WINDOW_MINUTES', 15),
  loginMaxFailures: intEnv('LOGIN_MAX_FAILURES', 5),
  loginBlockMinutes: intEnv('LOGIN_BLOCK_MINUTES', 15),
  eventRetentionHours: intEnv('EVENT_RETENTION_HOURS', 72),
  chatMaxGroupMembers: intEnv('CHAT_MAX_GROUP_MEMBERS', 100),
  chatGroupCreatesPerHour: intEnv('CHAT_GROUP_CREATES_PER_HOUR', 10),
  chatMaxGroupName: intEnv('CHAT_MAX_GROUP_NAME', 80),
  chatMaxGroupDescription: intEnv('CHAT_MAX_GROUP_DESCRIPTION', 500)
};
