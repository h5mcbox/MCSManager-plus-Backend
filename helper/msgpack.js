(function (msgpack) {
  if (typeof module !== "undefined") {
    module.exports = msgpack();
  } else if (typeof window !== "undefined") {
    window[msgpack.name] = msgpack();
  }
})(function msgpack() {
  function inRange(num = 0, a = 0, b = 0) {
    return a <= num && num <= b;
  }
  const pow32 = 0x100000000;
  /**
   * @param {*} data 
   * @returns {Uint8Array}
   */
  function encode(data, opts = {}) {
    const { multiple = false } = opts;
    if (multiple && !Array.isArray(data)) throw new Error("Except array to serialize multiple values.");
    /** @type {Uint8Array[]} */
    let buffers = [];
    /**
     * @param {Array|Uint8Array} buf 
     */
    function appendBytes(buf) {
      if (buf instanceof Uint8Array) {
        buffers.push(buf);
        return;
      }
      let buffer = new Uint8Array(buf.length);
      buffer.set(buf, 0);
      buffers.push(buf);
      return;
    }
    function appendNull() {
      appendBytes([0xc0]);
    }
    function appendBoolean(bool = false) {
      appendBytes([bool ? 0xc3 : 0xc2]);
    }
    function encodeUint16(num) {
      let buf = new Uint8Array(2)
      buf[0] = Number(num) >>> 8;
      buf[1] = Number(num) >>> 0;
      return buf;
    }
    function encodeUint32(num) {
      let buf = new Uint8Array(4)
      buf[0] = Number(num) >>> 24;
      buf[1] = Number(num) >>> 16;
      buf[2] = Number(num) >>> 8;
      buf[3] = Number(num) >>> 0;
      return buf;
    }
    /**
     * @param {Number|BigInt} num 
     */
    function appendNumber(num = 0) {
      if ((typeof num === "number" && Math.floor(num) == num) || typeof num === "bigint") {
        if (inRange(num, -0x20, 0x7f)) { //fixint
          appendBytes([Number(num)]);
        } else if (inRange(num, 0, 0xff)) { //uint8
          appendBytes([0xcc, num]);
        } else if (inRange(num, 0, 0xffff)) { //uint16
          appendBytes([0xcd, ...encodeUint16(num)]);
        } else if (inRange(num, 0, 0xffffffff)) { //uint32
          appendBytes([0xce, ...encodeUint32(num)]);
        } else if (inRange(num, 0, 0xffffffffffffffffn)) { //uint64
          let bufView = new DataView(new ArrayBuffer(8));
          bufView.setBigUint64(0, BigInt(num));
          appendBytes([0xcf, ...new Uint8Array(bufView.buffer)]);
        } else if (inRange(num, -0x80, 0x7f)) { //int8
          appendBytes([0xd0, num]);
        } else if (inRange(num, -0x8000, 0x7fff)) { //int16
          appendBytes([0xd1, ...encodeUint16(num)]);
        } else if (inRange(num, -0x80000000, 0x7fffffff)) { //int32
          appendBytes([0xd2, ...encodeUint32(num)]);
        } else if (inRange(num, -0x8000000000000000n, 0x7fffffffffffffffn)) { //int64
          let bufView = new DataView(new ArrayBuffer(8));
          bufView.setBigInt64(0, BigInt(num));
          appendBytes([0xd3, ...new Uint8Array(bufView.buffer)]);
        } else {
          throw new Error("Over (U)INT Range");
        }
      } else {
        let bufView = new DataView(new ArrayBuffer(8));
        bufView.setFloat64(0, num);
        appendBytes([0xcb, ...new Uint8Array(bufView.buffer)]);
      }
    }
    /**
     * @param {String} str 
     */
    function appendString(str) {
      let strBuf = (new TextEncoder).encode(str);
      let strLength = strBuf.length;
      if (inRange(strLength, 0, 0x1f)) {
        appendBytes([0xa0 + strLength]);
      } else if (inRange(strLength, 0, 0xff)) {
        appendBytes([0xd9, strLength]);
      } else if (inRange(strLength, 0, 0xffff)) {
        appendBytes([0xda, ...encodeUint16(strLength)]);
      } else if (inRange(strLength, 0, 0xffffffff)) {
        appendBytes([0xdb, ...encodeUint32(strLength)]);
      }
      appendBytes(strBuf);
    }
    /**
     * @param {Uint8Array} buf 
     */
    function appendBinary(buf) {
      let bufLength = buf.length;
      if (inRange(bufLength, 0, 0xff)) {
        appendBytes([0xc4, bufLength]);
      } else if (inRange(bufLength, 0, 0xffff)) {
        appendBytes([0xc5, ...encodeUint16(bufLength)]);
      } else if (inRange(bufLength, 0, 0xffffffff)) {
        appendBytes([0xc6, ...encodeUint32(bufLength)]);
      }
      appendBytes(buf);
    }
    /**
     * @param {Array} items 
     */
    function appendArray(items) {
      let arrayLength = items.length;
      if (inRange(arrayLength, 0, 0xf)) {
        appendBytes([0x90 + arrayLength]);
      } else if (inRange(arrayLength, 0, 0xffff)) {
        appendBytes([0xdc, ...encodeUint16(arrayLength)]);
      } else if (inRange(arrayLength, 0, 0xffffffff)) {
        appendBytes([0xdd, ...encodeUint32(arrayLength)]);
      }
      for (let item of items) appendItem(item);
    }
    /**
     * @param {Map} items 
     */
    function appendMap(map) {
      let mapSize = Object.keys(map).length;
      if (inRange(mapSize, 0, 0xf)) {
        appendBytes([0x80 + mapSize]);
      } else if (inRange(mapSize, 0, 0xffff)) {
        appendBytes([0xde, ...encodeUint16(mapSize)]);
      } else if (inRange(mapSize, 0, 0xffffffff)) {
        appendBytes([0xdf, ...encodeUint32(mapSize)]);
      }
      for (let [key, value] of (map instanceof Map) ? map : Object.entries(map)) {
        appendItem(key);
        appendItem(value);
      }
    }
    /**
     * @param {Number} type 
     * @param {Uint8Array} buf 
     */
    function appendExtension(type, buf) {
      let bufLength = buf.length;
      let ByteView = new DataView(new ArrayBuffer(1));
      ByteView.setInt8(0, type);
      let _type = (new Uint8Array(ByteView.buffer))[0];
      if (bufLength == 1) {
        appendBytes([0xd4, _type, strLength]);
      } else if (bufLength == 2) {
        appendBytes([0xd5, _type, ...buf]);
      } else if (bufLength == 4) {
        appendBytes([0xd6, _type, ...buf]);
      } else if (bufLength == 8) {
        appendBytes([0xd7, _type, ...buf]);
      } else if (bufLength == 16) {
        appendBytes([0xd8, _type, ...buf]);
      } else {
        if (inRange(bufLength, 0, 0xff)) {
          appendBytes([0xc7, bufLength, _type]);
        } else if (inRange(bufLength, 0, 0xffff)) {
          appendBytes([0xc8, ...encodeUint16(bufLength), _type]);
        } else if (inRange(bufLength, 0, 0xffffffff)) {
          appendBytes([0xc9, ...encodeUint32(bufLength), _type]);
        }
        appendBytes(buf);
      }
    }
    /**
     * @param {Date} date 
     */
    function appendDate(date) {
      let sec = date.getTime() / 1000, ms = date.getMilliseconds(), ns = ms * 1000000;
      if (ms == 0 && inRange(sec, 0, 0x0ffffffff)) {
        appendExtension(-1, encodeUint32(sec));
      } else if (inRange(sec, 0, 0x3ffffffff)) {
        appendExtension(-1, [ns >>> 22, ns >>> 14, ns >>> 6, ((ns << 2) >>> 0) | (sec / pow32), sec >>> 24, sec >>> 16, sec >>> 8, sec]);
      } else {
        let bufView = new DataView(new ArrayBuffer(8));
        bufView.setBigInt64(0, num);
        appendExtension(-1, [encodeUint32(ns), ...new Uint8Array(bufView.buffer)]);
      }
    }
    function appendItem(item) {
      switch (typeof item) {
        case "bigint":
        case "number":
          return appendNumber(item);
        case "boolean":
          return appendBoolean(item);
        case "string":
          return appendString(item);
        case "undefined":
          return appendNull();
        case "object":
          if (item === null) return appendNull();
          else if (item instanceof Date) return appendDate(item);
          else if (Array.isArray(item)) return appendArray(item);
          else if (item instanceof Uint8Array || item instanceof Uint8ClampedArray) return appendBinary(item);
          else if (item instanceof ArrayBuffer) return appendBinary(new Uint8Array(item));
          else if ([Int8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array].some(e => (item instanceof e))) return appendArray(e);
          else return appendMap(item);
        default:
          throw new Error("Invalid Type", item);
      }
    }
    /**
     * @param {ArrayLike<number>|Uint8Array} bufs 
     */
    function concatBuffer(bufs) {
      let totalLength = 0, currPos = 0;
      for (let buf of bufs) {
        totalLength += buf.length;
      }
      let target = new Uint8Array(totalLength);
      for (let buf of bufs) {
        target.set(buf, currPos);
        currPos += buf.length;
      }
      return target;
    }
    if (multiple) {
      for (let item of data) appendItem(item);
    } else {
      appendItem(data);
    }
    return concatBuffer(buffers);
  }
  /**
   * @param {Uint8Array} data 
   */
  function decode(data, opts = {}) {
    if (typeof Buffer !== "undefined" && data instanceof Buffer) data = Uint8Array.from(data);
    const { multiple = false } = opts;
    let bufView = new DataView(data.buffer), pos = 0;
    function read() {
      let type = data[pos++];
      if (inRange(type, 0x00, 0x7f)) return type;
      else if (inRange(type, 0x80, 0x8f)) return readMap(type - 0x80, false);
      else if (inRange(type, 0x90, 0x9f)) return readArray(type - 0x90, false);
      else if (inRange(type, 0xa0, 0xbf)) return readString(type - 0xa0, false);
      else if (inRange(type, 0xc2, 0xc3)) return Boolean(type - 0xc2);
      else if (inRange(type, 0xc4, 0xc6)) return readBinary(type - 0xc4);
      else if (inRange(type, 0xc7, 0xc9)) return readExtension(type - 0xc7, true);
      else if (inRange(type, 0xca, 0xd3)) return readNumber(type);
      else if (inRange(type, 0xd4, 0xd8)) return readExtension(type - 0xd4, false);
      else if (inRange(type, 0xd9, 0xdb)) return readString(type - 0xd9, true);
      else if (inRange(type, 0xdc, 0xdd)) return readArray(type - 0xdc, true);
      else if (inRange(type, 0xde, 0xdf)) return readMap(type - 0xde, true);
      else if (inRange(type, 0xe0, 0xff)) return type - 256;
      else if (type==0xc0) return null;
      throw new Error(`Unmatched Type ${type} at ${pos}`);
    }
    function readNumber(type = 0) {
      let num = 0;
      switch (type) {
        case 0xca: num = bufView.getFloat32(pos); pos += 4; break;
        case 0xcb: num = bufView.getFloat64(pos); pos += 8; break;
        case 0xcc: num = bufView.getUint8(pos); pos += 1; break;
        case 0xcd: num = bufView.getUint16(pos); pos += 2; break;
        case 0xce: num = bufView.getUint32(pos); pos += 4; break;
        case 0xcf: num = bufView.getBigUint64(pos); pos += 8; break;
        case 0xd0: num = bufView.getInt8(pos); pos += 1; break;
        case 0xd1: num = bufView.getInt16(pos); pos += 2; break;
        case 0xd2: num = bufView.getInt32(pos); pos += 4; break;
        case 0xd3: num = bufView.getBigInt64(pos); pos += 8; break;
        default: throw new Error(`Invalid Number Type ${type}`);
      }
      if (num < Number.MAX_SAFE_INTEGER) num = Number(num);
      return num;
    }
    /**
     * @param {Number} type 
     */
    function readString(type, isDynamic) {
      let stringLength = isDynamic ? readNumber(0xcc + type) : type;
      return (new TextDecoder).decode(data.slice(pos, pos += stringLength));
    }
    /**
     * @param {Number} type 
     */
    function readArray(type, isDynamic) {
      let arrayLength = isDynamic ? readNumber(0xcd + type) : type;
      let result = [];
      for (let i = 0; i < arrayLength; i++)result.push(read())
      return result;
    }
    /**
     * @param {Number} type 
     */
    function readMap(type, isDynamic) {
      let mapSize = isDynamic ? readNumber(0xcd + type) : type;
      let result = new Map;
      for (let i = 0; i < mapSize; i++) {
        let [key, value] = [read(), read()];
        result.set(key, value);
      }
      if (![...result.keys()].some(e => typeof e !== "string")) return Object.fromEntries(result);
      return result;
    }
    /**
     * @param {Number} type 
     */
    function readBinary(type) {
      let binLength = readNumber(0xcc + type);
      return data.slice(pos, pos += binLength);
    }
    /**
     * @param {Uint8Array} buf
     * @returns {Date}
     */
    function readDate(buf) {
      let DateView = new DataView(buf.buffer);
      switch (buf.length) {
        case 4: return new Date(DateView.getUint32(0) * 1000)
        case 8: {
          let ns = ((buf[0] << 22) >>> 0) +
            ((buf[1] << 14) >>> 0) +
            ((buf[2] << 6) >>> 0) +
            (buf[3] >>> 2);
          let sec = ((buf[3] & 0x3) * pow32) +
            ((buf[4] << 24) >>> 0) +
            ((buf[5] << 16) >>> 0) +
            ((buf[6] << 8) >>> 0) +
            buf[7];
          return new Date(sec * 1000 + ns / 1000000);
        }
        case 12: {
          let ns = DateView.getUint32(0);
          let sec = DateView.getInt32(0);
          return new Date(sec * 1000 + ns / 1000000);
        }
      }
    }
    /**
     * @param {Number} type 
     */
    function readExtension(type, isDynamic) {
      let fixedLengths = [1, 2, 4, 8, 16];
      let extLength = isDynamic ? readNumber(0xcd + type) : fixedLengths[type];
      let extType = readNumber(0xd0);
      let extData = data.slice(pos, pos += extLength);
      switch (extType) {
        case -1: return readDate(extData);
      }
    }
    if (multiple) {
      const result = [];
      while (pos < data.length) result.push(read());
      return result;
    } else {
      return read();
    }
  }
  return {
    encode,
    decode
  }
});