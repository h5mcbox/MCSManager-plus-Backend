const { signKey, publicKey: CLIPublicKey } = process.env;
const { brotliCompressSync, constants } = require("node:zlib");
let readdir = require("./readdirRecurively");
let ECC = require("../../core/User/simpleecc")("secp256k1");
let { hash } = require("../../core/User/CryptoMine");
const toHEXString = bytes =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
const now = Math.floor(Date.now() / 1000);
let privateKey = ECC.importKey(false, Buffer.from(signKey, "base64"));
let publicKey = Buffer.from(ECC.getPublicKey(privateKey, true).exportKey()).toString("base64");
let fs = require("fs");
let path = require("path");
let Filenames = readdir(".");
let root = path.resolve(".");
function normalize(_path) {
  return "." + path.resolve(_path).substring(root.length);
}
let exceptions = [
  ".git",
  ".github",
  "app.js",
  "server",
  "users",
  "workers",
  "tmp_upload",
  "logs",
  "dist/",
  "cert.pem",
  "key.pem",
  "property.js",
  "helper/packer/",
  "core/info.json",
  "public/onlinefs_public/src/"
].map(e => normalize(e));
let exceptionsEnd = [
  ".js.map",
  "package-lock.json",
  ".md"
];
let bufs = [], entries = [], cursor = 0;
for (let filename of Filenames) {
  let skip = false;
  exceptions.forEach(f => normalize(filename).startsWith(f) ? skip = true : false);
  exceptionsEnd.forEach(f => normalize(filename).endsWith(f) ? skip = true : false);
  if (skip) {
    console.log("skip:" + filename);
    continue;
  }
  console.log("pack:" + filename);
  let filebuf = fs.readFileSync(filename);
  let fileEntry = [filename, hash(filebuf), cursor, filebuf.length];
  entries.push(fileEntry);
  bufs.push(filebuf);
  cursor += filebuf.length;
};
function addFile(filename, data, first) {
  let targetFilename = normalize(filename);
  let fileEntry = [targetFilename, hash(data), cursor, data.length];
  if (first) {
    console.log("pack to head:" + targetFilename);
    entries.unshift(fileEntry);
  } else {
    console.log("pack to end:" + targetFilename);
    entries.push(fileEntry);
  }
  bufs.push(data);
  cursor += data.length;
}
const AppEntry = fs.readFileSync("app.js").toString();
const AppEntryPatched = AppEntry
  .replaceAll("const VERSION = 0;", `const VERSION = ${now};`) //修改硬编码时间
  .replaceAll(`const PUBLICKEY = "";`, `const PUBLICKEY = "${CLIPublicKey ?? publicKey}";`) //修改公钥
  .replaceAll("./helper/packer/packer.js", "./app.js") //修改入口
const AppEntryBuffer = Buffer.from(AppEntryPatched);
addFile("app.js", AppEntryBuffer, false);
let databuf = Buffer.concat(bufs);
let Header = { version: now, entries: entries };
Header.sign = toHEXString(new Uint8Array(ECC.ECDSA.sign(`${Header.version}:${JSON.stringify(Header.entries)}`, privateKey)));
let headerbuf = (new TextEncoder).encode(JSON.stringify(Header));
let packagebuf = brotliCompressSync(Buffer.concat([databuf, Buffer.from("\n"), headerbuf]), { params: { [constants.BROTLI_PARAM_QUALITY]: 4 } });
fs.mkdirSync("./dist", { recursive: true });
fs.writeFileSync("./dist/app.apkg", packagebuf);
fs.writeFileSync("./dist/app.js", AppEntryBuffer);
console.log("写入完成");
process.exit();