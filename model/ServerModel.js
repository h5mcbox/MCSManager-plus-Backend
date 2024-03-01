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