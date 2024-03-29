const response = require("../../../helper/Response");
var serverModel = require("../../../model/ServerModel");
const permission = require("../../../helper/Permission");
const { WebSocketObserver } = require("../../../model/WebSocketModel");
//const mcPingProtocol = require("../../../helper/MCPingProtocol");

//开启服务器
WebSocketObserver().define("server/console/open", async data => {
  let serverName = data.body.trim();
  let userName = data.WsSession.username;

  if (permission.isCanServer(userName, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      return false;
    }
    return await worker.call("server/console/open", data.body);
  }
  return null;
});
