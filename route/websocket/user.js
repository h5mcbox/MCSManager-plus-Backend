const { WebSocketObserver } = require("../../model/WebSocketModel");
const { userCenter, deleteUser } = require("../../model/UserModel");
const response = require("../../helper/Response");
const permssion = require("../../helper/Permission");
const tools = require("../../core/tools");
const totp = require("../../helper/totp");

WebSocketObserver().listener("userset/update", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"userset")) return;

  //添加是否在线
  let userNameList = userCenter().getUserList();
  for (let k in userNameList) {
    let userdata = userNameList[k];
    userdata.data.group=permssion.getUserGroup(userdata.username);
    if (permssion.isOnline(userdata.username)) userdata.data.online = true;
    else userdata.data.online = false;
  }

  response.wsSend(data.ws, "userset/update", {
    items: userNameList
  });
});

WebSocketObserver().listener("userset/create", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"userset")) return;

  try {
    let newUserConfig = JSON.parse(data.body);
    if (!(newUserConfig.allowedServer instanceof Array)) {
      response.wsMsgWindow(data.ws, "用户服务器列表格式不正确");
      return;
    }
    let username = newUserConfig.username.trim();
    let password = newUserConfig.password.trim();
    let newGroup = newUserConfig.newGroup.trim();
    let LoginPublicKey = newUserConfig.newLoginPublicKey.trim();

    // 用户名范围限制
    var uPattern = /^[a-zA-Z0-9_#$]{4,18}$/;
    if (!uPattern.test(username) || (!tools.between(password, 6, 100) && !(password.length == 0 && LoginPublicKey))) {
      response.wsMsgWindow(data.ws, "用户账号或密码格式不正确");
      return;
    }
    //如果需求，则增加用户组
    if (newGroup.trim() != "") {
      if(!permssion.groups().includes(newGroup)){
        response.wsMsgWindow(data.ws, "用户组不存在，已舍弃用户组的更改");
        return;
      }
    }

    userCenter().register(username, password, LoginPublicKey,newGroup);
    //去除掉空白的
    let allowedServerList = [];
    for (let k in newUserConfig.allowedServer) {
      if (newUserConfig.allowedServer[k] != " " && newUserConfig.allowedServer[k].length > 0) {
        allowedServerList.push(newUserConfig.allowedServer[k]);
      }
    }
    userCenter().get(username).allowedServer(allowedServerList);
    //其数据模型保存
    userCenter().get(username).dataModel.lastOperator=data.WsSession.username;
    userCenter().get(username).dataModel.save();
    MCSERVER.info("用户", data.WsSession.username, "建立", username, "用户");
    response.wsSend(data.ws, "userset/create", true);
    response.wsMsgWindow(data.ws, "用户建立完成√");
    return;
  } catch (e) {
    MCSERVER.error("用户建立失败", e);
    response.wsSend(data.ws, "userset/create", null);
    response.wsMsgWindow(data.ws, "用户建立失败: " + e);
  }
});

WebSocketObserver().listener("userset/delete", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"userset")) return;

  try {
    let deleteObj = JSON.parse(data.body);
    let username = deleteObj.username.trim();
    MCSERVER.info("用户", data.WsSession.username, "删除", username, "用户");
    deleteUser(
      username,
      () => {
        userCenter().initUser();
        response.wsSend(data.ws, "userset/delete", true);
        response.wsMsgWindow(data.ws, "删除用户成功√");
      },
      () => {
        response.wsMsgWindow(data.ws, "删除用户失败√");
      }
    );
    return;
  } catch (e) {
    MCSERVER.error("删除用户失败", e);
    response.wsSend(data.ws, "userset/delete", null);
    response.wsMsgWindow(data.ws, "删除用户失败:" + e);
  }
});

WebSocketObserver().listener("userset/reload", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"userset")) return;

  try {
    userCenter().initUser();
    response.wsSend(data.ws, "userset/reload", true);
    response.wsMsgWindow(data.ws, "用户重新导入完成√");
    return;
  } catch (e) {
    MCSERVER.error("用户重新导入失败", e);
    response.wsSend(data.ws, "userset/reload", null);
    response.wsMsgWindow(data.ws, "错误：用户重新导入失败" + e);
  }
});

//查看某个用戶信息
WebSocketObserver().listener("userset/view", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"userset")) return;

  let user = userCenter().get(data.body.trim());
  response.wsSend(data.ws, "userset/view", {
    username: user.dataModel.username,
    lastDate: user.dataModel.lastDate,
    createDate: user.dataModel.createDate,
    randomPassword: user.dataModel.randomPassword,
    LoginPublicKey: user.dataModel.LoginPublicKey || "",
    userGroup: user.dataModel.group || "",
    allowedServer: user.dataModel.allowedServer || []
  });
});

