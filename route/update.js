const {Router} = require("express");
const router = Router();
const fs = require("fs");
const fetch=require("node-fetch");
const WorkerCenter=require("../model/WorkerModel");
const {hash}=require("../core/User/CryptoMine");
const permission = require("../helper/Permission");

router.post("/", (req, res, next) => {
  if (!permission.needLogin(req, res)) return;
  if (!permission.hasSessionRights(req, res,"update")) {
    return res.status(500).send("权限不足");
  } else {
    next();
  }
}, async (req, res) => {
  // 仅限于管理员使用
  const target_path="./app.apkg";
  var bufs=[];
  var onFinished=new Promise((resolve,reject)=>req.on("data",e=>bufs.push(e)).on("end",_=>resolve(Buffer.concat(bufs))).on("error",reject));
  var buffer=await onFinished;
  fs.writeFileSync("./app.backup.apkg",fs.readFileSync(target_path))
  fs.writeFileSync(target_path,buffer);
  MCSERVER.log("[ 文件上传 ] 用户", req.session["username"], "上传文件到", target_path);
  res.send("Done");
  res.end();
  process.send({restart:"./app.js"});
  MCSERVER.log("重启Backend...");
  process.emit("SIGINT");
});
router.post("/worker/:name",async function(req,res){
  if (!permission.needLogin(req, res)) return;
  if (!permission.hasSessionRights(req, res,"worker")) {
    return res.status(500).send("权限不足");
  }
  var bufs=[];
  var onFinished=new Promise((resolve,reject)=>req.on("data",e=>bufs.push(e)).on("end",_=>resolve(Buffer.concat(bufs))).on("error",reject));
  var buffer=await onFinished;
  let serverLocation = req.params.name;
  var worker=WorkerCenter.get(serverLocation);
  if(!worker){
    return res.status(500).send("访问出错:Worker不存在");
  }
  let now=Math.floor(Date.now()/1000);
  let timeWindow=Math.floor(now/120);
  let timeKey=hash.hmac(worker.dataModel.MasterKey,timeWindow.toString());
  var u=new URL(worker.dataModel.RemoteDescription.endpoint);
  u.pathname="/update";
  u.searchParams.set("apikey",timeKey);
  let resp=await fetch(u,{
    method:"POST",
    body:buffer
  });
  res.status(resp.status).send(await resp.buffer());
  res.end();
})
//模块导出
module.exports = router;
