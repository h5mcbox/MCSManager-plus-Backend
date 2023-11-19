const response = require("../../../helper/Response");
var serverModel = require("../../../model/ServerModel");
const permssion = require("../../../helper/Permission");
const { WebSocketObserver } = require("../../../model/WebSocketModel");
const mcPingProtocol = require("../../../helper/MCPingProtocol");
const workerModel=require("../../../model/WorkerModel");

//开启服务器
WebSocketObserver().listener("server/console/open",async (data) => {
  let serverName = data.body.trim();
  let userName = data.WsSession.username;
  
  if (permssion.isCanServer(userName, serverName)) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "启动出错:" + "Worker不存在");
    }
    let [{ ResponseKey, ResponseValue }, body] = await workerModel.get(serverLocation).send("server/console/open", data.body);
    response.wsSend(data.ws, ResponseKey, ResponseValue, body);
    workerModel.get(serverLocation).send("server/console/open",data.body).then((_)=>{data.ws.send(_)})
  }
  response.wsSend(data.ws, "server/console/open", null);
});
