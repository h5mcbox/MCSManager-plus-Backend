const response = require("../../../helper/Response");
const serverModel = require("../../../model/ServerModel");
const permission = require("../../../helper/Permission");
const { WebSocketObserver } = require("../../../model/WebSocketModel");

//获取配置
WebSocketObserver().define("server/properties", async data => {
  let [serverName] = data.body;
  if (permission.isCanServer(data.WsSession.username, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    return await worker.call("server/properties", data.body);
  }
});
//获取配置列表
WebSocketObserver().define("server/propertiesList", async data => {
  let serverName = data.body.trim();
  if (permission.isCanServer(data.WsSession.username, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      return false;
    }
    return await worker.call("server/propertiesList", data.body);
  }
});

//更新配置
WebSocketObserver().define("server/properties_update", async data => {
  let config = data.body;
  let serverName = config.serverName;
  if (permission.isCanServer(data.WsSession.username, config.serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    return await worker.call("server/properties_update", config);
  }
});

//从文件重新读取
WebSocketObserver().define("server/properties_update_reload", async data => {
  let [serverName] = data.body;
  if (permission.isCanServer(data.WsSession.username, serverName)) {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      return false;
    }
    return await worker.call("server/properties_update_reload", data.body);
  }
});