//更新用户配置
WebSocketObserver().listener("userset/upinfo", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"userset")) return;

  try {
    let newUserConfig = JSON.parse(data.body);
    if (!(newUserConfig.allowedServer instanceof Array)) {
      response.wsSend(data.ws, "userset/upinfo", null);
      return;
    }
    //去除掉空白的
    let allowedServerList = [];
    for (let k in newUserConfig.allowedServer) {
      if (newUserConfig.allowedServer[k] != " " && newUserConfig.allowedServer[k].length > 0) {
        allowedServerList.push(newUserConfig.allowedServer[k]);
      }
    }
    let username = newUserConfig.username.trim();
    let newPW = newUserConfig.newPassword.trim();
    let newUS = newUserConfig.newUsername.trim();
    let newGroup = newUserConfig.newGroup.trim();
    let newLoginPublicKey = newUserConfig.newLoginPublicKey.trim()

    //更改服务器拥有列表
    userCenter().get(username).allowedServer(allowedServerList);

    //如果需求，则更改公钥
    if (newLoginPublicKey.trim() != "") {
      if (newLoginPublicKey.length != 66) {
        response.wsMsgWindow(data.ws, "新的公钥格式不正确，已舍弃公钥的更改");
      } else {
        userCenter().reLoginPublicKey(username, newLoginPublicKey);
      }
    }
    //如果需求，则更改用户组
    if (newGroup.trim() != "") {
      if(!permssion.groups().includes(newGroup)){
        response.wsMsgWindow(data.ws, "用户组不存在，已舍弃用户组的更改");
      }else{
        userCenter().reGroup(username, newGroup);
      }
    }
    //如果需求，则更改密码
    if (newPW.trim() != "") {
      if ((newPW.length < 6 || newPW.length > 100) && !(newPW.length == 0 && userCenter().get(username).dataModel.LoginPublicKey)) {
        response.wsMsgWindow(data.ws, "新的密码格式不正确，已舍弃密码的更改");
      } else {
        userCenter().rePassword(username, newPW);
      }
    }

    //如果需求，则更改用户名以及存储文件
    if (username != newUS) {
      let uPattern = /^[a-zA-Z0-9_#$]{4,18}$/;
      if (!uPattern.test(newUS)) {
        response.wsMsgWindow(data.ws, "新的用户名格式不正确，已舍弃用户名的更改");
        return;
      }
      userCenter().reUsername(username, newUS);
      userCenter().get(newUS).dataModel.save();
    } else {
      userCenter().get(username).dataModel.save();
    }

    //其数据模型保存
    userCenter().get(username).dataModel.lastOperator=data.WsSession.username;
    userCenter().get(username).dataModel.save();
    response.wsMsgWindow(data.ws, "更新用户数据完成√");
    return;
  } catch (e) {
    response.wsMsgWindow(data.ws, "错误：更新用户数据错误：" + e);
  }
});

//更新用户配置
WebSocketObserver().listener("userset/2fa/set", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"2FA")) return;
  var totp = require("../../helper/totp");
  //try {
  let form = JSON.parse(data.body);
  var tempuser = userCenter().get(data.req.session["username"]);
  if(tempuser.dataModel.randomPassword){
    response.wsMsgWindow(data.ws, "错误：只使用公钥登录的用户无法启用2FA,请先重置密码");
    return false;
  }
  if (!tempuser.dataModel.TwoFAKey) {
    response.wsMsgWindow(data.ws, "错误：尚未生成密钥，请点击'更新两步验证密钥'来生成");
    return false;
  }
  var TwoFACode = totp.totp(tempuser.dataModel.TwoFAKey, 6);
  if (Number(form["TwoFACode"]) !== Number(TwoFACode)) {
    response.wsMsgWindow(data.ws, "错误：验证码不一致");
    return;
  }
  tempuser.dataModel.TwoFAEnabled = true;
  tempuser.dataModel.save();
  response.wsMsgWindow(data.ws, "启用成功");
  //}catch(e){
  //  response.wsMsgWindow(data.ws, "错误：启用两步验证错误：" + e);
  //}
});
WebSocketObserver().listener("userset/2fa/disable", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"2FA")) return;
  var totp = require("../../helper/totp");
  try {
    let form = JSON.parse(data.body);
    var tempuser = userCenter().get(data.req.session["username"]);
    if(tempuser.dataModel.randomPassword){
      response.wsMsgWindow(data.ws, "错误：只使用公钥登录的用户无法启用2FA,请先重置密码");
      return false;
    }
    if (!tempuser.dataModel.TwoFAKey) {
      response.wsMsgWindow(data.ws, "错误：尚未生成密钥，请点击'更新两步验证密钥'来生成");
      return;
    }
    var TwoFACode = totp.totp(tempuser.dataModel.TwoFAKey, 6);
    if (Number(form["TwoFACode"]) !== Number(TwoFACode)) {
      response.wsMsgWindow(data.ws, "错误：验证码不一致");
      return;
    }
    tempuser.dataModel.TwoFAEnabled = false;
    tempuser.dataModel.save();
    response.wsMsgWindow(data.ws, "禁用成功");
  } catch (e) {
    response.wsMsgWindow(data.ws, "错误：禁用两步验证错误：" + e);
  }
});
WebSocketObserver().listener("userset/2fa/updateKey", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"2FA")) return;
  var cryptoMine = require("../../core/User/CryptoMine");
  try {
    var tempuser = userCenter().get(data.req.session["username"]);
    if(tempuser.dataModel.randomPassword){
      response.wsMsgWindow(data.ws, "错误：只使用公钥登录的用户无法启用2FA,请先重置密码");
      return false;
    }
    if (tempuser.dataModel.TwoFAEnabled) {
      response.wsMsgWindow(data.ws, "错误：两步验证已启用");
      return;
    }
    tempuser.dataModel.TwoFAKey = cryptoMine.randomString(12);
    response.wsMsgWindow(data.ws, "更新成功");
  } catch (e) {
    response.wsMsgWindow(data.ws, "错误：更新两步验证错误：" + e);
  }
});
WebSocketObserver().listener("userset/2fa/getAuthURL", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"2FA")) return;
  var tempuser = userCenter().get(data.req.session["username"]);
  var auth= {
    randomPassword: tempuser.dataModel.randomPassword
  };
  if(!auth.randomPassword){auth.authURL=totp.createURL((tempuser.dataModel.TwoFAKey || ""), "MCSManager", data.req.session["username"])}
  response.wsSend(data.ws, "userset/2fa/getAuthURL",auth);
});