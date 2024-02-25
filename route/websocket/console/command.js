const { WebSocketObserver } = require("../../../model/WebSocketModel");
const response = require("../../../helper/Response");
const serverModel = require("../../../model/ServerModel");
const permission = require("../../../helper/Permission");

//const mcPingProtocol = require("../../../helper/MCPingProtocol");

//发送指令
WebSocketObserver().listener("server/console/command", async data => {
  let serverName = data.body.serverName.trim();
  //let command = par.command;
  let userName = data.WsSession.username;
  if (permission.isCanServer(userName, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      return response.wsResponse(data, false);
    }
    response.wsResponse(data, await worker.call("server/console/command", data.body));
  }
  response.wsResponse(data, null);
});