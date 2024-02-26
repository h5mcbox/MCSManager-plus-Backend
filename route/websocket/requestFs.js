const { WebSocketObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");
const permssion = require("../../helper/Permission");
const { hash } = require("../../core/User/CryptoMine")
const serverCenter = require("../../model/ServerModel").ServerManager();
const workerCenter = require("../../model/WorkerModel");
WebSocketObserver().listener("onlinefs/getWorkerKey", data => {
  if (!permssion.hasRights(data.WsSession.username, "workers:onlinefs")) return;
  let now = Math.floor(Date.now() / 1000);
  var params = data.body.trim().split(":");
  let workerName = params[0];
  let worker = workerCenter.get(workerName);
  if (!worker) return;
  let timeWindow = Math.floor(now / (Number(params[1] || 0) || 15));
  let timeKey = hash.hmac(worker.dataModel.MasterKey, timeWindow.toString());
  let u = new URL(worker.dataModel.RemoteDescription.endpoint);
  u.pathname = "/fs_auth/auth_master/pwd";
  u.searchParams.set("key", timeKey);
  response.wsResponse(data, u.href);
});
WebSocketObserver().listener("onlinefs/getServerKey", data => {
  let now = Math.floor(Date.now() / 1000);
  let serverName = data.body.trim();
  if (!permssion.isCanServer(data.WsSession.username, serverName)) return;
  if (!serverCenter.isExist(serverName)) return false;
  let server = serverCenter.getServer(serverName);
  let workerName = server.dataModel.location;
  let worker = workerCenter.get(workerName);
  if (!worker) return;
  let timeWindow = Math.floor(now / 15);
  let timeKey = hash.hmac(worker.dataModel.MasterKey, serverName + timeWindow.toString());
  let u = new URL(worker.dataModel.RemoteDescription.endpoint);
  u.pathname = "/fs_auth/auth/" + serverName;
  u.searchParams.set("key", timeKey);
  response.wsResponse(data, u.href);
});
MCSERVER.addProbablyPermissions("workers:onlinefs", "允许访问Worker程序所在的目录");