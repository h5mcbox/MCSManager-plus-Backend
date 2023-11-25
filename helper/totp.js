const fromHEXString = hexString =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const crypto = require("crypto");
const sha1_hmac = (key, data) => crypto.createHmac("sha1", key).update(data).digest("hex");
function Base32encode(str) {
  var bytes = str.split("").map(e => e.charCodeAt(0));
  const base32map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const base32 = [];
  let overflow;
  for (let i = 0; i < bytes.length; i++) {
    switch (i % 5) {
      case 0:
        base32.push(base32map.charAt(bytes[i] >>> 3));
        overflow = (bytes[i] & 0x7) << 2;
        break;
      case 1:
        base32.push(base32map.charAt(overflow | (bytes[i] >>> 6)));
        base32.push(base32map.charAt((bytes[i] >>> 1) & 0x1F));
        overflow = (bytes[i] & 0x1) << 4;
        break;
      case 2:
        base32.push(base32map.charAt(overflow | (bytes[i] >>> 4)));
        overflow = (bytes[i] & 0xF) << 1;
        break;
      case 3:
        base32.push(base32map.charAt(overflow | (bytes[i] >>> 7)));
        base32.push(base32map.charAt((bytes[i] >>> 2) & 0x1F));
        overflow = (bytes[i] & 0x3) << 3;
        break;
      case 4:
        base32.push(base32map.charAt(overflow | (bytes[i] >>> 5)));
        base32.push(base32map.charAt(bytes[i] & 0x1F));
        overflow = -1;
        break;
    }
  }
  if (overflow !== void 0 && overflow !== -1) {
    base32.push(base32map.charAt(overflow));
  }
  while (base32.length % 8 != 0) {
    base32.push('=');
  }
  return base32.join('');
}
function intToBytesArray(n) {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; --i) {
    bytes[i] = n & 255;
    n = n >> 8;
  }
  return bytes;
}

//Main
function createURL(secret, name, account) {
  return `otpauth://totp/${name}${account ? ":" + encodeURIComponent(account) : ""}?secret=${Base32encode(secret).replace("=", "")}${account ? "&issuer=" + name : ""}`
}
function hotp(key, count, digit = 6) {
  var t0 = fromHEXString(sha1_hmac(key, intToBytesArray(count)));
  var t1 = t0[19] & 15;
  var t2 = t0.slice(t1, t1 + 4);
  var t3 = t2.reduce((d, e, i) => {
    if (i == 0) { d += e & 127 } else { d += e & 255 }
    if (i != t2.length - 1) d *= 2 << 7;
    return d;
  }, 0) % (10 ** digit);
  var t4 = t3.toString().padStart(6, "0");
  return t4;
}
hotp.verify = function (code, key, count, digit = 6) {
  code = Number(code);
  for (var t = count - 2; t <= count + 2; t++) {
    if (code == Number(hotp(key, count, digit))) {
      return true;
    }
  }
  return false;
}
function totp(key, digit) {
  return hotp(key, Math.floor((Date.now() / 1000) / 30), digit);
}
totp.verify = function (code, key, digit) {
  return hotp.verify(code, key, Math.floor((Date.now() / 1000) / 30), digit);
}
module.exports = { hotp, totp, createURL };
