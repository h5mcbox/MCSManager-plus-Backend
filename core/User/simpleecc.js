(function (simpleECC) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = simpleECC;
  } else if (typeof window !== "undefined") {
    window.simpleECC = simpleECC;
  }
  return simpleECC;
})(function simpleECC(basePoint, a, b, p, n, l, hl, hashFunction) {
  const self = globalThis;
  const curveSet = {
    "secp256k1": [
      {
        x: 55066263022277343669578718895168534326250603453777594175500187360389116729240n,
        y: 32670510020758816978083085130507043184471273380659243275938904335757337482424n
      },
      0n,
      7n,
      2n ** 256n - 2n ** 32n - 2n ** 9n - 2n ** 8n - 2n ** 7n - 2n ** 6n - 2n ** 4n - 1n,
      2n ** 256n - 432420386565659656852420866394968145599n,
      256,
      32,
      (function () {
        if (typeof sha256==="function") {
          return globalThis.sha256;
        }else if(typeof require==="function"){
          return require("./CryptoMine").hash;
        } else if (hashFunction.name === "sha256") {
          return hashFunction;
        } else {
          throw "There has not sha256 function to use";
        }
      })()
    ]
  }
  if (typeof basePoint === "string") {
    if (basePoint in curveSet) {
      return simpleECC(...curveSet[basePoint]);
    } else {
      throw new Error("Need an vaild curve.");
    }
  } else if (typeof basePoint === "object") {
    if (typeof basePoint.x !== "bigint" && typeof basePoint.y !== "bigint") {
      throw new Error("Need an vaild base point.");
    }
    if (typeof a !== "bigint") {
      throw new Error("Need an vaild parameter.");
    }
    if (typeof b !== "bigint") {
      throw new Error("Need an vaild parameter.");
    }
    if (typeof p !== "bigint") {
      throw new Error("Need an vaild parameter.");
    }
    if (typeof n !== "bigint") {
      throw new Error("Need an vaild parameter.");
    }
  }
  function revocableProxy(p,h){
    if(!(this instanceof revocableProxy)){
      throw new TypeError(`Constructor ${revocableProxy.name} requires 'new'`);
    }
    if(typeof p!=="object"||typeof h!=="object")throw new TypeError("Cannot create proxy with a non-object as target or handler");
    var revoked=false;
    var RevocableReflect=new Proxy(Reflect,{
      get:function(o,k){
        if(revoked)throw new TypeError(`Cannot perform '${k}' on a proxy that has been revoked`);
        return h[k]||o[k];
      }
    })
    var RevocableProxy=new Proxy(p,RevocableReflect);
    function revoke(){
      revoked=true;
    }
    return {proxy:RevocableProxy,revoke};
  }//Yes,I know proxy.revocable
  var cryptoKeyMap = new WeakMap();
  function importKey(exportable, Key) {
    if(!((Key instanceof ArrayBuffer)||(Key instanceof Uint8Array)))throw new Error("You can't import key because Key is not a instance of ArrayBuffer or a Uint8Array");
    if(Key instanceof ArrayBuffer)Key=new Uint8Array(Key);
    var type;
    if (Key[0] == 5) {
      type = "private";
    } else if (Key[0] == 2 || Key[0] == 3) {
      type = "public";
    } else {
      throw new Error("Unknown key type.");
    }
    if (type === "private") {
      var pk = BufferToBigInt(Key.slice(1));
      return new cryptoKey(type, exportable, pk);
    } else if (type === "public") {
      var keyx = BufferToBigInt(Key.slice(1));
      return new cryptoKey(type, exportable, uncompressPoint(keyx, !(Key[0] % 2)));
    }
  }
  class cryptoKey {
    type;
    exportable;
    revokeKey;
    exportKey(getPoint) {
      var entry = cryptoKeyMap.get(this);
      if (!entry.exportable) throw "You can't export this key.";
      if(getPoint)return entry.key;
      if (entry.type === "public") {
        if (entry.key.y % 2n === 0n) {
          return concatBufs([Uint8Array.from([2]), BigIntToBuffer(entry.key.x)]).buffer;
        } else {
          return concatBufs([Uint8Array.from([3]), BigIntToBuffer(entry.key.x)]).buffer;
        }
      } else if (entry.type === "private") {
        return concatBufs([Uint8Array.from([5]), BigIntToBuffer(entry.key)]).buffer;
      }
    }
    constructor(type, exportable, key) {
      this.type = type;
      this.exportable = exportable;
      var KeyDescription={ type, key, exportable };
      var KeyProxy=new revocableProxy(KeyDescription,{});
      this.revokeKey=KeyProxy.revoke;
      Object.freeze(this);
      cryptoKeyMap.set(this, KeyProxy.proxy);
    }
  }
  //There passed curve check for performance
  function modPow(b, e, m) {
    if (m == 1n) {
      return 0;
    } else {
      var r = 1n;
      b = b % m;
      while (e > 0n) {
        if (e % 2n == 1n) {
          r = (r * b) % m;
        }
        e = e >> 1n;
        b = (b ** 2n) % m;
      }
      return r;
    }
  }
  var p1=(p+1n)/4n; //Pre-compute (P+1)/4
  function uncompressPoint(x, canDevideBy2) {
    var c = x**3n + a * x + b;
    var y = modPow(c, p1, p);
    return new Point(x, (!(y%2n)===canDevideBy2) ? y : p - y);
  }
  function get_inverse(b, p) {
    function get_inv(x, y, p) {
      return x <= 1n ? 1n : get_inv(y % x, y, p) * (y - y / x) % p;
    }
    return get_inv(b % p, p, p);
  }
  function addPad(l = 0, u) {
    if (u.length > l) throw new Error("PadingError");
    var r = new Uint8Array(l);
    r.set(u, l - u.length);
    return r;
  }
  function removePad(u) {
    for (let i = 0; i < u.length; i++) {
      if (!u[i]) continue;
      return u.slice(i);
    }
    return new Uint8Array(0);
  }
  function gcd(a, b) {
    return b ? gcd(b, a % b) : a;
  }
  function mod(a, b) {
    var t = a % b;
    return t >= 0 ? t : b + t;
  }
  class Point {
    constructor(x, y) {
      this.x = x || 0n;
      this.y = y || 0n;
    }
  }
  function pointAdd(pa, pb) {
    if ((pa.x === 0n && pa.y === 0n) || (pb.x === 0n && pb.y === 0n)) {
      return new Point(pa.x + pb.x, pa.y + pb.y);
    } else if (pa.x === pb.x && ((pa.y + pb.y) == 0n)) {
      return new Point(0n, 0n);
    }
    var b = 0n, c = 0n, d, f = true;
    if ((pa.x === pb.x) && (pa.y === pb.y)) {
      b = 3n * pa.x * pa.x + a;
      c = 2n * pa.y;
    } else {
      b = pa.y - pb.y;
      c = pa.x - pb.x;
    }
    if (b * c < 0n) {
      f = false;
      b = b >= 0 ? b : -b;
      c = c >= 0 ? c : -c;
    }
    var _gcd = gcd(b, c);
    b /= _gcd;
    c /= _gcd;
    if (c !== 1) { c = get_inverse(c, p) }
    d = b * c;
    if (!f) { d = -d; }
    var x = mod(d * d - pa.x - pb.x, p);
    var y = mod(d * (pa.x - x) - pa.y, p);
    return new Point(x, y);
  }
  function pointMul(n, g) {
    n = BigInt(n)
    let ans = new Point(0n, 0n);
    while (n > 0n) {
      if (n & 1n) {
        ans = pointAdd(ans, g);
      }
      g = pointAdd(g, g);
      n >>= 1n;
    }
    return ans;
  }
  function GenerateHEX(len) {
    var result = [];
    for (i = 0; i < len; i++) {
      let temp = Math.floor(Math.random() * 256).toString(16);
      if (temp.length == 1) {
        result[i] = "0" + temp;
      } else {
        result[i] = temp;
      }
    }
    return result.join("");
  }
  var BasePoint = new Point(basePoint.x, basePoint.y);
  function HEXtoNumber(HEX) {
    return BigInt("0x" + HEX);
  }
  function BigIntToBuffer(n = 0n) {
    var l = Math.ceil(n.toString(16).length / 2);
    var result = new Uint8Array(l);
    for (let i = l - 1; i >= 0; i--) {
      result[i] = Number(n % 256n);
      n = n / 256n;
    }
    return result;
  }
  function BufferToBigInt(b) {
    var r = 0n;
    b.forEach((e, i) => {
      r += BigInt(e);
      if (i == b.length - 1) return true;
      r *= 256n;
    });
    return r;
  }
  function concatBufs(bufs = []) {
    var totalLength = 0, result;
    for (const e of bufs) {
      totalLength += e.length;
    }
    result = new Uint8Array(totalLength);
    var position = 0;
    for (const e of bufs) {
      result.set(e, position);
      position += e.length;
    }
    return result;
  }
  function generatePrivateKey(exportable = true) {
    return new cryptoKey("private", exportable, HEXtoNumber(GenerateHEX(l)));
  }
  function getPublicKey(PrivateKey, exportable = true) {
    var entry = cryptoKeyMap.get(PrivateKey);
    if(typeof PrivateKey=="bigint"){
      return new cryptoKey("public", exportable, pointMul(PrivateKey, BasePoint));
    }else{
      return new cryptoKey("public", exportable, pointMul(entry.key, BasePoint));
    }
  }
  function genKeyPair(exportable = true) {
    var p = generatePrivateKey(exportable);
    return [p, getPublicKey(p, exportable)];
  }
  function sign(data, PrivateKey) {
    if(!cryptoKeyMap.has(PrivateKey))throw new Error("This cryptoKey cannot sign the data.");
    var entry = cryptoKeyMap.get(PrivateKey);
    var z = HEXtoNumber(hashFunction(data));
    var k = HEXtoNumber(GenerateHEX(256));
    var k_inverse = get_inverse(k, n);
    var kG = pointMul(k, BasePoint);
    var r = kG.x;
    var s = (k_inverse * (z + entry.key * r)) % n;
    var rB = addPad(hl, BigIntToBuffer(r)), sB = addPad(hl, BigIntToBuffer(s));
    return concatBufs([rB, sB]).buffer;
  }
  function verifysign(data, sign, PublicKey) {
    if(!cryptoKeyMap.has(PublicKey))throw new Error("This cryptoKey cannot verify the data.");
    var z = HEXtoNumber(hashFunction(data));
    var entry = cryptoKeyMap.get(PublicKey);
    sign = new Uint8Array(sign);
    var rB = sign.slice(0, hl), sB = sign.slice(hl, 2 * hl);
    var rrB = removePad(rB), rsB = removePad(sB);
    var r = BufferToBigInt(rrB), s = BufferToBigInt(rsB);
    var s_inverse = get_inverse(s, n);
    var u1 = (s_inverse * z) % n;
    var u2 = (s_inverse * r) % n;
    var p1 = pointMul(u1, BasePoint);
    var p2 = pointMul(u2, entry.key);
    var p3 = pointAdd(p1, p2);
    return p3.x === r;
  }
  return {
    generatePrivateKey,
    getPublicKey,
    generateKeyPair: genKeyPair,
    importKey,
    cryptoKey,
    ECDSA: {
      sign,
      verify: verifysign
    },
    PointTools: {
      basePoint,
      Point,
      uncompressPoint,
      pointAdd(pa, pb) { return pointAdd(pa, pb, a, p) },
      pointMul(n, pa) { return pointMul(n, pa, a, p) }
    }
  }
})