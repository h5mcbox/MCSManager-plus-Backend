const { signKey, packerNoRestart } = process.env;
let readdir = require("./readdirRecurively");
let ECC = require("../../core/User/simpleecc")("secp256k1");
let { hash } = require("../../core/User/CryptoMine");
const fromHEXString = hexString =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const toHEXString = bytes =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
const now = Math.floor(Date.now() / 1000);
let privateKey = ECC.importKey(false, fromHEXString(signKey).buffer);
let fs = require("fs");
let path = require("path");
let Filenames = readdir(".");
let root = path.resolve(".");
function normalize(_path) {
  return "." + path.resolve(_path).substring(root.length);
}
let exceptions = [
  ".git",
  "server",
  "users",
  "workers",
  "tmp_upload",
  "logs",
  "app.apkg",
  "app.js",
  "app.package.json",
  "cert.pem",
  "key.pem",
  "property.js",
  "helper/packer/",
  "core/info.json"
].map(e => normalize(e));
let bufs = [];
let cursor = 0;
let entries = [];
Filenames.forEach(e => {
  let skip = false;
  exceptions.forEach(f => normalize(e).startsWith(f) ? skip = true : false);
  if (skip) {
    console.log("skip:" + e);
    return false;
  }
  console.log("pack:" + e);
  let filebuf = fs.readFileSync(e);
  let fileEntry = [e, hash(filebuf), cursor, filebuf.length];
  entries.push(fileEntry);
  bufs.push(filebuf);
  cursor += filebuf.length;
});
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
function moveFile(_startsWith, first) {
  _startsWith = normalize(_startsWith);
  let foundFiles = entries.filter(e => e[0].startsWith(_startsWith));
  for (let i of foundFiles) {
    let index = entries.indexOf(i);
    entries.splice(index, 1);
    if (first) {
      console.log("move to head:" + i[0]);
      entries.unshift(i);
    } else {
      console.log("move to end:" + i[0]);
      entries.push(i);
    }
  }
}
const AppEntry = fs.readFileSync("app.js").toString();
const AppEntryPatched = AppEntry.replaceAll("const VERSION = 0;", `const VERSION = ${now};`) //修改硬编码时间
addFile("app.js", Buffer.from(AppEntryPatched.replaceAll("./helper/packer/packer.js", "./app.js")), false); //修改入口
let databuf = Buffer.concat(bufs);
let Header = {
  version: now,
  entries: entries
}
Header.sign = toHEXString(new Uint8Array(ECC.ECDSA.sign(`${Header.version}:${JSON.stringify(Header.entries)}`, privateKey)));
let headerbuf = (new TextEncoder).encode(JSON.stringify(Header));
let packagebuf = Buffer.concat([databuf, Buffer.from("\n"), headerbuf]);
fs.writeFileSync("./app.apkg", packagebuf);
console.log("写入完成");
if (!packerNoRestart) process.send({ restart: "./app.js" });
process.exit();