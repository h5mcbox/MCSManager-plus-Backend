const hash=require("js-sha256");

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
