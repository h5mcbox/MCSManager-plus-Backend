const { WebSocketObserver } = require("../../model/WebSocketModel");
const { userCenter } = require("../../model/UserModel");
const serverModel = require("../../model/ServerModel");
const permssion = require("../../helper/Permission");
const response = require("../../helper/Response");

// 保存配置
WebSocketObserver().listener("mcping/config_save", async (data) => {
  const { body } = data;
  const serverName = body.mcpingServerName;
  const userName = data.WsSession.username;
  const user = userCenter().get(userName);
  if (!user) {
    return;
  }
  if (permssion.isCanServer(userName, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    let [{ ResponseValue }, body] = await worker.call("mcping/config_save", data.body);
    response.wsResponse(data, ResponseValue, body);
  }
});

// 获取配置
// 获取配置是公开的，任何人可以获取到你填写的配置，无权限控制
WebSocketObserver().listener("mcping/config", async (data) => {
  const serverName = data.body || "";
  if (serverName) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      return response.wsResponse(data, false);
    }
    let [{ ResponseValue }, body] = await worker.call("mcping/config", data.body);
    response.wsResponse(data, ResponseValue, body);
  }
});
