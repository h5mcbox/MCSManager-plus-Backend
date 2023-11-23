const { createHash, createHmac } = require('crypto');
const hash = data => createHash('sha256').update(data).digest('hex');
hash.hmac = (key, data) => createHmac("sha256", key).update(data).digest('hex');

function createPassword(_password, _salt) {
  let PasswordHash = hash(_password);
  PasswordHash = PasswordHash + _salt;
  PasswordHash = hash(PasswordHash);
  return {
    password: PasswordHash,
    salt: _salt
  };
}

function randomString(len) {
  len = len || 32;
  var $chars = "ABCDEFGHIJKLNMOPQRSTUVWXYZabcdefghijklnmopqrstuvwxyz1234567890";
  var maxPos = $chars.length;
  var pwd = "";
  for (let i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}

module.exports = { hash, createPassword, randomString };
