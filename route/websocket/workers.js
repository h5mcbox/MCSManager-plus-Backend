const { WebSocketObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");
const permssion = require("../../helper/Permission");
const WorkerCenter = require("../../model/WorkerModel");

WebSocketObserver().listener("workers", (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:overview")) return;

  response.wsResponse(data, { items: WorkerCenter.getWorkerList() });
});
WebSocketObserver().listener("workers/view", (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:view")) return;

  let worker = WorkerCenter.get(data.body.trim());
  response.wsResponse(data, {
    workername: worker.dataModel.workername,
    lastDate: worker.dataModel.lastDate,
    createDate: worker.dataModel.createDate,
    MasterKey: worker.dataModel.MasterKey || "",
    RemoteDescription: worker.dataModel.RemoteDescription || []
  });
});
WebSocketObserver().listener("workers/upinfo", (data) => {
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
    response.wsResponse(data, true);
    return;
  } catch (e) {
    response.wsMsgWindow(data.ws, "错误：更新Worker数据错误：" + e);
    response.wsResponse(data, false);
    MCSERVER.error(e);
  }
});
WebSocketObserver().listener("workers/connect", async data => {
  if (!permssion.hasRights(data.WsSession.username, "workers:connect")) return;
  let ro = data.body //RequestObject
  let worker = WorkerCenter.get(ro.workername.trim());
  let success = worker.connect(data.ws);
  if (success) {
    response.wsMsgWindow(data.ws, "连接成功")
  } else {
    response.wsMsgWindow(data.ws, "连接失败")
  }
  response.wsResponse(data, success);
});
WebSocketObserver().listener("workers/disconnect", (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:disconnect")) return;
  let ro = data.body //RequestObject
  let worker = WorkerCenter.get(ro.workername.trim());
  worker.disconnect();
  response.wsResponse(data, null);
});
WebSocketObserver().listener("workers/add", (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:addWorker")) return;
  let ro = data.body //RequestObject
  let newEndpoint = ro.RemoteDescription.endpoint.trim()
  let vaildURL = false;
  try { new URL(newEndpoint); vaildURL = true; } catch { }
  if (!vaildURL) {
    response.wsMsgWindow(data.ws, "新的地址格式不正确");
    return response.wsResponse(data, false);
  }
  WorkerCenter.createWorker(ro.workername.trim(), ro.MasterKey, ro.RemoteDescription);
  return response.wsResponse(data, true);
});
WebSocketObserver().listener("workers/delete", (data) => {
  //Object {ws: WebSocket, req: IncomingMessage, user: undefined, header: Object, body: "[body 开始]
  //Object {RequestKey: "req", RequestValue: "some"}
  if (!permssion.hasRights(data.WsSession.username, "workers:deleteWorker")) return;
  let ro = data.body //RequestObject
  let worker = WorkerCenter.get(ro.workername);
  if (worker.connected) worker.disconnect();
  WorkerCenter.deleteWorker(ro.workername.trim());
  response.wsResponse(data, null)
});
WebSocketObserver().listener("workers/center", async (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:viewWorkerCenter")) return;

  let workerName = data.body.trim();
  try {
    if (!WorkerCenter.get(workerName)) {
      response.wsMsgWindow(data.ws, "访问出错:" + "Worker不存在");
      return response.wsResponse(data, false);
    }
    let worker = WorkerCenter.get(workerName);
    response.wsResponse(data, await worker.call("center/show", data.body));
  } catch (e) {
    response.wsResponse(data, null);
    response.wsMsgWindow(data.ws, "访问Worker失败" + e);
  }
});
WebSocketObserver().listener("workers/restart", async (data) => {
  if (!permssion.hasRights(data.WsSession.username, "workers:restartWorker")) return;

  let workerName = data.body.trim();
  try {
    if (!WorkerCenter.get(workerName)) {
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      return response.wsResponse(data, false);
    }
    let worker = WorkerCenter.get(workerName);
    response.wsResponse(data, await worker.call("center/restart", data.body));
  } catch (e) {
    response.wsResponse(data, null);
    response.wsMsgWindow(data.ws, "访问Worker失败" + e);
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