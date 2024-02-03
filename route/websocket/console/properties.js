const response = require("../../../helper/Response");
const serverModel = require("../../../model/ServerModel");
const permission = require("../../../helper/Permission");
const { WebSocketObserver } = require("../../../model/WebSocketModel");

//获取配置
WebSocketObserver().listener("server/properties", async (data) => {
  let serverName = data.body.trim();
  if (permission.isCanServer(data.WsSession.username, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    let [{ ResponseValue }, body] = await worker.send("server/properties", data.body);
    response.wsResponse(data, ResponseValue, body);
  }
});

//更新配置
WebSocketObserver().listener("server/properties_update", async (data) => {
  let config = data.body;
  let properties = config.properties;
  var serverName = config.serverName;
  if (permission.isCanServer(data.WsSession.username, config.serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    let [{ ResponseValue }, body] = await worker.send("server/properties_update", data.body);
    response.wsResponse(data, ResponseValue, body);
  }
});

//从文件重新读取
WebSocketObserver().listener("server/properties_update_reload", async (data) => {
  let serverName = data.body.trim();
  if (permission.isCanServer(data.WsSession.username, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    let [{ ResponseValue }, body] = await worker.send("server/properties_update_reload", data.body);
    response.wsResponse(data, ResponseValue, body);
  }
});
