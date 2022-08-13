const { WebSocketObserver } = require("../../model/WebSocketModel");
const { userCenter } = require("../../model/UserModel");
const serverModel = require("../../model/ServerModel");
const permssion = require("../../helper/Permission");
const response = require("../../helper/Response");
const workerModel = require("../../model/WorkerModel");

// 保存配置
WebSocketObserver().listener("mcping/config_save", (data) => {
  const jsonObject = JSON.parse(data.body);
  const serverName = jsonObject.mcpingServerName;
  const userName = data.WsSession.username;
  const user = userCenter().get(userName);
  if (!user) {
    return;
  }
  if (permssion.isCanServer(userName, serverName)) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    workerModel.get(serverLocation).send("mcping/config_save",data.body).then((_)=>{data.ws.send(_)});
  }
  //response.wsSend(data.ws, "mcping/config_save", true);
});

// 获取配置
// 获取配置是公开的，任何人可以获取到你填写的配置，无权限控制
WebSocketObserver().listener("mcping/config", (data) => {
  const serverName = data.body || "";
  if (serverName) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    workerModel.get(serverLocation).send("mcping/config",data.body).then((_)=>{data.ws.send(_)})
  }
});
