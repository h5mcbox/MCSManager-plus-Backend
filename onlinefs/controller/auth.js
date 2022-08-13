const express = require("express");
const router = express.Router();
const { FileOperateStructure } = require("../model/fsoperate_session");
const permission = require("../../helper/Permission");
const pathm = require("path");
const loginedContainer = require("../../helper/LoginedContainer");

const SERVERS_DIR = "./server/";

router.all("/auth_master/pwd", (req, res) => {
  let userName = req.session["username"];

  //基础检查
  if (!userName) {
    res.send("[ 权限阻止 ] 您未登录");
    return;
  }

  //统一登录逻辑性检查
  if (!loginedContainer.isLogined(req.sessionID, userName)) {
    res.send("[ 权限阻止 ] 您未登录");
    return;
  }

  // 判断是否为管理员
  if (permission.hasSessionRights(req, res,"onlinefs")) {
    MCSERVER.log("[Online Fs]", "管理员", userName, "访问服务端存放目录");
    const absServersDir = pathm.normalize(pathm.join(pathm.join(__dirname, "../../"), SERVERS_DIR));
    req.session.fsos = new FileOperateStructure(absServersDir, "./");
    req.session.fsoperate = {};
    req.session.fsoperate.tmp = [];
    req.session.save();
    res.redirect("/public/onlinefs_public");
  }
});

router.all("/logout", (req, res) => {
  req.session.fsos = null;
  req.session.fsoperate = null;
  res.send("<script>window.close();</script>");
});

module.exports = router;
