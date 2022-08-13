var ECC=require("../../core/User/simpleecc")("secp256k1");
var {hash}=require("../../core/User/CryptoMine");
var path=require("path");
var root=path.resolve(".");
var fs=require("fs");
const fromHEXString = hexString =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const toHEXString = bytes =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
if(!process.send){
  console.error("错误:安装程序不可直接运行");
  process.exit(1);
}
if(fs.existsSync("./app.package.json")){
  var config=JSON.parse(fs.readFileSync("./app.package.json").toString());
}else{
  console.error("错误:安装程序无法找到无法找到版本配置文件");
  process.send({restart:"./_app.js"});
  process.exit(255);
}
if(fs.existsSync(config.packageFile)){
  var filesbuf=fs.readFileSync(config.packageFile);
}else{
  console.error("错误:安装程序无法找到新版本文件");
  process.send({restart:"./_app.js"});
  process.exit(255);
}
var fileheaderPointer=filesbuf.length -1 -(Buffer.from(filesbuf).reverse().indexOf(10) - 1);
var fileheaderBuf=filesbuf.subarray(fileheaderPointer);
var fileheader=(new TextDecoder).decode(fileheaderBuf);
try {
  var Header = JSON.parse(fileheader);
} catch {
  console.error("错误:新版本文件头无效");
  process.send({restart:"./_app.js"});
  process.exit(255);
}
function isSigned(){
  var signed=false;
  var PublicKey=ECC.importKey(true,fromHEXString(config.PublicKey).buffer);
  if(ECC.ECDSA.verify(`${Header.version}:${JSON.stringify(Header.entries)}`,fromHEXString(Header.sign).buffer,PublicKey)){
    signed=true;
  }
  return signed;
}
function normalize(_path){
  return "."+path.resolve(_path).substring(root.length);
}
var exception=[
  "key.pem",
  "cert.pem",
  "server",
  "property.js",
  "users",
  "workers",
  config.packageFile].map(e=>normalize(e));
function uninstall(){
  var files=fs.readdirSync(".").filter((a)=>!exception.find(f=>normalize(a).startsWith(f)));
  files.forEach(function(a){
    var isDirectory=fs.lstatSync(path.resolve(a)).isDirectory();
    if(isDirectory){
      fs.rmSync(path.resolve(a),{recursive:true,force:true});
    }else{
      fs.unlinkSync(path.resolve(a));
    }
  })
}
function writeFile(_path,data){
  fs.mkdirSync(path.dirname(_path),{recursive:true});
  fs.writeFileSync(_path,data);
}
var files={};
function verifyAndUnzip(){
  var vaild=true;
  for(let metadataIndex in Header.entries){
    metadataIndex=Number(metadataIndex);
    const metadata=Header.entries[metadataIndex];//[filename,hash,start,size]
    var filebuf=filesbuf.subarray(metadata[2],metadata[2]+metadata[3]);
    var checksum=hash(filebuf);
    var isok=metadata[1]===checksum;
    var _path=path.resolve(metadata[0]);
    if(!exception.find(f=>normalize(_path).startsWith(f))){
      if((!_path.startsWith(path.resolve(".")))||!isok){
        console.warn("校验错误:"+_path);
        vaild=false;
        break;
      }
      console.log(`[1/2 ${Math.floor((metadataIndex+1)/Header.entries.length*100)}%]校验:`+metadata[0]);
      files[_path]=filebuf;
    }
  }
  return vaild;
}
if(isSigned()&&!(process.argv[2]==="skipSignCheck")){
  if(Header.version<config.version){
    console.error("错误:旧版本覆盖新版本");
    process.send({restart:"./_app.js"});
    process.exit(255);
  }
  if(!verifyAndUnzip()){
    console.error("错误:文件损坏(校验值不符)");
    process.send({restart:"./_app.js"});
    process.exit(255);
  }
  uninstall();
  var entries=Object.entries(files);
  for(let fileIndex in entries){
    fileIndex=Number(fileIndex);
    let file=entries[fileIndex];
    console.log(`[2/2 ${Math.floor((fileIndex+1)/entries.length*100)}%]写入:`+file[0]);
    writeFile(file[0],file[1]);
  }
  process.send({restart:"./_app.js"});
}else{
  console.error("错误:新版本文件签名损坏");
  process.send({restart:"./_app.js"});
  process.exit(255);
}
