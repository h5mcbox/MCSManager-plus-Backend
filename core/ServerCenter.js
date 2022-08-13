const EventEmitter = require("events");
const fs = require("fs-extra");
const DataModel = require("./DataModel");
const BASE_SERVER_DIR = "./server/";

class MinecraftServer extends EventEmitter {
  constructor(name, args) {
    super(args);
    //这是配置文件
    this.dataModel = new DataModel(BASE_SERVER_DIR + name);
  }
  load() {
    this.dataModel.load();
  }
  save() {
    this.dataModel.save();
  }
}
class ServerManager extends EventEmitter {
  constructor(args) {
    super(args);
    this.serverList = {};
  }

  newMinecraftServer(name,location) {
    // eslint-disable-next-line no-prototype-builtins
    if (!this.serverList.hasOwnProperty(name)) {
      let newServer=new MinecraftServer(name);
      this.serverList[name] = newServer;
      if(location){
        newServer.dataModel.location=location;
        newServer.dataModel.save();
      }
      return true;
    }
    throw new Error("同名的服务器已存在");
  }

  delMinecraftServer(name) {
    try {
      fs.removeSync(BASE_SERVER_DIR + name + ".json");
      delete this.serverList[name];
      return true;
    } catch (err) {
      throw new Error("删除服务器出现错误，删除失败并且服务器可能已经损坏:" + err);
    }
  }
  loadMinecraftServer(name) {
    if (this.isCreate(name)) {
      if (this.isExist(name)) {
        return this.serverList[name].load();
      }
      this.newMinecraftServer(name);
      return this.loadMinecraftServer(name);
    }
    return false;
  }
  

  saveMinecraftServer(name) {
    if (this.isExist(name)) return this.serverList[name].save();
  }

  saveAllMinecraftServer() {
    for (let key in this.serverList) {
      this.saveMinecraftServer(this.serverList[key]);
    }
  }

  loadALLMinecraftServer() {
    let serverName = null;
    let serverList = fs.readdirSync(BASE_SERVER_DIR);
    for (let key in serverList) {
      serverName = serverList[key].replace(".json", "");
      this.loadMinecraftServer(serverName);
    }
  }
  isExist(name) {
    // eslint-disable-next-line no-prototype-builtins
    if (this.serverList.hasOwnProperty(name)) {
      return true;
    }
    return false;
  }

  isCreate(name) {
    return fs.existsSync(BASE_SERVER_DIR + name + ".json");
  }
  reServerName(oldServerName, newServerName) {
    let oldDataModel = this.serverList[oldServerName].dataModel;
    let newMinecraftServer = new MinecraftServer(newServerName);
    //移植數據
    for (let k in oldDataModel) {
      if (k == "__filename__") continue;
      if (k == "name") continue;
      if (k == "serverName") continue;
      newMinecraftServer.dataModel[k] = oldDataModel[k];
    }
    newMinecraftServer.save();
    this.serverList[newServerName] = newMinecraftServer;
    //绑定事件
    //this._bindEvent(newServerName);
    this.delMinecraftServer(oldServerName);
    return true;
  }

  getServerList() {
    //Stub
  }

  getServerCounter() {
    let tmp = 0;
    // eslint-disable-next-line no-unused-vars
    for (let k in this.serverList) tmp++;
    return tmp;
  }
  /**
   * @param {*} serverName
   * @returns {MinecraftServer}
   * @memberof ServerManager
   */
  getServer(serverName) {
    if (this.serverList[serverName]) return this.serverList[serverName];
    return undefined;
  }

  getServerObjects() {
    return this.serverList;
  }
}

module.exports = ServerManager;
