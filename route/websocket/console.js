const { WebSocketObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");
const serverModel = require("../../model/ServerModel");
const permssion = require("../../helper/Permission");
//const { LogHistory } = require("../../helper/LogHistory");
const workerModel= require("../../model/WorkerModel");

//日志缓存记录器
MCSERVER.consoleLog = {};
//控制请求监听控制台实例
WebSocketObserver().listener("server/console/ws",async (data) => {
  let userName = data.WsSession.username;
  let serverName = data.body.trim();

  if (permssion.isCanServer(userName, serverName)) {
    MCSERVER.log(`[${serverName}] >>> 准许用户 ${userName} 控制台监听`);
    /*
    // 重置用户历史指针
    const instanceLogHistory = serverModel.ServerManager().getServer(serverName).logHistory;
    if (instanceLogHistory) instanceLogHistory.setPoint(userName, 0);
    return;
    */
    // 设置监听终端
    data.WsSession["console"] = serverName;
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if (!workerModel.get(serverLocation)) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    let [{ ResponseKey, ResponseValue}, body] = await workerModel.get(serverLocation).send("server/console/ws", data.body);
    response.wsSend(data.ws, ResponseKey, ResponseValue, body);
    return;
  }

  MCSERVER.log(`[${serverName}] >>> 拒绝用户 ${userName} 控制台监听`);
  data.WsSession["console"] = undefined;
});

//前端退出控制台界面
WebSocketObserver().listener("server/console/remove",async (data) => {
  //单页退出时触发

  for (let k in MCSERVER.allSockets) {
    if (MCSERVER.allSockets[k].uid == data.WsSession.uid) {
      //MCSERVER.allSockets[k]["console"] = undefined;
      if(!MCSERVER.allSockets[k].console)return false;
      const server = serverModel.ServerManager().getServer(MCSERVER.allSockets[k]["console"]);
      let serverLocation = server.dataModel.location;
      if (!workerModel.get(serverLocation)) {
        response.wsMsgWindow(data.ws, "创建出错:" + "Worker不存在");
      }
      let [{ ResponseKey, ResponseValue}, body] = await workerModel.get(serverLocation).send("server/console/remove", MCSERVER.allSockets[k]["console"]);
      response.wsSend(data.ws,ResponseKey,ResponseValue,body);
      MCSERVER.allSockets[k]["console"] = undefined;
      return;
    }
  }
});
const { autoLoadModule } = require("../../core/tools");
autoLoadModule("route/websocket/console", "console/", (path) => {
  require(path);
});
