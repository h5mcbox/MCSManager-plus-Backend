const response = require("../../../helper/Response");
var serverModel = require("../../../model/ServerModel");
const permssion = require("../../../helper/Permission");
const workerModel=require("../../../model/WorkerModel");
const { WebSocketObserver } = require("../../../model/WebSocketModel");

//获取配置
WebSocketObserver().listener("server/properties", (data) => {
  let serverName = data.body.trim();
  if (permssion.isCanServer(data.WsSession.username, serverName)) {
      const server = serverModel.ServerManager().getServer(serverName);
      let serverLocation = server.dataModel.location;
      if(!workerModel.get(serverLocation)){
        response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
      }
      workerModel.get(serverLocation).send("server/properties",data.body).then((_)=>{data.ws.send(_)})
  }
});

//更新配置
WebSocketObserver().listener("server/properties_update", (data) => {
  let config = JSON.parse(data.body);
  let properties = config.properties;
  var serverName=config.serverName;
  if (permssion.isCanServer(data.WsSession.username, config.serverName)) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    workerModel.get(serverLocation).send("server/properties_update",data.body).then((_)=>{data.ws.send(_)})
  }
});

//从文件重新读取
WebSocketObserver().listener("server/properties_update_reload", (data) => {
  let serverName = data.body.trim();
  if (permssion.isCanServer(data.WsSession.username, serverName)) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    workerModel.get(serverLocation).send("server/properties_update_reload",data.body).then((_)=>{data.ws.send(_)})
  }
});
