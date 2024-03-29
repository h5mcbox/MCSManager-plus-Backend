const { WebSocketObserver } = require("../../model/WebSocketModel");
const { userCenter } = require("../../model/UserModel");
const serverModel = require("../../model/ServerModel");
const response = require("../../helper/Response");
const workerCenter = require("../../model/WorkerModel");
const permission = require("../../helper/Permission");

WebSocketObserver().define("genuser/home", async data => {
  if (!permission.hasRights(data.WsSession.username, "genuser")) return;
  try {
    let username = data.WsSession.username.trim();
    let user = userCenter().get(username);
    //有一定可能是 管理员修改了用户名
    if (!user) {
      for (let i = 0; i < 5; i++) response.wsMsgWindow(data.ws, "您的用户资料似乎已经被修改且失效，请咨询管理员");
      data.ws.close();
      return;
    }
    let allowedServerList = user.allowedServer();
    // 判断是否为管理员，若是的话则返回所有服务端的数据
    let allServersNames = [], workerNames = new Set;
    for (let worker of workerCenter.getOnlineWorkers()) {
      let servers = await worker.call("server/view");
      workerNames.add(worker.dataModel.workername);
      servers.items.forEach(e => allServersNames.push(e.serverName));
    }
    if (permission.hasRights(data.WsSession.username, "server")) {
      allowedServerList = [];
      //const serverList = serverModel.ServerManager().getServerList();
      for (const v of allServersNames) {
        allowedServerList.push(v);
      }
    }
    //取当前用户在线的服务器
    let userServerList = [];
    let OnlineServerList = [];
    for (let k in allowedServerList) {
      let userHaveServer = serverModel.ServerManager().getServer(allowedServerList[k]);
      let serverLoc = userHaveServer.dataModel.location;
      if (!workerCenter.get(serverLoc)) {
        response.wsMsgWindow(data.ws, "创建出错:" + "Worker不存在");
        return false;
      }
      let worker = workerCenter.get(serverLoc);
      let ResponseValue = await worker.call("server/get", allowedServerList[k]);
      //有些用户就是喜欢取不存在的
      if (userHaveServer == undefined) continue;
      //有些数据不应该是用户可以收到的
      userServerList.push({
        serverName: ResponseValue.name,
        lastDate: ResponseValue.lastDate,
        createDate: ResponseValue.createDate,
        run: ResponseValue.run,
        jarName: ResponseValue.jarName,
        timeLimitDate: ResponseValue.timeLimitDate
      });
      if (ResponseValue.run) {
        OnlineServerList.push(ResponseValue.name);
      }
    }
    var resObj = {
      username: username,
      lastDate: user.dataModel.lastDate,
      createDate: user.dataModel.createDate,
      allowedServer: allowedServerList,
      serverLen: allowedServerList.length,
      OnlineLen: OnlineServerList.length,
      AllServerLen: userServerList.length,
      userServerList: userServerList,
      OnlineServerList: OnlineServerList,
    }
    if (permission.hasRights(data.WsSession.username, "server")) {
      resObj.workerNames = [...workerNames];
    } else {
      resObj.workerNames = [];
    }
    return resObj;
  } catch (err) {
    MCSERVER.error("普通用户访问异常", err);
  }
});

WebSocketObserver().define("genuser/banned", data => {
  if (!permission.hasRights(data.WsSession.username, "banned")) return;
  let user = userCenter().get(data.WsSession.username.trim());
  return {
    bannedBy: user.dataModel.lastOperator,
    username: user.dataModel.username,
    lastDate: user.dataModel.lastDate,
    createDate: user.dataModel.createDate
  };
});
WebSocketObserver().define("genuser/view", data => {
  let user = userCenter().get(data.WsSession.username.trim());
  return {
    username: user.dataModel.username,
    lastDate: user.dataModel.lastDate,
    createDate: user.dataModel.createDate,
    randomPassword: user.dataModel.randomPassword,
    LoginPublicKey: user.dataModel.LoginPublicKey || "",
    allowedServer: user.dataModel.allowedServer || []
  };
});
WebSocketObserver().define("genuser/re_password", data => {
  let username = data.WsSession.username.trim();
  let user = userCenter().get(username);
  let config = data.body;
  let view = {
    randomPassword: user.dataModel.randomPassword,
    LoginPublicKey: user.dataModel.LoginPublicKey || ""
  };
  if ((view.randomPassword && view.LoginPublicKey) && !(config.oldPassword.length == 0 && config.loginParams.length != 0)) {
    response.wsMsgWindow(data.ws, "很抱歉，只使用公钥登录的用户还需填写登录参数");
    return false;
  }
  if (config.loginParams) {
    try {
      let paramsReader = new URLSearchParams(config.loginParams);
      config.oldPassword = paramsReader.get("password");
      config.ChallengeID = paramsReader.get("ChallengeID");
    } catch {
      return false;
    }
  }
  if (config.oldPassword) {
    let { verified } = userCenter().loginCheck({
      username,
      password: config.oldPassword,
      loginSalt: null,
      notSafeLogin: true
    });
    if (verified) {
      if ((config.newPassword.length > 100 || config.newPassword.length < 6) && !(config.newPassword.length == 0 && userCenter().get(username).dataModel.LoginPublicKey)) {
        response.wsMsgWindow(data.ws, "新的密码长度不正确，需要 6~100 位长度");
        return false;
      }
      userCenter().rePassword(username, config.newPassword);
      userCenter().reLoginPublicKey(username, config.newLoginPublicKey);
      userCenter().initUser();
      response.wsMsgWindow(data.ws, "密码修改完成!");
      return true;
    } else {
      response.wsMsgWindow(data.ws, "很抱歉，原密码错误，无法修改");
      return false;
    }
  }
});
MCSERVER.addProbablyPermissions("genuser", "查看普通用户面板数据");
MCSERVER.addProbablyPermissions("server", "返回所有服务器数据");
MCSERVER.addProbablyPermissions("banned", "允许访问被封禁页面");