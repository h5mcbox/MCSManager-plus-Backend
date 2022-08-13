/*
 * @Author: Copyright(c) 2020 Suwings
 * @Date: 2020-10-08 13:28:28
 * @LastEditTime: 2020-12-05 23:34:08
 * @Description: 文件上传
 */
const express = require("express");
const router = express.Router();
const permission = require("../helper/Permission");
const WorkerCenter=require("../model/WorkerModel");
const {hash}=require("../core/User/CryptoMine");
const fetch=require("node-fetch");
const FormData=require("form-data");

const multer = require("multer");
//const upload = multer({ dest: "tmp_upload/" });
const upload = multer();

router.post("/", upload.single("upload_file"), async (req, res) => {
  // 任意目录的文件上传，仅限于管理员使用
  //, upload.single("upload_file")
  if (!permission.needLogin(req, res)) return;
  if (!permission.hasSessionRights(req, res,"fileupload")) {
    return res.status(500).send("权限不足");
  }
  // 文件上传域
  var form=new FormData();
  form.append("cwd",req.body["cwd"]||"");
  form.append("upload_file",req.file.buffer,{filename:req.file.originalname,contentType:req.file.mimetype,knownLength:req.file.size});;
  let serverLocation = req.query["location"];
  var worker=WorkerCenter.get(serverLocation);
  if(!worker){
    return res.status(500).send("创建出错:Worker不存在");
  }
  var u=new URL(worker.dataModel.RemoteDescription.endpoint);
  u.pathname="/fileupload";
  let now=Math.floor(Date.now()/1000);
  let timeWindow=Math.floor(now/600);
  let timeKey=hash.hmac(worker.dataModel.MasterKey,timeWindow.toString());
  u.searchParams.set("apikey",timeKey);
  var response=await fetch(u.href,{
    method:"post",
    body:form
  });
  res.status(200).send("Done");
});

//模块导出
module.exports = router;
