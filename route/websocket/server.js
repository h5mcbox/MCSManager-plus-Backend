const { WebSocketObserver } = require("../../model/WebSocketModel");
const serverModel = require("../../model/ServerModel");
const workerModel = require("../../model/WorkerModel");
const response = require("../../helper/Response");
const permssion = require("../../helper/Permission");

WebSocketObserver().listener("server/view", async (data) => {
  if (!permssion.hasRights(data.WsSession.username, "server:overview")) return;
  let allServers = [];
  for (let item of workerModel.getOnlineWorkers()) {
    let [{ ResponseKey, ResponseValue }] = await item.call("server/view", data.body);
    if (ResponseKey !== "server/view") return false;
    ResponseValue.items.forEach(e => allServers.push(e));
  }
  response.wsSend(data.ws, "server/view", {
    items: allServers
  });
});

WebSocketObserver().listener("server/get", async (data) => {
  //服务器名在 data.body 里面
  if (!permssion.hasRights(data.WsSession.username, "server:getServer")) return;

  let serverName = data.body.trim();
  let mcserver = serverModel.ServerManager().getServer(serverName);
  if (mcserver == null) {
    response.wsMsgWindow(data.ws, "服务端 " + serverName + " 不存在！请刷新或自行检查。");
    return;
  }

  if (!mcserver.worker) {
    response.wsMsgWindow(data.ws, "获取出错:" + "Worker不存在");
  }
  let worker = mcserver.worker;
  let [{ ResponseKey, ResponseValue }, body] = await worker.call("server/get", data.body);
  if (ResponseKey !== "server/get") return false;
  ResponseValue.location = mcserver.location;
  response.wsSend(data.ws, ResponseKey, ResponseValue, body);
});

WebSocketObserver().listener("server/create", async (data) => {
  if (!permssion.hasRights(data.WsSession.username, "server:createServer")) return;

  let ServerConfig = data.body;
  let serverName = ServerConfig.serverName.trim();
  let serverLocation = ServerConfig.location.trim();
  if (serverName.indexOf(".") != -1) {
    response.wsMsgWindow(data.ws, '不可包含 "." 字符');
    return;
  }
  try {
    let worker = workerModel.get(serverLocation);
    if (!worker) {
      response.wsMsgWindow(data.ws, "创建出错:" + "Worker不存在");
    }
    serverModel.createServer(serverName, ServerConfig);
    await worker.call("server/create", data.body);
  } catch (err) {
    response.wsMsgWindow(data.ws, "创建出错:" + err);
    MCSERVER.error("创建服务器时出错", err);
    return;
  }
});

WebSocketObserver().listener("server/create_dir", async (data) => {
  if (!permssion.hasRights(data.WsSession.username, "server:create_dir")) return;

  let ServerConfig = data.body;
  const { worker } = serverModel.ServerManager().getServer(ServerConfig.serverName);
  if (!worker) {
    response.wsMsgWindow(data.ws, "创建出错:" + "Worker不存在");
  }
  try {
    let [{ ResponseKey, ResponseValue }, body] = await worker.call("server/create_dir", data.body);
    response.wsSend(data.ws, ResponseKey, ResponseValue, body);
  } catch (e) {
    response.wsMsgWindow(data.ws, "创建目录" + ServerConfig.cwd + "出错");
  }
});

WebSocketObserver().listener("server/rebuilder", async (data) => {
  if (!permssion.hasRights(data.WsSession.username, "server:rebuilder")) return;
  let ServerConfig = data.body;
  let oldServerName = ServerConfig.oldServerName.trim();
  const { worker } = serverModel.ServerManager().getServer(oldServerName);
  if (!worker) {
    response.wsMsgWindow(data.ws, "修改出错:" + "Worker不存在");
  }
  let [{ ResponseKey, ResponseValue }, body] = await worker.call("server/rebuilder", data.body);
  response.wsSend(data.ws, ResponseKey, ResponseValue, body);
});

WebSocketObserver().listener("server/delete", async (data) => {
  if (!permssion.hasRights(data.WsSession.username, "server:deleteServer")) return;

  let serverName = data.body.trim();
  try {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "删除出错:" + "Worker不存在");
    }
    serverModel.deleteServer(serverName);
    worker.call("server/delete", data.body)
  } catch (e) {
    response.wsSend(data.ws, "server/delete", null);
    response.wsMsgWindow(data.ws, "删除服务器失败" + e);
  }
});

//服务器批量启动与关闭
WebSocketObserver().listener("server/opt_all", async (data) => {
  if (!permssion.hasRights(data.WsSession.username, "server:operateAllServer")) return;

  try {
    for (let item of workerModel.getOnlineWorkers()) {
      await item.call("server/opt_all");
    }
  } catch (err) {
    response.wsMsgWindow(data.ws, "执行失败:" + err);
  }
});
MCSERVER.addProbablyPermissions("server:overview", "获取服务器列表");
MCSERVER.addProbablyPermissions("server:getServer", "返回单个服务器详细数据");
MCSERVER.addProbablyPermissions("server:createServer", "新建服务器");
MCSERVER.addProbablyPermissions("server:create_dir", "新建服务器目录");
MCSERVER.addProbablyPermissions("server:rebuilder", "修改服务器配置");
MCSERVER.addProbablyPermissions("server:deleteServer", "删除服务器");
MCSERVER.addProbablyPermissions("server:operateAllServer", "服务器批量启动与关闭");