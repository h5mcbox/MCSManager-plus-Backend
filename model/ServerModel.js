/*
 * @Author: Copyright(c) 2020 Suwings
 * @Date: 2020-10-08 13:28:28
 * @LastEditTime: 2021-02-12 12:20:18
 * @Description:
 */
const ServerManager = require("../core/ServerCenter");
const WorkerCenter=require("../model/WorkerModel");

// 事实上，Node.js 的缓存机制可以间接的到达单列模式的目的
var onlyServerManager = new ServerManager();
// module.exports.ServerManager = onlyServerManager;

module.exports.ServerManager = () => {
  return onlyServerManager;
};

module.exports.createServer = (serverName, config) => {
  if (config.cwd == "" || config.cwd == "<默认标准位置>") config.cwd = "./server/server_core/" + serverName + "/";
  let location=config.location;
  if(!WorkerCenter.get(location)){
    MCSERVER.error(`创建服务器时出错: Worker ${location} 不存在`);
    return false;
  }
  onlyServerManager.newMinecraftServer(serverName,location);
  onlyServerManager.saveMinecraftServer(serverName);
  return true;
};

module.exports.deleteServer = (serverName) => {
  return onlyServerManager.delMinecraftServer(serverName);
};
//服务端中心 用于判断所有运行服务端是否到期 | 每2个小时检查一次
//https://www.npmjs.com/package/node-schedule
/*
const schedule = require("node-schedule");
schedule.scheduleJob("1 0 a/2 a a a", function () {
  let serverCollect = onlyServerManager.getServerObjects();
  try {
    for (let k in serverCollect) {
      let server = serverCollect[k];
      if (server && server.isRun()) {
        let res = server.isDealLineDate();
        if (res) {
          MCSERVER.log("[时间期限] 服务端 [", server.dataModel.name, "]", "于现在过期，正在执行关闭程序.");
          //先进行标准流程关闭服务端，如果 45 秒后未关闭，则强制性结束进程
          server.stopServer();
          setTimeout(() => {
            server.kill();
          }, 45 * 1000);
        }
      }
    }
  } catch (err) {
    MCSERVER.error("[时间期限] 关闭服务端时出现异常，某个服务端可能未能正确关闭:", err);
  }
});
*/