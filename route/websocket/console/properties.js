const response = require("../../../helper/Response");
const serverModel = require("../../../model/ServerModel");
const permission = require("../../../helper/Permission");
const { WebSocketObserver } = require("../../../model/WebSocketModel");

//获取配置
WebSocketObserver().listener("server/properties", async (data) => {
  let [serverName] = data.body;
  if (permission.isCanServer(data.WsSession.username, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    let [{ ResponseValue }, body] = await worker.call("server/properties", data.body);
    response.wsResponse(data, ResponseValue, body);
  }
});
//获取配置列表
WebSocketObserver().listener("server/propertiesList", async (data) => {
  let serverName = data.body.trim();
  if (permission.isCanServer(data.WsSession.username, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      return response.wsResponse(data, false);
    }
    let [{ ResponseValue }, body] = await worker.call("server/propertiesList", data.body);
    response.wsResponse(data, ResponseValue, body);
  }
});

//更新配置
WebSocketObserver().listener("server/properties_update", async (data) => {
  let config = data.body;
  let serverName = config.serverName;
  if (permission.isCanServer(data.WsSession.username, config.serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    let [{ ResponseValue }, body] = await worker.call("server/properties_update", config);
    response.wsResponse(data, ResponseValue, body);
  }
});

//从文件重新读取
WebSocketObserver().listener("server/properties_update_reload", async (data) => {
  let [serverName] = data.body;
  if (permission.isCanServer(data.WsSession.username, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      response.wsResponse(data, false);
    }
    let [{ ResponseValue }, body] = await worker.call("server/properties_update_reload", data.body);
    response.wsResponse(data, ResponseValue, body);
  }
});
