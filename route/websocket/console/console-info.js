const response = require("../../../helper/Response");
var serverModel = require("../../../model/ServerModel");
const workerModel = require("../../../model/WorkerModel");
const permssion = require("../../../helper/Permission");
const { WebSocketObserver } = require("../../../model/WebSocketModel");
const os = require("os");

const mcPingProtocol = require("../../../helper/MCPingProtocol");

//控制台信息获取
WebSocketObserver().listener("server/console", (data) => {
  // permssion.needLogin(req, res);
  let userName = data.WsSession.username;
  let serverName = data.body.trim();

  if (permssion.isCanServer(userName, serverName)) {
    const server = serverModel.ServerManager().getServer(serverName);
    let serverLocation = server.dataModel.location;
    if(!workerModel.get(serverLocation)){
      response.wsMsgWindow(data.ws, "出错:" + "Worker不存在");
    }
    workerModel.get(serverLocation).send("server/console",data.body).then((_)=>{data.ws.send(_)})
    // MCSERVER.log('准许用户 [' + userName + '] 获取控制台实时数据');
  }
});
