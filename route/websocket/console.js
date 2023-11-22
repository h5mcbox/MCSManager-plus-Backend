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

WorkerObserver().listener("server/console/ws", async ({ body }) => {
  for (let [serverName, buffer] of Object.entries(body)) {
    selectWebsocket(serverName, (socket) => {
      response.wsSend(socket.ws, "server/console/ws", {}, buffer);
    });
  }
});

//日志缓存记录器
MCSERVER.consoleLog = {};
//控制请求监听控制台实例
WebSocketObserver().listener("server/console/ws", async (data) => {
  let userName = data.WsSession.username;
  let serverName = data.body.trim();

  if (permission.isCanServer(userName, serverName)) {
    MCSERVER.log(`[${serverName}] >>> 准许用户 ${userName} 控制台监听`);
    /*
    // 重置用户历史指针
    const instanceLogHistory = serverModel.ServerManager().getServer(serverName).logHistory;
    if (instanceLogHistory) instanceLogHistory.setPoint(userName, 0);
    return;
    */
    // 设置监听终端
    data.WsSession["console"] = serverName;
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    let [{ ResponseKey, ResponseValue }, body] = await worker.call("server/console/ws", data.body);
    response.wsSend(data.ws, ResponseKey, ResponseValue, body);
    return;
  }

  MCSERVER.log(`[${serverName}] >>> 拒绝用户 ${userName} 控制台监听`);
  data.WsSession["console"] = undefined;
});

//前端退出控制台界面
WebSocketObserver().listener("server/console/remove", async (data) => {
  //单页退出时触发

  for (let k in MCSERVER.allSockets) {
    if (MCSERVER.allSockets[k].uid == data.WsSession.uid) {
      //MCSERVER.allSockets[k]["console"] = undefined;
      if (!MCSERVER.allSockets[k].console) return false;
      const { worker } = serverModel.ServerManager().getServer(MCSERVER.allSockets[k]["console"]);
      if (!worker) {
        response.wsMsgWindow(data.ws, "创建出错:" + "Worker不存在");
      }
      let [{ ResponseKey, ResponseValue }, body] = await worker.call("server/console/remove", MCSERVER.allSockets[k]["console"]);
      response.wsSend(data.ws, ResponseKey, ResponseValue, body);
      MCSERVER.allSockets[k]["console"] = undefined;
      return;
    }
  }
});
const { autoLoadModule } = require("../../core/tools");
autoLoadModule("route/websocket/console", "console/", (path) => {
  require(path);
});
