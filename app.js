const VERSION = 0;
const PACKAGEFILE = "./app.apkg";
const BACKUPPACKAGEFILE = "./app.backup.apkg";
const PUBLICKEY = "02f0251528c2917ad1bb93ccf455b6576435560b2c7571d3c3792accdb544b8781";
function moduleEntry(returnMethod) {
  //unpacker
  var unpack = (function () {
    var CryptoMine = (function () {
      const { createHash } = require('crypto');
      const hash = data => createHash('sha256').update(data).digest('hex');

      const ECC = function simpleECC(basePoint, a, b, p, n, l, hl, hashFunction) {
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
            hash
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
            return new jacobianPoint(0n, 0n, 1n);
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
          else if (sign instanceof ArrayBuffer) sign = new Uint8Array(sign);
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
      }
      return { hash, ECC };
    })();
    let { hash } = CryptoMine;
    let ECC = CryptoMine.ECC("secp256k1");
    let path = require("path");
    let root = path.resolve(".");
    function normalize(_path) {
      return "." + path.resolve(_path).substring(root.length);
    }
    const fromHEXString = hexString =>
      new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    /**
     * @param {Buffer|Uint8Array} package 
     */
    function read(currentVersion = VERSION, package, _PublicKey = PUBLICKEY) {
      let err = new Error();
      let Header;
      let fileheaderPointer = package.length - 1 - (Buffer.from(package).reverse().indexOf(10) - 1);
      let fileheaderBuf = package.subarray(fileheaderPointer);
      let fileheader = (new TextDecoder).decode(fileheaderBuf);
      try {
        Header = JSON.parse(fileheader);
      } catch {
        err.message = "错误:新版本文件头无效";
        throw err;
      }
      function isSigned() {
        var signed = false;
        var PublicKey = ECC.importKey(true, fromHEXString(_PublicKey).buffer);
        if (ECC.ECDSA.verify(`${Header.version}:${JSON.stringify(Header.entries)}`, fromHEXString(Header.sign), PublicKey)) {
          signed = true;
        }
        return signed;
      }
      var exception = [
        "key.pem",
        "cert.pem",
        "server",
        "property.js",
        "users",
        "workers"].map(e => normalize(e));
      var files = {};
      function verifyAndUnarchive() {
        var vaild = true;
        for (let metadataIndex in Header.entries) {
          metadataIndex = Number(metadataIndex);
          const metadata = Header.entries[metadataIndex];//[filename,hash,start,size]
          var filebuf = package.subarray(metadata[2], metadata[2] + metadata[3]);
          var checksum = hash(filebuf);
          var isok = metadata[1] === checksum;
          var _path = path.resolve(metadata[0]);
          if (!exception.find(f => normalize(_path).startsWith(f))) {
            if ((!_path.startsWith(path.resolve("."))) || !isok) {
              console.warn("校验错误:" + _path);
              vaild = false;
              break;
            }
            files[normalize(_path)] = filebuf;
          }
        }
        return vaild;
      }
      if (isSigned()) {
        if (Header.version < currentVersion) {
          err.message = "错误:软件包版本太旧";
          throw err;
        }
        if (!verifyAndUnarchive()) {
          err.message = "错误:文件损坏(校验值不符)";
          throw err;
        }
        return files;
      } else {
        err.message = "错误:新版本文件签名损坏";
        throw err;
      }
    }
    read.CryptoMine = CryptoMine;
    return read;
  })();
  let hooked = false;
  //Hook to modules
  let installHook = function () {
    if (hooked) return;
    hooked = true;
    const originalFsFuncs = {};
    const entries = unpack.apply(this, arguments);
    const path = require("path");
    const ReadableStream = require("stream").Readable;
    const root = path.resolve(".");
    const mod = require("module");
    const originalJSFunc = mod._extensions[".js"];
    const originalJSONFunc = mod._extensions[".json"];
    const textd = new TextDecoder;
    const originalResolve = mod._findPath;
    const exts = Object.keys(mod._extensions);
    const slash = normalize("./node_modules").substring(1, 2);
    const isDir = (filename) => Object.keys(entries).filter(e => e.startsWith(normalize(filename) + slash)).length != 0;
    function normalize(_path) {
      let result = path.resolve(_path).substring(root.length);
      if (!result) {
        return path.resolve(_path);
      }
      return "." + result;
    }
    const fs = require("fs");
    let backupFsFunc = fn => originalFsFuncs[fn] = fs[fn];
    ["readdirSync",
      "readFileSync",
      "writeFileSync",
      "createWriteStream",
      "createReadStream",
      "existsSync",
      "statSync",
      "lstatSync",
      "fstatSync"].forEach(e => backupFsFunc(e));
    fs.readFileSync = function (p, o) {
      if (typeof p === "string") {
        if (o === "utf8" || o === "utf-8") {
          return (new TextDecoder).decode(entries[normalize(p)]) || originalFsFuncs.readFileSync.apply(this, arguments);
        }
        return entries[normalize(p)] || originalFsFuncs.readFileSync.apply(this, arguments);
      }
    }
    function existsInPackage(p) {
      return (Object.keys(entries).filter(e => e.startsWith(normalize(p))).length > 0);
    }
    function writeMethod(originalFunction) {
      return function () {
        let p = arguments[0];
        if (typeof p === "string") {
          if (existsInPackage(path.dirname(p))) {
            if (isDir(path.dirname(p))) {
              fs.mkdirSync(path.dirname(p), { recursive: true });
            }
          }
          return originalFunction.apply(this, arguments);
        }
      }
    }
    fs.writeFileSync = writeMethod(originalFsFuncs.writeFileSync);
    fs.createReadStream = function (p, opts = {}) {
      let stream = new ReadableStream();
      let done = false;
      let data;
      try {
        data = fs.readFileSync(p);
      } catch {
        return originalFsFuncs.createReadStream.apply(this, arguments);
      }
      opts.start = opts.start || 0;
      opts.end = opts.end || 0;
      stream._read = function () {
        if (done) return undefined;
        done = true;
        this.push(data.subarray(opts.start, opts.end + 1));
        this.push(null);
      }
      return stream;
    }
    fs.createWriteStream = writeMethod(originalFsFuncs.createWriteStream);
    fs.existsSync = function (p) {
      return existsInPackage(p) || originalFsFuncs.existsSync.apply(this, arguments);
    }
    function statGenerator(originalFunction) {
      return function (p) {
        const _true = () => true;
        const _false = () => false;
        const zerotimeMs = 0;
        const zerotime = new Date(zerotimeMs);
        let result = {
          isFile: _true,
          isDirectory: _false,
          isBlockDevice: _false,
          isCharacterDevice: _false,
          isSymbolicLink: _false,
          isFIFO: _false,
          isSocket: _false,
          ino: 0,
          atimeMs: zerotimeMs,
          mtimeMs: zerotimeMs,
          ctimeMs: zerotimeMs,
          birthtime: zerotimeMs,
          atime: zerotime,
          mtime: zerotime,
          ctime: zerotime,
          birthtime: zerotime
        };
        if (existsInPackage(p)) {
          if (isDir(p)) {
            result.size = 0;
            result.isFile = _false;
            result.isDirectory = _true;
          } else {
            result.size = Uint8Array.from(fs.readFileSync(p)).length;
          }
          return result;
        } else {
          return originalFunction.apply(this, arguments);
        }
      }
    }
    ["statSync", "lstatSync", "fstatSync"].forEach(e => fs[e] = statGenerator(originalFsFuncs[e]));
    fs.readdirSync = function (p, o) {
      p = normalize(p);
      let level = p.split(slash).length;
      let inPackageFiles = Object.keys(entries).filter(e => e.startsWith(normalize(p) + slash)).map(e => path.resolve(e));
      let inPkgFileSet = new Set();
      inPackageFiles.forEach(function (a) {
        if (normalize(a).split(slash).length != level + 1) return false;
        inPkgFileSet.add(normalize(a).split(slash).pop());
      });
      let inPackage = [...inPkgFileSet];
      let originalResult;
      try {
        originalResult = originalFsFuncs.readdirSync.apply(this, arguments);
      } catch {
        originalResult = [];
      }
      var result = [...(new Set([...inPackage, ...originalResult]))];
      return result;
    };
    ["stat", "lstat", "fstat", "readdir", "exists"].forEach(function (fn) {
      fs[fn] = function (path, callback) {
        let result;
        try {
          result = fs[fn + "Sync"](path);
        } catch (e) {
          setImmediate(function () {
            callback(e);
          });
          return;
        }
        setImmediate(function () {
          callback(null, result);
        });
      };
    });
    ["readFile"].forEach(function (fn) {
      originalFsFuncs[fn] = fs[fn];
      fs[fn] = function (path, optArg, callback) {
        if (!callback) {
          callback = optArg;
          optArg = undefined;
        }
        let result;
        try {
          result = fs[fn + "Sync"](path, optArg);
        } catch (e) {
          setImmediate(function () {
            callback(e);
          });
          return;
        }
        setImmediate(function () {
          callback(null, result);
        });
      };
    });

    mod._extensions[".js"] = function (_module, filename) {
      let targetBuffer = entries[normalize(filename)];
      if (!targetBuffer) {
        targetBuffer = fs.readFileSync(filename)
        return originalJSFunc.apply(this, arguments);
      }
      let targetCode = textd.decode(targetBuffer);
      _module._compile(targetCode, filename);
    };
    mod._extensions[".json"] = function (_module, filename) {
      let targetBuffer = entries[normalize(filename)];
      if (!targetBuffer) {
        targetBuffer = fs.readFileSync(filename)
        return originalJSONFunc.apply(this, arguments);
      }
      let targetCode = textd.decode(targetBuffer);
      try {
        _module.exports = JSON.parse(targetCode);
      } catch (e) {
        err.message = filename + ': ' + err.message;
        throw err;
      }
    };
    const originalLookup = mod._resolveLookupPaths;
    mod._resolveLookupPaths = function () {
      var result = originalLookup.apply(this, arguments);
      return result;
    }
    mod._findPath = function () {
      arguments[1] = arguments[1].map(e => path.resolve(e));
      arguments[1] = arguments[1].filter(e => e.startsWith(root));
      var result = originalResolve.apply(this, arguments);
      if (result) return result;
      function tryExtensions(_base) {
        for (let i of exts) {
          if (entries[normalize(_base + i)]) {
            return _base + i;
          }
        }
        return false;
      }
      for (let e of arguments[1]) {
        let base = path.resolve(e, arguments[0]);
        if (isDir(base)) {
          let pkgpath = normalize(path.resolve(base, "package.json"));
          let entry;
          if (entries[pkgpath]) {
            let pkg = JSON.parse(entries[pkgpath].toString());
            entry = normalize(path.resolve(base, (pkg.main || "./index.js")));
            let isSubDir = Object.keys(entries).filter(e => e.startsWith(normalize(entry) + slash)).length != 0;
            if (isSubDir) {
              entry = path.resolve(entry, "./index");
            }
            if (!path.extname(entry)) {
              entry = tryExtensions(entry);
            }
            entry = normalize(entry);
          } else {
            entry = normalize(path.resolve(base, ("./index.js")));
            if (!path.extname(entry)) {
              entry = tryExtensions(entry);
            };
          }
          if (entries[entry]) return entry;
        }
        let ext = tryExtensions(base);
        if (ext) return ext;
        if (entries[normalize(base)]) {
          return base;
        }
      }
      return result;
    }
    function uninstall() {
      if (!hooked) return;
      hooked = false;
      mod._extensions[".js"] = originalJSFunc;
      mod._extensions[".json"] = originalJSONFunc;
      mod._findPath = originalResolve;
      Object.keys(originalFsFuncs).forEach(e => fs[e] = originalFsFuncs[e]);
      originalFsFuncs.length = 0;
      return true;
    }
    return uninstall;
  };
  if (returnMethod) {
    return installHook;
  } else {
    module.exports = installHook;
  }
}
function CLIEntry() {
  return ((process.send) ? AppEntry : DaemonEntry).apply(this, arguments);
}
function DaemonEntry() {
  var cp = require("child_process");
  var instance = cp.fork("./helper/packer/packer.js");
  process.on("SIGINT", function () { });
  function exithandler(code) {
    if (code === null) {

    } else if (code !== 255) {
      process.exit(code);
    }
  }
  var ProcessClosed = new WeakSet();
  function handler(msg) {
    if (typeof msg !== "object") { return; }
    if (msg.restart) {
      instance.on("close", function () {
        ProcessClosed.add(instance)
      })
      instance.off("close", exithandler);
      setTimeout(function _() {
        if (!ProcessClosed.has(instance)) {
          setTimeout(_, 100);
          return;
        }
        instance = cp.fork(msg.restart)
        instance.on("message", handler);
        instance.on("close", exithandler);
      }, 0);
    }
  }
  instance.on("message", handler);
  instance.on("close", exithandler);
}
function AppEntry() {
  let sharedObject = {};
  module.exports = sharedObject;
  let fs = require("fs");
  const existsFile = {
    PACKAGEFILE: fs.existsSync(PACKAGEFILE),
    BACKUPPACKAGEFILE: fs.existsSync(BACKUPPACKAGEFILE),
  };
  try {
    if (existsFile.PACKAGEFILE) {
      sharedObject.mode = "normal";
      sharedObject.PACKAGEFILE = PACKAGEFILE;
      moduleEntry(true)(VERSION, fs.readFileSync(PACKAGEFILE), PUBLICKEY); //安装文件钩子
    } else {
      throw new Error("错误:无法找到新版本文件");
    }
  } catch (error) {
    console.error(error);
    if (existsFile.BACKUPPACKAGEFILE) {
      sharedObject.mode = "recovery";
      sharedObject.PACKAGEFILE = BACKUPPACKAGEFILE;
      moduleEntry(true)(VERSION, fs.readFileSync(BACKUPPACKAGEFILE), PUBLICKEY); //安装文件钩子
    } else {
      throw new Error("错误:无法找到备份版本文件");
    }
  }
  return require("./_app");
}
return ((require.main !== module) ? moduleEntry : CLIEntry)(); //Return on the top-level;