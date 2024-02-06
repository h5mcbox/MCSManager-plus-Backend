const response = require("../../../helper/Response");
const serverModel = require("../../../model/ServerModel");
const permssion = require("../../../helper/Permission");
const { WebSocketObserver } = require("../../../model/WebSocketModel");
//const os = require("os");

const mcPingProtocol = require("../../../helper/MCPingProtocol");

//控制台信息获取
WebSocketObserver().listener("server/console", async (data) => {
  // permssion.needLogin(req, res);
  let userName = data.WsSession.username;
  let serverName = data.body.trim();

  if (permssion.isCanServer(userName, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      response.wsResponse(data, false);
    }
    let [{ ResponseValue }, body] = await worker.call("server/console", data.body);
    response.wsResponse(data, ResponseValue, body);
    // MCSERVER.log('准许用户 [' + userName + '] 获取控制台实时数据');
  }
});
