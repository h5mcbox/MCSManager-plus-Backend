const response = require("../../../helper/Response");
const serverModel = require("../../../model/ServerModel");
const permission = require("../../../helper/Permission");
const { WebSocketObserver } = require("../../../model/WebSocketModel");

//自动重启设定
WebSocketObserver().listener("server/console/autorestart", async (data) => {
  let serverName = data.body.trim();
  let userName = data.WsSession.username;
  if (permission.isCanServer(userName, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      return response.wsResponse(data, false);
    }
    let [{ ResponseValue }, body] = await worker.call("server/console/autorestart", data.body);
    response.wsResponse(data, ResponseValue, body);
  }
  response.wsMsgWindow(data.ws, "权限不足!您并不拥有此服务器.");
});
