const { WebSocketObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");
const permssion = require("../../helper/Permission");
const WorkerCenter = require("../../model/WorkerModel");

WebSocketObserver().listener("workers", (data) => {
  //Object {ws: WebSocket, req: IncomingMessage, user: undefined, header: Object, body: "[body 开始]
  //Object {RequestKey: "req", RequestValue: "some"}
  if (!permssion.hasRights(data.WsSession.username,"workers")) return;

  response.wsSend(data.ws,"workers",{items:WorkerCenter.getWorkerList()});
});
WebSocketObserver().listener("workers/view", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"workers")) return;

  let worker = WorkerCenter.get(data.body.trim());
  response.wsSend(data.ws, "workers/view", {
    workername: worker.dataModel.workername,
    lastDate: worker.dataModel.lastDate,
    createDate: worker.dataModel.createDate,
    MasterKey: worker.dataModel.MasterKey || "",
    RemoteDescription: worker.dataModel.RemoteDescription || []
  });
});
WebSocketObserver().listener("workers/upinfo", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"workers")) return;

  try {
    let newWorkerConfig = JSON.parse(data.body);
    let workername = newWorkerConfig.workername.trim();
    let newworkername = newWorkerConfig.newworkername.trim();
    let newMasterKey = newWorkerConfig.newMasterKey.trim();
    let newRemoteDescription = newWorkerConfig.newRemoteDescription

    //更改服务器拥有列表
    var newEndpoint=newRemoteDescription.endpoint.trim()
    //如果需求，则更改地址
    if (newEndpoint.trim() != "") {
      var vaildURL=false;
      try{new URL(newEndpoint);vaildURL=true;}catch{}
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
      let oldWorker=WorkerCenter.get(workername);
      let connected=oldWorker.connected;
      if(connected)oldWorker.disconnect();
      WorkerCenter.reWorkername(workername, newworkername);
      if(connected)WorkerCenter.get(newworkername).connect();
      WorkerCenter.get(newworkername).dataModel.save();
    } else {
      WorkerCenter.get(workername).dataModel.save();
    }

    //其数据模型保存
    response.wsMsgWindow(data.ws, "更新Worker数据完成√");
    return;
  } catch (e) {
    response.wsMsgWindow(data.ws, "错误：更新Worker数据错误：" + e);
    MCSERVER.error(e);
  }
});
WebSocketObserver().listener("workers/up", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"workers")) return;
  var ro=JSON.parse(data.body) //RequestObject
  let worker = WorkerCenter.get(ro.workername.trim());
  worker.connect(data.ws).then(function(success){
    if(success){
      response.wsMsgWindow(data.ws,"连接成功")
    }else{
      response.wsMsgWindow(data.ws,"连接失败")
    }
    response.wsSend(data.ws, "workers/up", {});
  });
});
WebSocketObserver().listener("workers/down", (data) => {
  if (!permssion.hasRights(data.WsSession.username,"workers")) return;
  var ro=JSON.parse(data.body) //RequestObject
  let worker = WorkerCenter.get(ro.workername.trim());
  worker.disconnect()
  response.wsSend(data.ws, "workers/down", {});
});
WebSocketObserver().listener("workers/add", (data) => {
  //Object {ws: WebSocket, req: IncomingMessage, user: undefined, header: Object, body: "[body 开始]
  //Object {RequestKey: "req", RequestValue: "some"}
  if (!permssion.hasRights(data.WsSession.username,"workers")) return;
  var ro=JSON.parse(data.body) //RequestObject
  var newEndpoint=ro.RemoteDescription.endpoint.trim()
  var vaildURL=false;
  try{new URL(newEndpoint);vaildURL=true;}catch{}
  if (!vaildURL) {
    response.wsMsgWindow(data.ws, "新的地址格式不正确");
    return false;
  }
  WorkerCenter.createWorker(ro.workername.trim(),ro.MasterKey,ro.RemoteDescription);
  response.wsSend(data.ws,"workers/add",null);
});
WebSocketObserver().listener("workers/delete", (data) => {
  //Object {ws: WebSocket, req: IncomingMessage, user: undefined, header: Object, body: "[body 开始]
  //Object {RequestKey: "req", RequestValue: "some"}
  if (!permssion.hasRights(data.WsSession.username,"workers")) return;
  var ro=JSON.parse(data.body) //RequestObject
  let worker=WorkerCenter.get(ro.workername);
  if(worker.connected)worker.disconnect();
  WorkerCenter.deleteWorker(ro.workername.trim());
  response.wsSend(data.ws,"workers/delete",null)
});
WebSocketObserver().listener("workers/center",async (data) => {
  if (!permssion.hasRights(data.WsSession.username,"workers")) return;

  let workerName = data.body.trim();
  try {
    if(!WorkerCenter.get(workerName)){
      response.wsMsgWindow(data.ws, "访问出错:" + "Worker不存在");
    }
    var worker=WorkerCenter.get(workerName);
    var view=await worker.send("center/show",data.body);
    var split=(view).split("\n\n");
    var res=JSON.parse(split[0]);
    if(res.ResponseKey!=="center/show")return false;
    res.ResponseKey="workers/center";
    split[0]=JSON.stringify(res);
    data.ws.send(split.join("\n\n"));
  } catch (e) {
    response.wsSend(data.ws, "workers/center", null);
    response.wsMsgWindow(data.ws, "访问Worker失败" + e);
  }
});
WebSocketObserver().listener("workers/restart",async (data) => {
  if (!permssion.hasRights(data.WsSession.username,"workers")) return;

  let workerName = data.body.trim();
  try {
    if(!WorkerCenter.get(workerName)){
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    var worker=WorkerCenter.get(workerName);
    var view=await worker.send("center/restart",data.body);
    var split=(view).split("\n\n");
    var res=JSON.parse(split[0]);
    if(res.ResponseKey!=="center/restart")return false;
    res.ResponseKey="workers/restart";
    split[0]=JSON.stringify(res);
    data.ws.send(split.join("\n\n"));
  } catch (e) {
    response.wsSend(data.ws, "workers/restart", null);
    response.wsMsgWindow(data.ws, "访问Worker失败" + e);
  }
});