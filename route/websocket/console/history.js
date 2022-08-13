const { WebSocketObserver } = require("../../../model/WebSocketModel");
const permssion = require("../../../helper/Permission");
const serverModel = require("../../../model/ServerModel");
const workerModel = require("../../../model/WorkerModel");
const response = require("../../../helper/Response");

const HISTORY_SIZE_LINE = 1024;

// 正序历史记录路由
WebSocketObserver().listener("server/console/history", (data) => {
  let userName = data.WsSession.username;
  let bodyJson = JSON.parse(data.body);
  let serverName = bodyJson["serverName"] || "";

  if (permssion.isCanServer(userName, serverName)) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    workerModel.get(serverLocation).send("server/console/history",data.body).then((_)=>{data.ws.send(_)})
  }
});
/*
// 首次进入终端使用,倒序历史记录路由
WebSocketObserver().listener("server/console/history_reverse", (data) => {
  let userName = data.WsSession.username;
  let bodyJson = JSON.parse(data.body);
  let serverName = bodyJson["serverName"] || "";

  if (permssion.isCanServer(userName, serverName)) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    workerModel.get(serverLocation).send("server/console/history_reverse",data.body).then((_)=>{data.ws.send(_)})
  }
});
*/
// 历史指针重置路由
/*
WebSocketObserver().listener("server/console/history_reset", (data) => {
  let userName = data.WsSession.username;
  let bodyJson = JSON.parse(data.body);
  let serverName = bodyJson["serverName"] || "";

  if (permssion.isCanServer(userName, serverName)) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "创建出错:" + "Worker不存在");
    }
    workerModel.get(serverLocation).send("server/console/history_reset",data.body).then((_)=>{data.ws.send(_)})
  }
});
*/