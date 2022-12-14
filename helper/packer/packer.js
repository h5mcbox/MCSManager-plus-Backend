var readdir=require("./readdirRecurively");
var ECC=require("../../core/User/simpleecc")("secp256k1");
var {hash}=require("../../core/User/CryptoMine");
const fromHEXString = hexString =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const toHEXString = bytes =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
const now=Math.floor(Date.now()/1000);
var privateKey=ECC.importKey(false,fromHEXString(process.env.signKey).buffer);
var fs=require("fs");
var path=require("path");
var Filenames=readdir(".");
var root=path.resolve(".");
function normalize(_path){
  return "."+path.resolve(_path).substring(root.length);
}
var exceptions=[
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
  "helper/packer/"
].map(e=>normalize(e));
var bufs=[];
var cursor=0;
var entries=[];
Filenames.forEach(e=>{
  var skip=false;
  exceptions.forEach(f=>normalize(e).startsWith(f)?skip=true:false);
  if(skip){
    console.log("skip:"+e);
    return false;
  }
  console.log("pack:"+e);
  var filebuf=fs.readFileSync(e);
  var fileEntry=[e,hash(filebuf),cursor,filebuf.length];
  entries.push(fileEntry);
  bufs.push(filebuf);
  cursor+=filebuf.length;
});
function addFile(filename,data,first){
  var targetFilename=normalize(filename);
  var fileEntry=[targetFilename,hash(data),cursor,data.length];
  if(first){
    console.log("pack to head:"+targetFilename);
    entries.unshift(fileEntry);
  }else{
    console.log("pack to end:"+targetFilename);
    entries.push(fileEntry);
  }
  bufs.push(data);
  cursor+=data.length;
}
function moveFile(_startsWith,first){
  _startsWith=normalize(_startsWith);
  var foundFiles=entries.filter(e=>e[0].startsWith(_startsWith));
  for(let i of foundFiles){
    let index=entries.indexOf(i);
    entries.splice(index,1);
    if(first){
      console.log("move to head:"+i[0]);
      entries.unshift(i);
    }else{
      console.log("move to end:"+i[0]);
      entries.push(i);
    }
  }
}
const AppEntry=fs.readFileSync("app.js").toString();
const AppEntryPatched=AppEntry.replaceAll("VERSION=0","VERSION="+now) //?????????????????????
addFile("app.js",Buffer.from(AppEntryPatched.replaceAll("./helper/packer/packer.js","./app.js")),false); //????????????
var databuf=Buffer.concat(bufs);
var Header={
  version:now,
  entries:entries
}
Header.sign=toHEXString(new Uint8Array(ECC.ECDSA.sign(`${Header.version}:${JSON.stringify(Header.entries)}`,privateKey)));
var headerbuf=(new TextEncoder).encode(JSON.stringify(Header));
var packagebuf=Buffer.concat([databuf,Buffer.from("\n"),headerbuf]);
fs.writeFileSync("./app.apkg",packagebuf);
console.log("????????????");
if(!process.env.packerNoRestart)process.send({restart:"./app.js"});
process.exit();