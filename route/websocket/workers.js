const { WebSocketObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");
const permssion = require("../../helper/Permission");
const WorkerCenter = require("../../model/WorkerModel");

WebSocketObserver().define("workers", (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:overview")) return;

  return { items: WorkerCenter.getWorkerList() };
});
WebSocketObserver().define("workers/view", (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:view")) return;

  let worker = WorkerCenter.get(data.body.trim());
  return {
    workername: worker.dataModel.workername,
    lastDate: worker.dataModel.lastDate,
    createDate: worker.dataModel.createDate,
    MasterKey: worker.dataModel.MasterKey || "",
    RemoteDescription: worker.dataModel.RemoteDescription || []
  };
});
WebSocketObserver().define("workers/upinfo", (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:uploadInfomation")) return;

  try {
    let newWorkerConfig = data.body;
    let workername = newWorkerConfig.workername.trim();
    let newworkername = newWorkerConfig.newworkername.trim();
    let newMasterKey = newWorkerConfig.newMasterKey.trim();
    let newRemoteDescription = newWorkerConfig.newRemoteDescription

    //更改服务器拥有列表
    let newEndpoint = newRemoteDescription.endpoint.trim()
    //如果需求，则更改地址
    if (newEndpoint.trim() != "") {
      let vaildURL = false;
      try { new URL(newEndpoint); vaildURL = true; } catch { }
      if (!vaildURL) {
        response.wsMsgWindow(data.ws, "新的地址格式不正确，已舍弃远程端点的更改");
      } else {
        WorkerCenter.reRemoteDescription(workername, newRemoteDescription);
      }
    }
    //如果需求，则更改主密钥
    if (newMasterKey.trim() != "") {
      WorkerCenter.reMasterKey(workername, newMasterKey);
    }

    //如果需求，则更改Worker名以及存储文件
    if (workername != newworkername) {
      let oldWorker = WorkerCenter.get(workername);
      let connected = oldWorker.connected;
      if (connected) oldWorker.disconnect();
      WorkerCenter.reWorkername(workername, newworkername);
      if (connected) WorkerCenter.get(newworkername).connect();
      WorkerCenter.get(newworkername).dataModel.save();
    } else {
      WorkerCenter.get(workername).dataModel.save();
    }

    //其数据模型保存
    response.wsMsgWindow(data.ws, "更新Worker数据完成√");
    return true;
  } catch (e) {
    response.wsMsgWindow(data.ws, "错误：更新Worker数据错误：" + e);
    MCSERVER.error(e);
    return false;
  }
});
WebSocketObserver().define("workers/connect", async data => {
  if (!permssion.hasRights(data.WsSession.username, "workers:connect")) return;
  let ro = data.body //RequestObject
  let worker = WorkerCenter.get(ro.workername.trim());
  let success = worker.connect(data.ws);
  if (success) {
    response.wsMsgWindow(data.ws, "连接成功")
  } else {
    response.wsMsgWindow(data.ws, "连接失败")
  }
  return success;
});
WebSocketObserver().define("workers/disconnect", (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:disconnect")) return;
  let ro = data.body //RequestObject
  let worker = WorkerCenter.get(ro.workername.trim());
  worker.disconnect();
  return null;
});
WebSocketObserver().define("workers/add", (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:addWorker")) return;
  let ro = data.body //RequestObject
  let newEndpoint = ro.RemoteDescription.endpoint.trim()
  let vaildURL = false;
  try { new URL(newEndpoint); vaildURL = true; } catch { }
  if (!vaildURL) {
    response.wsMsgWindow(data.ws, "新的地址格式不正确");
    return false;
  }
  WorkerCenter.createWorker(ro.workername.trim(), ro.MasterKey, ro.RemoteDescription);
  return true;
});
WebSocketObserver().define("workers/delete", (data) => {
  //Object {ws: WebSocket, req: IncomingMessage, user: undefined, header: Object, body: "[body 开始]
  //Object {RequestKey: "req", RequestValue: "some"}
  if (!permssion.hasRights(data.WsSession.username, "workers:deleteWorker")) return;
  let ro = data.body //RequestObject
  let worker = WorkerCenter.get(ro.workername);
  if (worker.connected) worker.disconnect();
  WorkerCenter.deleteWorker(ro.workername.trim());
  return null;
});
WebSocketObserver().define("workers/center", async (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:viewWorkerCenter")) return;

  let workerName = data.body.trim();
  try {
    if (!WorkerCenter.get(workerName)) {
      response.wsMsgWindow(data.ws, "访问出错:" + "Worker不存在");
      return false;
    }
    let worker = WorkerCenter.get(workerName);
    return await worker.call("center/show", data.body);
  } catch (e) {
    response.wsMsgWindow(data.ws, "访问Worker失败" + e);
    return null;
  }
});
WebSocketObserver().define("workers/restart", async (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:restartWorker")) return;

  let workerName = data.body.trim();
  try {
    if (!WorkerCenter.get(workerName)) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      return false;
    }
    let worker = WorkerCenter.get(workerName);
    return await worker.call("center/restart", data.body);
  } catch (e) {
    response.wsMsgWindow(data.ws, "访问Worker失败" + e);
    return null;
  }
});
MCSERVER.addProbablyPermissions("workers", "管理分布式服务");
MCSERVER.addProbablyPermissions("workers:overview", "访问分布式服务中心");
MCSERVER.addProbablyPermissions("workers:view", "访问详细信息");
MCSERVER.addProbablyPermissions("workers:uploadInfomation", "保存Worker配置");
MCSERVER.addProbablyPermissions("workers:connect", "连接Worker");
MCSERVER.addProbablyPermissions("workers:disconnect", "断开与Worker的链接");
MCSERVER.addProbablyPermissions("workers:addWorker", "新增Worker");
MCSERVER.addProbablyPermissions("workers:deleteWorker", "删除Worker");
MCSERVER.addProbablyPermissions("workers:center", "访问Worker控制中心");
MCSERVER.addProbablyPermissions("workers:restart", "重启Worker");