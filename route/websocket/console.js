const { WebSocketObserver, WorkerObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");
const serverModel = require("../../model/ServerModel");
const permission = require("../../helper/Permission");
//const { LogHistory } = require("../../helper/LogHistory");

//控制台信息广播
function selectWebsocket(serverName, callback) {
  for (let client of Object.values(MCSERVER.allSockets)) {
    if (client["console"] === serverName) {
      callback(client);
    }
  }
}

WorkerObserver().define("server/console/ws", async data => {
  for (let [serverName, buffer] of Object.entries(data.ResponseValue)) selectWebsocket(serverName, socket => response.wsSend(socket.ws, "server/console/ws", buffer));
});

//日志缓存记录器
MCSERVER.consoleLog = {};
//控制请求监听控制台实例
WebSocketObserver().define("server/console/ws", async data => {
  let userName = data.WsSession.username;
  let serverName = data.body.trim();

  if (permission.isCanServer(userName, serverName)) {
    MCSERVER.log(`[${serverName}] >>> 准许用户 ${userName} 控制台监听`);
    // 设置监听终端
    data.WsSession["console"] = serverName;
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      return false;
    }
    return await worker.call("server/console/ws", { serverName, userName });
  }

  MCSERVER.log(`[${serverName}] >>> 拒绝用户 ${userName} 控制台监听`);
  data.WsSession["console"] = undefined;
});

//前端退出控制台界面
WebSocketObserver().define("server/console/remove", async data => {
  //单页退出时触发

  for (let k in MCSERVER.allSockets) {
    if (MCSERVER.allSockets[k].uid == data.WsSession.uid) {
      //MCSERVER.allSockets[k]["console"] = undefined;
      if (!MCSERVER.allSockets[k].console) return false;
      const { worker } = serverModel.ServerManager().getServer(MCSERVER.allSockets[k]["console"]);
      if (!worker) {
        response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
        return false;
      }
      let original = MCSERVER.allSockets[k]["console"];
      MCSERVER.allSockets[k]["console"] = undefined;
      return await worker.call("server/console/remove", original);
    }
  }
});
const { autoLoadModule } = require("../../core/tools");
autoLoadModule("route/websocket/console", "console/", (path) => {
  require(path);
});
