const { WebSocketObserver } = require("../../model/WebSocketModel");
const serverModel = require("../../model/ServerModel");
const workerModel = require("../../model/WorkerModel");
const response = require("../../helper/Response");
const permssion = require("../../helper/Permission");

WebSocketObserver().define("server/view", async data => {
  if (!permssion.hasRights(data.WsSession.username, "server:overview")) return;
  let allServers = [];
  for (let item of workerModel.getOnlineWorkers()) {
    (await item.call("server/view", data.body)).items.forEach(e => allServers.push(e));
  }
  return {
    items: allServers
  };
});

WebSocketObserver().define("server/get", async data => {
  //服务器名在 data.body 里面
  if (!permssion.hasRights(data.WsSession.username, "server:getServer")) return;

  let serverName = data.body.trim();
  let mcserver = serverModel.ServerManager().getServer(serverName);
  if (mcserver == null) {
    response.wsMsgWindow(data.ws, "服务端 " + serverName + " 不存在！请刷新或自行检查。");
    return false;
  }

  if (!mcserver.worker) {
    response.wsMsgWindow(data.ws, "获取出错:" + "Worker不存在");
    return false;
  }
  let worker = mcserver.worker;
  let servInfo = await worker.call("server/get", data.body);
  servInfo.location = mcserver.location;
  return servInfo;
});

WebSocketObserver().define("server/create", async data => {
  if (!permssion.hasRights(data.WsSession.username, "server:createServer")) return;

  let ServerConfig = data.body;
  let serverName = ServerConfig.serverName.trim();
  let serverLocation = ServerConfig.location.trim();
  if (serverName.indexOf(".") != -1) {
    response.wsMsgWindow(data.ws, '不可包含 "." 字符');
    return false;
  }
  try {
    let worker = workerModel.get(serverLocation);
    if (!worker) {
      response.wsMsgWindow(data.ws, "创建出错:" + "Worker不存在");
    }
    serverModel.createServer(serverName, ServerConfig);
    return await worker.call("server/create", data.body);
  } catch (err) {
    response.wsMsgWindow(data.ws, "创建出错:" + err);
    MCSERVER.error("创建服务器时出错", err);
    return false;
  }
});

WebSocketObserver().define("server/create_dir", async data => {
  if (!permssion.hasRights(data.WsSession.username, "server:create_dir")) return;

  let ServerConfig = data.body;
  const { worker } = serverModel.ServerManager().getServer(ServerConfig.serverName);
  if (!worker) {
    response.wsMsgWindow(data.ws, "创建出错:" + "Worker不存在");
    return false;
  }
  try {
    return await worker.call("server/create_dir", data.body);
  } catch (e) {
    response.wsMsgWindow(data.ws, "创建目录" + ServerConfig.cwd + "出错");
    return false;
  }
});

WebSocketObserver().define("server/rebuilder", async data => {
  if (!permssion.hasRights(data.WsSession.username, "server:rebuilder")) return;
  let ServerConfig = data.body;
  let oldServerName = ServerConfig.oldServerName.trim();
  const { worker } = serverModel.ServerManager().getServer(oldServerName);
  if (!worker) {
    response.wsMsgWindow(data.ws, "修改出错:" + "Worker不存在");
    return false;
  }
  return await worker.call("server/rebuilder", data.body);
});

WebSocketObserver().define("server/delete", async data => {
  if (!permssion.hasRights(data.WsSession.username, "server:deleteServer")) return;

  let serverName = data.body.trim();
  try {
    const { worker } = serverModel.ServerManager().getServer(serverName);
    if (!worker) {
      response.wsMsgWindow(data.ws, "删除出错:" + "Worker不存在");
      return false;
    }
    serverModel.deleteServer(serverName);
    return await worker.call("server/delete", data.body);
  } catch (e) {
    response.wsMsgWindow(data.ws, "删除服务器失败" + e);
    return false;
  }
});

//服务器批量启动与关闭
WebSocketObserver().define("server/opt_all", async data => {
  if (!permssion.hasRights(data.WsSession.username, "server:operateAllServer")) return;

  try {
    for (let item of workerModel.getOnlineWorkers()) await item.call("server/opt_all");
    return true;
  } catch (err) {
    response.wsMsgWindow(data.ws, "执行失败:" + err);
    return false;
  }
});
MCSERVER.addProbablyPermissions("server:overview", "获取服务器列表");
MCSERVER.addProbablyPermissions("server:getServer", "返回单个服务器详细数据");
MCSERVER.addProbablyPermissions("server:createServer", "新建服务器");
MCSERVER.addProbablyPermissions("server:create_dir", "新建服务器目录");
MCSERVER.addProbablyPermissions("server:rebuilder", "修改服务器配置");
MCSERVER.addProbablyPermissions("server:deleteServer", "删除服务器");
MCSERVER.addProbablyPermissions("server:operateAllServer", "服务器批量启动与关闭");