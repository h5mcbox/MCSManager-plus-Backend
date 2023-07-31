const VERSION = 0;
const PACKAGEFILE = "./app.apkg";
const BACKUPPACKAGEFILE = "./app.backup.apkg";
const PUBLICKEY = "02f0251528c2917ad1bb93ccf455b6576435560b2c7571d3c3792accdb544b8781";
function moduleEntry(returnMethod) {
  //unpacker
  var unpack = (function () {
    var CryptoMine = (function () {
      /**
       * [js-sha256]{@link https://github.com/emn178/js-sha256}
       *
       * @version 0.9.0
       * @author Chen, Yi-Cyuan [emn178@gmail.com]
       * @copyright Chen, Yi-Cyuan 2014-2017
       * @license MIT
       */
      /*jslint bitwise: true */
      var hash = (function () {
        'use strict';

        var ERROR = 'input is invalid type';
        var WINDOW = typeof window === 'object';
        var root = WINDOW ? window : {};
        if (root.JS_SHA256_NO_WINDOW) {
          WINDOW = false;
        }
        var WEB_WORKER = !WINDOW && typeof self === 'object';
        var NODE_JS = !root.JS_SHA256_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
        if (NODE_JS) {
          root = global;
        } else if (WEB_WORKER) {
          root = self;
        }
        var ARRAY_BUFFER = !root.JS_SHA256_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
        var HEX_CHARS = '0123456789abcdef'.split('');
        var EXTRA = [-2147483648, 8388608, 32768, 128];
        var SHIFT = [24, 16, 8, 0];
        var K = [
          0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
          0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
          0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
          0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
          0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
          0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
          0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
          0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];
        var OUTPUT_TYPES = ['hex', 'array', 'digest', 'arrayBuffer'];

        var blocks = [];

        if (root.JS_SHA256_NO_NODE_JS || !Array.isArray) {
          Array.isArray = function (obj) {
            return Object.prototype.toString.call(obj) === '[object Array]';
          };
        }

        if (ARRAY_BUFFER && (root.JS_SHA256_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
          ArrayBuffer.isView = function (obj) {
            return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
          };
        }

        var createOutputMethod = function (outputType, is224) {
          return function (message) {
            return new Sha256(is224, true).update(message)[outputType]();
          };
        };

        var createMethod = function (is224) {
          var method = createOutputMethod('hex', is224);
          if (NODE_JS) {
            method = nodeWrap(method, is224);
          }
          method.create = function () {
            return new Sha256(is224);
          };
          method.update = function (message) {
            return method.create().update(message);
          };
          for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
            var type = OUTPUT_TYPES[i];
            method[type] = createOutputMethod(type, is224);
          }
          return method;
        };

        var nodeWrap = function (method, is224) {
          var crypto = eval("require('crypto')");
          var Buffer = eval("require('buffer').Buffer");
          var algorithm = is224 ? 'sha224' : 'sha256';
          var nodeMethod = function (message) {
            if (typeof message === 'string') {
              return crypto.createHash(algorithm).update(message, 'utf8').digest('hex');
            } else {
              if (message === null || message === undefined) {
                throw new Error(ERROR);
              } else if (message.constructor === ArrayBuffer) {
                message = new Uint8Array(message);
              }
            }
            if (Array.isArray(message) || ArrayBuffer.isView(message) ||
              message.constructor === Buffer) {
              return crypto.createHash(algorithm).update(Buffer.from(message)).digest('hex');
            } else {
              return method(message);
            }
          };
          return nodeMethod;
        };

        var createHmacOutputMethod = function (outputType, is224) {
          return function (key, message) {
            return new HmacSha256(key, is224, true).update(message)[outputType]();
          };
        };

        var createHmacMethod = function (is224) {
          var method = createHmacOutputMethod('hex', is224);
          method.create = function (key) {
            return new HmacSha256(key, is224);
          };
          method.update = function (key, message) {
            return method.create(key).update(message);
          };
          for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
            var type = OUTPUT_TYPES[i];
            method[type] = createHmacOutputMethod(type, is224);
          }
          return method;
        };

        function Sha256(is224, sharedMemory) {
          if (sharedMemory) {
            blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
              blocks[4] = blocks[5] = blocks[6] = blocks[7] =
              blocks[8] = blocks[9] = blocks[10] = blocks[11] =
              blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
            this.blocks = blocks;
          } else {
            this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          }

          if (is224) {
            this.h0 = 0xc1059ed8;
            this.h1 = 0x367cd507;
            this.h2 = 0x3070dd17;
            this.h3 = 0xf70e5939;
            this.h4 = 0xffc00b31;
            this.h5 = 0x68581511;
            this.h6 = 0x64f98fa7;
            this.h7 = 0xbefa4fa4;
          } else { // 256
            this.h0 = 0x6a09e667;
            this.h1 = 0xbb67ae85;
            this.h2 = 0x3c6ef372;
            this.h3 = 0xa54ff53a;
            this.h4 = 0x510e527f;
            this.h5 = 0x9b05688c;
            this.h6 = 0x1f83d9ab;
            this.h7 = 0x5be0cd19;
          }

          this.block = this.start = this.bytes = this.hBytes = 0;
          this.finalized = this.hashed = false;
          this.first = true;
          this.is224 = is224;
        }

        Sha256.prototype.update = function (message) {
          if (this.finalized) {
            return;
          }
          var notString, type = typeof message;
          if (type !== 'string') {
            if (type === 'object') {
              if (message === null) {
                throw new Error(ERROR);
              } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
                message = new Uint8Array(message);
              } else if (!Array.isArray(message)) {
                if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
                  throw new Error(ERROR);
                }
              }
            } else {
              throw new Error(ERROR);
            }
            notString = true;
          }
          var code, index = 0, i, length = message.length, blocks = this.blocks;

          while (index < length) {
            if (this.hashed) {
              this.hashed = false;
              blocks[0] = this.block;
              blocks[16] = blocks[1] = blocks[2] = blocks[3] =
                blocks[4] = blocks[5] = blocks[6] = blocks[7] =
                blocks[8] = blocks[9] = blocks[10] = blocks[11] =
                blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
            }

            if (notString) {
              for (i = this.start; index < length && i < 64; ++index) {
                blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
              }
            } else {
              for (i = this.start; index < length && i < 64; ++index) {
                code = message.charCodeAt(index);
                if (code < 0x80) {
                  blocks[i >> 2] |= code << SHIFT[i++ & 3];
                } else if (code < 0x800) {
                  blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
                  blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                } else if (code < 0xd800 || code >= 0xe000) {
                  blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
                  blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
                  blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                } else {
                  code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
                  blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
                  blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
                  blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
                  blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                }
              }
            }

            this.lastByteIndex = i;
            this.bytes += i - this.start;
            if (i >= 64) {
              this.block = blocks[16];
              this.start = i - 64;
              this.hash();
              this.hashed = true;
            } else {
              this.start = i;
            }
          }
          if (this.bytes > 4294967295) {
            this.hBytes += this.bytes / 4294967296 << 0;
            this.bytes = this.bytes % 4294967296;
          }
          return this;
        };

        Sha256.prototype.finalize = function () {
          if (this.finalized) {
            return;
          }
          this.finalized = true;
          var blocks = this.blocks, i = this.lastByteIndex;
          blocks[16] = this.block;
          blocks[i >> 2] |= EXTRA[i & 3];
          this.block = blocks[16];
          if (i >= 56) {
            if (!this.hashed) {
              this.hash();
            }
            blocks[0] = this.block;
            blocks[16] = blocks[1] = blocks[2] = blocks[3] =
              blocks[4] = blocks[5] = blocks[6] = blocks[7] =
              blocks[8] = blocks[9] = blocks[10] = blocks[11] =
              blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
          }
          blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
          blocks[15] = this.bytes << 3;
          this.hash();
        };

        Sha256.prototype.hash = function () {
          var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6,
            h = this.h7, blocks = this.blocks, j, s0, s1, maj, t1, t2, ch, ab, da, cd, bc;

          for (j = 16; j < 64; ++j) {
            // rightrotate
            t1 = blocks[j - 15];
            s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3);
            t1 = blocks[j - 2];
            s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10);
            blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0;
          }

          bc = b & c;
          for (j = 0; j < 64; j += 4) {
            if (this.first) {
              if (this.is224) {
                ab = 300032;
                t1 = blocks[0] - 1413257819;
                h = t1 - 150054599 << 0;
                d = t1 + 24177077 << 0;
              } else {
                ab = 704751109;
                t1 = blocks[0] - 210244248;
                h = t1 - 1521486534 << 0;
                d = t1 + 143694565 << 0;
              }
              this.first = false;
            } else {
              s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
              s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
              ab = a & b;
              maj = ab ^ (a & c) ^ bc;
              ch = (e & f) ^ (~e & g);
              t1 = h + s1 + ch + K[j] + blocks[j];
              t2 = s0 + maj;
              h = d + t1 << 0;
              d = t1 + t2 << 0;
            }
            s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10));
            s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7));
            da = d & a;
            maj = da ^ (d & b) ^ ab;
            ch = (h & e) ^ (~h & f);
            t1 = g + s1 + ch + K[j + 1] + blocks[j + 1];
            t2 = s0 + maj;
            g = c + t1 << 0;
            c = t1 + t2 << 0;
            s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10));
            s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7));
            cd = c & d;
            maj = cd ^ (c & a) ^ da;
            ch = (g & h) ^ (~g & e);
            t1 = f + s1 + ch + K[j + 2] + blocks[j + 2];
            t2 = s0 + maj;
            f = b + t1 << 0;
            b = t1 + t2 << 0;
            s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10));
            s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7));
            bc = b & c;
            maj = bc ^ (b & d) ^ cd;
            ch = (f & g) ^ (~f & h);
            t1 = e + s1 + ch + K[j + 3] + blocks[j + 3];
            t2 = s0 + maj;
            e = a + t1 << 0;
            a = t1 + t2 << 0;
          }

          this.h0 = this.h0 + a << 0;
          this.h1 = this.h1 + b << 0;
          this.h2 = this.h2 + c << 0;
          this.h3 = this.h3 + d << 0;
          this.h4 = this.h4 + e << 0;
          this.h5 = this.h5 + f << 0;
          this.h6 = this.h6 + g << 0;
          this.h7 = this.h7 + h << 0;
        };

        Sha256.prototype.hex = function () {
          this.finalize();

          var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
            h6 = this.h6, h7 = this.h7;

          var hex = HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
            HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
            HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
            HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
            HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
            HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
            HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
            HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
            HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
            HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
            HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
            HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
            HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] +
            HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
            HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
            HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
            HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] +
            HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] +
            HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] +
            HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F] +
            HEX_CHARS[(h5 >> 28) & 0x0F] + HEX_CHARS[(h5 >> 24) & 0x0F] +
            HEX_CHARS[(h5 >> 20) & 0x0F] + HEX_CHARS[(h5 >> 16) & 0x0F] +
            HEX_CHARS[(h5 >> 12) & 0x0F] + HEX_CHARS[(h5 >> 8) & 0x0F] +
            HEX_CHARS[(h5 >> 4) & 0x0F] + HEX_CHARS[h5 & 0x0F] +
            HEX_CHARS[(h6 >> 28) & 0x0F] + HEX_CHARS[(h6 >> 24) & 0x0F] +
            HEX_CHARS[(h6 >> 20) & 0x0F] + HEX_CHARS[(h6 >> 16) & 0x0F] +
            HEX_CHARS[(h6 >> 12) & 0x0F] + HEX_CHARS[(h6 >> 8) & 0x0F] +
            HEX_CHARS[(h6 >> 4) & 0x0F] + HEX_CHARS[h6 & 0x0F];
          if (!this.is224) {
            hex += HEX_CHARS[(h7 >> 28) & 0x0F] + HEX_CHARS[(h7 >> 24) & 0x0F] +
              HEX_CHARS[(h7 >> 20) & 0x0F] + HEX_CHARS[(h7 >> 16) & 0x0F] +
              HEX_CHARS[(h7 >> 12) & 0x0F] + HEX_CHARS[(h7 >> 8) & 0x0F] +
              HEX_CHARS[(h7 >> 4) & 0x0F] + HEX_CHARS[h7 & 0x0F];
          }
          return hex;
        };

        Sha256.prototype.toString = Sha256.prototype.hex;

        Sha256.prototype.digest = function () {
          this.finalize();

          var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
            h6 = this.h6, h7 = this.h7;

          var arr = [
            (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,
            (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,
            (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,
            (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,
            (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF,
            (h5 >> 24) & 0xFF, (h5 >> 16) & 0xFF, (h5 >> 8) & 0xFF, h5 & 0xFF,
            (h6 >> 24) & 0xFF, (h6 >> 16) & 0xFF, (h6 >> 8) & 0xFF, h6 & 0xFF
          ];
          if (!this.is224) {
            arr.push((h7 >> 24) & 0xFF, (h7 >> 16) & 0xFF, (h7 >> 8) & 0xFF, h7 & 0xFF);
          }
          return arr;
        };

        Sha256.prototype.array = Sha256.prototype.digest;

        Sha256.prototype.arrayBuffer = function () {
          this.finalize();

          var buffer = new ArrayBuffer(this.is224 ? 28 : 32);
          var dataView = new DataView(buffer);
          dataView.setUint32(0, this.h0);
          dataView.setUint32(4, this.h1);
          dataView.setUint32(8, this.h2);
          dataView.setUint32(12, this.h3);
          dataView.setUint32(16, this.h4);
          dataView.setUint32(20, this.h5);
          dataView.setUint32(24, this.h6);
          if (!this.is224) {
            dataView.setUint32(28, this.h7);
          }
          return buffer;
        };

        function HmacSha256(key, is224, sharedMemory) {
          var i, type = typeof key;
          if (type === 'string') {
            var bytes = [], length = key.length, index = 0, code;
            for (i = 0; i < length; ++i) {
              code = key.charCodeAt(i);
              if (code < 0x80) {
                bytes[index++] = code;
              } else if (code < 0x800) {
                bytes[index++] = (0xc0 | (code >> 6));
                bytes[index++] = (0x80 | (code & 0x3f));
              } else if (code < 0xd800 || code >= 0xe000) {
                bytes[index++] = (0xe0 | (code >> 12));
                bytes[index++] = (0x80 | ((code >> 6) & 0x3f));
                bytes[index++] = (0x80 | (code & 0x3f));
              } else {
                code = 0x10000 + (((code & 0x3ff) << 10) | (key.charCodeAt(++i) & 0x3ff));
                bytes[index++] = (0xf0 | (code >> 18));
                bytes[index++] = (0x80 | ((code >> 12) & 0x3f));
                bytes[index++] = (0x80 | ((code >> 6) & 0x3f));
                bytes[index++] = (0x80 | (code & 0x3f));
              }
            }
            key = bytes;
          } else {
            if (type === 'object') {
              if (key === null) {
                throw new Error(ERROR);
              } else if (ARRAY_BUFFER && key.constructor === ArrayBuffer) {
                key = new Uint8Array(key);
              } else if (!Array.isArray(key)) {
                if (!ARRAY_BUFFER || !ArrayBuffer.isView(key)) {
                  throw new Error(ERROR);
                }
              }
            } else {
              throw new Error(ERROR);
            }
          }

          if (key.length > 64) {
            key = (new Sha256(is224, true)).update(key).array();
          }

          var oKeyPad = [], iKeyPad = [];
          for (i = 0; i < 64; ++i) {
            var b = key[i] || 0;
            oKeyPad[i] = 0x5c ^ b;
            iKeyPad[i] = 0x36 ^ b;
          }

          Sha256.call(this, is224, sharedMemory);

          this.update(iKeyPad);
          this.oKeyPad = oKeyPad;
          this.inner = true;
          this.sharedMemory = sharedMemory;
        }
        HmacSha256.prototype = new Sha256();

        HmacSha256.prototype.finalize = function () {
          Sha256.prototype.finalize.call(this);
          if (this.inner) {
            this.inner = false;
            var innerHash = this.array();
            Sha256.call(this, this.is224, this.sharedMemory);
            this.update(this.oKeyPad);
            this.update(innerHash);
            Sha256.prototype.finalize.call(this);
          }
        };

        var exports = createMethod();
        exports.sha256 = exports;
        exports.sha224 = createMethod(true);
        exports.sha256.hmac = createHmacMethod();
        exports.sha224.hmac = createHmacMethod(true);

        return exports;
      })();

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
            (function () {
              if (typeof sha256 === "function") {
                return globalThis.sha256;
              } else if (typeof require === "function") {
                return require("js-sha256");
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
            let KeyProxy = new Proxy.revocable(KeyDescription, {});
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
      }
      return { hash, ECC };
    })();
    var { hash } = CryptoMine;
    var ECC = CryptoMine.ECC("secp256k1")
    var path = require("path");
    var root = path.resolve(".");
    function normalize(_path) {
      return "." + path.resolve(_path).substring(root.length);
    }
    var fs = require("fs");
    const fromHEXString = hexString =>
      new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    function read(currentVersion = VERSION, packageFile = PACKAGEFILE, _PublicKey = PUBLICKEY) {
      let err = new Error();
      let filesbuf, Header;
      if (fs.existsSync(packageFile)) {
        filesbuf = fs.readFileSync(packageFile);
      } else {
        err.message = "错误:无法找到新版本文件";
        throw err;
      }
      let fileheaderPointer = filesbuf.length - 1 - (Buffer.from(filesbuf).reverse().indexOf(10) - 1);
      let fileheaderBuf = filesbuf.subarray(fileheaderPointer);
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
        if (ECC.ECDSA.verify(`${Header.version}:${JSON.stringify(Header.entries)}`, fromHEXString(Header.sign).buffer, PublicKey)) {
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
      function verifyAndUnzip() {
        var vaild = true;
        for (let metadataIndex in Header.entries) {
          metadataIndex = Number(metadataIndex);
          const metadata = Header.entries[metadataIndex];//[filename,hash,start,size]
          var filebuf = filesbuf.subarray(metadata[2], metadata[2] + metadata[3]);
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
        if (!verifyAndUnzip()) {
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
      if (module.id.includes("fs")) throw "asd";
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
  try {
    sharedObject.mode = "normal";
    sharedObject.PACKAGEFILE = PACKAGEFILE;
    moduleEntry(true)(VERSION, PACKAGEFILE, PUBLICKEY); //安装文件钩子
  } catch (error) {
    console.error(error);
    sharedObject.mode = "recovery";
    sharedObject.PACKAGEFILE = BACKUPPACKAGEFILE;
    moduleEntry(true)(VERSION, BACKUPPACKAGEFILE, PUBLICKEY); //安装文件钩子
  }
  return require("./_app");
}
return ((require.main !== module) ? moduleEntry : CLIEntry)(); //Return on the top-level;