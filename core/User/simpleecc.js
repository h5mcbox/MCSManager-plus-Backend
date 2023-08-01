(function (simpleECC) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = simpleECC;
  } else if (typeof window !== "undefined") {
    window.simpleECC = simpleECC;
  }
  return simpleECC;
})(function simpleECC(basePoint, a, b, p, n, l, hl, hashFunction) {
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
        if (typeof sha256 === "function") {
          return globalThis.sha256;
        } else if (typeof require === "function") {
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
  let cryptoKeyMap = new WeakMap();
  function importKey(exportable, Key) {
    if (!((Key instanceof ArrayBuffer) || (Key instanceof Uint8Array))) throw new Error("You can't import key because Key is not a instance of ArrayBuffer or a Uint8Array");
    if (Key instanceof ArrayBuffer) Key = new Uint8Array(Key);
    let type;
    if (Key[0] == 5) {
      type = "private";
    } else if (Key[0] == 2 || Key[0] == 3) {
      type = "public";
    } else {
      throw new Error("Unknown key type.");
    }
    if (type === "private") {
      let pk = BufferToBigInt(Key.slice(1));
      return new cryptoKey(type, exportable, pk);
    } else if (type === "public") {
      let keyx = BufferToBigInt(Key.slice(1));
      return new cryptoKey(type, exportable, uncompressPoint(keyx, !(Key[0] % 2)));
    }
  }
  class cryptoKey {
    type;
    exportable;
    revokeKey;
    exportKey(getPoint) {
      let entry = cryptoKeyMap.get(this);
      if (!entry.exportable) throw "You can't export this key.";
      if (getPoint) return entry.key;
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
      let KeyDescription = { type, key, exportable };
      let KeyProxy = Proxy.revocable(KeyDescription, {});
      this.revokeKey = KeyProxy.revoke;
      Object.freeze(this);
      cryptoKeyMap.set(this, KeyProxy.proxy);
    }
  }
  //There passed curve check for performance
  function modPow(b, e, m) {
    if (m == 1n) {
      return 0;
    } else {
      let r = 1n;
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
  let p1 = (p + 1n) / 4n; //Pre-compute (P+1)/4
  function uncompressPoint(x, canDevideBy2) {
    let c = x ** 3n + a * x + b;
    let y = modPow(c, p1, p);
    return new Point(x, (!(y % 2n) === canDevideBy2) ? y : p - y);
  }
  function get_inverse(b, p) {
    function get_inv(x, y, p) {
      return x <= 1n ? 1n : get_inv(y % x, y, p) * (y - y / x) % p;
    }
    return get_inv(b % p, p, p);
  }
  function addPad(l = 0, u) {
    if (u.length > l) throw new Error("PadingError");
    let r = new Uint8Array(l);
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
  function mod(a, b) {
    let t = a % b;
    return t >= 0 ? t : b + t;
  }
  class Point {
    constructor(x = 0n, y = 0n) {
      this.x = x;
      this.y = y;
    }
  }

  function pointAdd(p, q) {
    return fromJacobian(jacobianAdd(toJacobian(p), toJacobian(q)));
  };
  function pointMul(n, p) {
    return fromJacobian(jacobianMultiply(toJacobian(p), n));
  };
  /**
   * @param {Point} pA 
   * @returns {jacobianPoint}
   */
  function toJacobian(pA) {
    return new jacobianPoint(pA.x, pA.y, 1n);
  };
  /**
   * @param {jacobianPoint} pA 
   * @returns {Point}
   */
  function fromJacobian(pA) {
    let z = get_inverse(pA.z, p);
    let point = new Point(
      mod(pA.x * (z ** 2n), p),
      mod(pA.y * (z ** 3n), p)
    );
    return point;
  };
  class jacobianPoint {
    constructor(x = 0n, y = 0n, z = 0n) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }
  /**
   * 
   * @param {jacobianPoint} pA 
   * @returns {jacobianPoint}
   */
  function jacobianDouble(pA) {
    if (pA.y == 0) {
      return new jacobianPoint(0n, 0n, 0n);
    };
    let r = mod(3n * pA.x ** 2n + a * pA.z ** 4n, p);
    let y2 = mod(pA.y ** 2n, p);
    let t = mod(4n * pA.x * y2, p);
    let x = mod(r ** 2n - 2n * t, p);
    let y = mod(r * (t - x) - 8n * y2 ** 2n, p);
    let z = mod(2n * pA.y * pA.z, p);
    return new jacobianPoint(x, y, z);
  };

  /**
   * 
   * @param {jacobianPoint} pA 
   * @param {jacobianPoint} pB 
   * @returns {jacobianPoint}
   */
  function jacobianAdd(pA, pB) {
    if (pA.y == 0n) {
      return pB;
    };
    if (pB.y == 0n) {
      return pA;
    };
    let yBzA3 = mod(pB.y * (pA.z ** 3n), p);
    let yAzB3 = mod(pA.y * (pB.z ** 3n), p);
    let u = yBzA3 - yAzB3;
    let xAzB2 = mod(pA.x * (pB.z ** 2n), p);
    let xBzA2 = mod(pB.x * (pA.z ** 2n), p);
    let v = xBzA2 - xAzB2;
    if (xAzB2 === xBzA2) {
      if (yAzB3 === yBzA3) {
        return jacobianDouble(pA);
      } else {
        return new jacobianPoint(0n, 0n, 1n);
      }
    }
    let v2 = mod(v * v, p);
    let v3 = mod(v2 * v, p);
    let xAzB2v2 = mod(xAzB2 * v2, p);
    let x = mod(u ** 2n - v3 - 2n * xAzB2v2, p);
    let y = mod(u * (xAzB2v2 - x) - pA.y * (pB.z ** 3n) * (v3), p);
    let z = mod(v * pA.z * pB.z, p);
    return new jacobianPoint(x, y, z);
  };
  function jacobianMultiply(pA, k) {
    if (pA.y === 0n || k === 0n) {
      return new Point(0n, 0n, 1n);
    };
    if (k === 1n) {
      return pA;
    };
    if (k < 0n || k >= n) {
      return jacobianMultiply(pA, mod(k, n));
    };
    let nextLevel = jacobianDouble(jacobianMultiply(pA, k / 2n));
    if (mod(k, 2n) === 0n) {
      return nextLevel;
    };
    if (mod(k, 2n) === 1n) {
      return jacobianAdd(nextLevel, pA);
    };
    throw new Error(`unexcept number or point.`);
  };
  function GenerateHEX(len) {
    let result = [];
    for (let i = 0; i < len; i++) {
      let temp = Math.floor(Math.random() * 256).toString(16);
      if (temp.length == 1) {
        result[i] = "0" + temp;
      } else {
        result[i] = temp;
      }
    }
    return result.join("");
  }
  let BasePoint = new Point(basePoint.x, basePoint.y);
  function HEXtoNumber(HEX) {
    return BigInt("0x" + HEX);
  }
  function BigIntToBuffer(n = 0n) {
    let l = Math.ceil(n.toString(16).length / 2);
    let result = new Uint8Array(l);
    for (let i = l - 1; i >= 0; i--) {
      result[i] = Number(n % 256n);
      n = n / 256n;
    }
    return result;
  }
  function BufferToBigInt(b) {
    let r = 0n;
    b.forEach((e, i) => {
      r += BigInt(e);
      if (i == b.length - 1) return true;
      r *= 256n;
    });
    return r;
  }
  function concatBufs(bufs = []) {
    let totalLength = 0, result;
    for (const e of bufs) {
      totalLength += e.length;
    }
    result = new Uint8Array(totalLength);
    let position = 0;
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
    let entry = cryptoKeyMap.get(PrivateKey);
    if (typeof PrivateKey == "bigint") {
      return new cryptoKey("public", exportable, pointMul(PrivateKey, BasePoint));
    } else {
      return new cryptoKey("public", exportable, pointMul(entry.key, BasePoint));
    }
  }
  function genKeyPair(exportable = true) {
    let p = generatePrivateKey(exportable);
    return [p, getPublicKey(p, exportable)];
  }
  function sign(data, PrivateKey) {
    if (!cryptoKeyMap.has(PrivateKey)) throw new Error("This cryptoKey cannot sign the data.");
    let entry = cryptoKeyMap.get(PrivateKey);
    let z = HEXtoNumber(hashFunction(data));
    let k = HEXtoNumber(GenerateHEX(256));
    let k_inverse = get_inverse(k, n);
    let kG = pointMul(k, BasePoint);
    let r = kG.x;
    let s = (k_inverse * (z + entry.key * r)) % n;
    let rB = addPad(hl, BigIntToBuffer(r)), sB = addPad(hl, BigIntToBuffer(s));
    return concatBufs([rB, sB]).buffer;
  }
  function verifysign(data, sign, PublicKey) {
    if (!cryptoKeyMap.has(PublicKey)) throw new Error("This cryptoKey cannot verify the data.");
    let z = HEXtoNumber(hashFunction(data));
    let entry = cryptoKeyMap.get(PublicKey);
    if (Buffer && sign instanceof Buffer) sign = new Uint8Array(sign);
    let rB = sign.slice(0, hl), sB = sign.slice(hl, 2 * hl);
    let rrB = removePad(rB), rsB = removePad(sB);
    let r = BufferToBigInt(rrB), s = BufferToBigInt(rsB);
    let s_inverse = get_inverse(s, n);
    let u1 = (s_inverse * z) % n;
    let u2 = (s_inverse * r) % n;
    let p1 = pointMul(u1, BasePoint);
    let p2 = pointMul(u2, entry.key);
    let p3 = pointAdd(p1, p2);
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
});