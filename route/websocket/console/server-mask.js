const response = require("../../../helper/Response");
const serverModel = require("../../../model/ServerModel");
const workerModel=require("../../../model/WorkerModel");
const permssion = require("../../../helper/Permission");
const { WebSocketObserver } = require("../../../model/WebSocketModel");

//自动重启设定
WebSocketObserver().listener("server/console/autorestart", (data) => {
  let serverName = data.body.trim();
  let userName = data.WsSession.username;
  if (permssion.isCanServer(userName, serverName)) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    workerModel.get(serverLocation).send("server/console/autorestart",data.body).then((_)=>{data.ws.send(_)})
  }
  response.wsMsgWindow(data.ws, "权限不足!您并不拥有此服务器.");
});
