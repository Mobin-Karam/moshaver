'use strict';

var crypto = require('crypto');

var SCRYPT_N = 131072; // OWASP-style stronger work factor for new hashes.
var SCRYPT_R = 8;
var SCRYPT_P = 1;
var SCRYPT_KEYLEN = 64;
var SCRYPT_MAXMEM = 256 * 1024 * 1024;

function scryptAsync(password, salt, keylen, options) {
  return new Promise(function(resolve, reject) {
    crypto.scrypt(String(password), salt, keylen, options, function(err, derived) {
      if (err) reject(err); else resolve(derived);
    });
  });
}

function formatHash(salt, hash) {
  return 'scrypt$v2$' + SCRYPT_N + '$' + SCRYPT_R + '$' + SCRYPT_P + '$' + salt.toString('hex') + '$' + hash.toString('hex');
}

function hashPasswordSync(password) {
  var salt = crypto.randomBytes(16);
  var hash = crypto.scryptSync(String(password), salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM });
  return formatHash(salt, hash);
}

async function hashPassword(password) {
  var salt = crypto.randomBytes(16);
  var hash = await scryptAsync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM });
  return formatHash(salt, hash);
}

function parseHash(stored) {
  var p = String(stored || '').split('$');
  if (p.length === 7 && p[0] === 'scrypt' && p[1] === 'v2') {
    return { version:2, N:Number(p[2]), r:Number(p[3]), p:Number(p[4]), salt:Buffer.from(p[5], 'hex'), expected:Buffer.from(p[6], 'hex') };
  }
  // Legacy v1.2 format: scrypt$salt$hash using Node defaults N=2^14,r=8,p=1.
  if (p.length === 3 && p[0] === 'scrypt') {
    return { version:1, N:16384, r:8, p:1, salt:Buffer.from(p[1], 'hex'), expected:Buffer.from(p[2], 'hex') };
  }
  return null;
}

async function verifyPassword(password, stored) {
  try {
    var parsed = parseHash(stored);
    if (!parsed || !parsed.expected.length) return { ok:false, needsRehash:false };
    var maxmem = parsed.N >= SCRYPT_N ? SCRYPT_MAXMEM : 64 * 1024 * 1024;
    var actual = await scryptAsync(password, parsed.salt, parsed.expected.length, { N: parsed.N, r: parsed.r, p: parsed.p, maxmem:maxmem });
    var ok = parsed.expected.length === actual.length && crypto.timingSafeEqual(parsed.expected, actual);
    return { ok:ok, needsRehash:ok && (parsed.version !== 2 || parsed.N < SCRYPT_N || parsed.r !== SCRYPT_R || parsed.p !== SCRYPT_P) };
  } catch (e) {
    return { ok:false, needsRehash:false };
  }
}

function newSessionToken() { return crypto.randomBytes(32).toString('base64url'); }
function newCsrfToken() { return crypto.randomBytes(24).toString('base64url'); }
function hashToken(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }
function id(prefix) { return (prefix || 'id') + '_' + crypto.randomBytes(10).toString('hex'); }
function safeEqualText(a,b) {
  var aa=Buffer.from(String(a||'')), bb=Buffer.from(String(b||''));
  return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);
}

module.exports = {
  hashPassword: hashPassword,
  hashPasswordSync: hashPasswordSync,
  verifyPassword: verifyPassword,
  newSessionToken: newSessionToken,
  newCsrfToken: newCsrfToken,
  hashToken: hashToken,
  safeEqualText: safeEqualText,
  id: id,
  scryptParams: { N:SCRYPT_N, r:SCRYPT_R, p:SCRYPT_P }
};
