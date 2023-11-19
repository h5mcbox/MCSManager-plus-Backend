const { WebSocketObserver } = require("../../../model/WebSocketModel");
const response = require("../../../helper/Response");
var serverModel = require("../../../model/ServerModel");
const permssion = require("../../../helper/Permission");
const workerModel=require("../../../model/WorkerModel");

const mcPingProtocol = require("../../../helper/MCPingProtocol");

//发送指令
WebSocketObserver().listener("server/console/command",async (data) => {
  let par = JSON.parse(data.body);
  let serverName = par.serverName.trim();
  let command = par.command;
  let userName = data.WsSession.username;
  if (permssion.isCanServer(userName, serverName)) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    let [{ ResponseKey, ResponseValue }, body] = await workerModel.get(serverLocation).send("server/console/command", data.body);
    response.wsSend(data.ws, ResponseKey, ResponseValue, body);
  }
  response.wsSend(data.ws, "server/console/command", null);
});