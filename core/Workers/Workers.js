//用户模型

const DataModel = require("../DataModel");
const {hash} = require("../User/CryptoMine");
const fetch = require("node-fetch");
const fs = require("fs");

const WORKER_SAVE_PATH = "workers/";
class Worker {
  constructor(name, MasterKey, RemoteDescription) {
    let now = new Date().toLocaleString();
    if (name.startsWith("_")) {
      this.dataModel = new DataModel(WORKER_SAVE_PATH + name, true);
      this.dataModel.OnlyMemoryWorker = true;
    } else {
      this.dataModel = new DataModel(WORKER_SAVE_PATH + name);
      this.dataModel.OnlyMemoryWorker = false;
    }
    this.dataModel.workername = name;
    this.dataModel.MasterKey = MasterKey || undefined;
    this.dataModel.createDate = now;
    this.dataModel.lastDate = now;
    this.dataModel.RemoteDescription = RemoteDescription || {};
    this.connected = false;
    this.tmp_cb = null;
  }

  load() {
    if (this.dataModel.OnlyMemoryWorker) return this;
    this.dataModel.load();
    return this;
  }

  /**
   * @returns {Boolean}
   */
  async connect() {
    if(this.connected){
      this.broadcastMessage(`[${this.dataModel.workername}]已连接,无法重复断开`);
      return false;
    }
    let nowStr = new Date().toLocaleString();
    let now=Math.floor(Date.now()/1000);
    try {
      var u = new URL(this.dataModel.RemoteDescription.endpoint);
      let timeWindow=Math.floor(now/10);
      let timeKey=hash.hmac(this.dataModel.MasterKey,timeWindow.toString());
      u.pathname = "/token";
      u.searchParams.set("apikey", timeKey);
      var res = await fetch(u.href, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      var reso = await res.json();
      if (reso.ResponseValue) {
        this.token = reso.ResponseValue.token;
        await this.connectWebSocket(this.token);
        this.connected = true;
        this.dataModel.lastDate = nowStr;
        this.dataModel.save();
        return true;
      } else {
        return false;
      }
    } catch (err) {
      MCSERVER.error(err);
      return false;
    }
  }
  broadcastMessage(msg){
    let all = MCSERVER.allSockets;
    let split=[JSON.stringify({
      ResponseKey:"window/msg",
      ResponseValue:""
    }),msg];
    for (let k in all) {
      all[k].ws.send(split.join("\n\n"))
    }
  }
  disconnect() {
    if(!this.connected){
      return false;
    }
    this.broadcastMessage(`[${this.dataModel.workername}]断开连接`);
    this.wsClient?.close();
    return this.connected = false;
  }
  async connectWebSocket(token) {
    var u = new URL(this.dataModel.RemoteDescription.endpoint);
    u.pathname = "/websocket/ws"
    if (u.protocol === "https:") u.protocol = "wss:"
    if (u.protocol === "http:") u.protocol = "ws:"
    u.searchParams.set("_T0K_N", token);
    var wsClient = require("ws");
    var wsC = new wsClient(u.href);
    wsC.on("close", () => this.disconnect());
    var that = this;
    wsC.on("message", (data) => {
      var split = (data.toString()).split("\n\n");
      var res = JSON.parse(split[0]);
      if (res.ResponseKey === "window/msg") {
        this.broadcastMessage(`[${that.dataModel.workername}]` + split[1]);
        return true;
      }
      if (res.ResponseKey === "server/console/ws") {
        let all = MCSERVER.allSockets;
        for (let k in all) {
          if (all[k]["console"]) {
            all[k].ws.send(split.join("\n\n"))
          }
        }
        return true;
      }
      this.tmp_cb && this.tmp_cb(data.toString());
      this.tmp_cb = null;
    });
    var onOpen = new Promise((resolve, reject) => { wsC.on("open", resolve); wsC.on("error", reject) });
    try {
      await onOpen;
    } catch {
      this.disconnect();
    }
    this.wsClient = wsC;
  }
  /**
   * @param {String} path
   * @param {String} data
   * @returns {String}
   */
  async send(path, data) {
    if (!this.connected) {
      //MCSERVER.error(`Worker ${this.dataModel.workername}未连接,已忽略消息`);
      //return false;
      await this.connect();
    };
    var obj = {
      RequestKey: "req",
      RequestValue: path
    };
    var header = JSON.stringify(obj) + "\n\n";
    var payload = header + data;
    this.wsClient.send(payload);
    var that = this;
    var onReply = new Promise((resolve, reject) => that.tmp_cb = resolve);
    return await onReply;
  }

  save() {
    if (this.dataModel.OnlyMemoryWorker) return this;
    this.dataModel.save();
    return this;
  }

  delete() {
    if (this.dataModel.OnlyMemoryWorker) return undefined;
    let path = "./" + WORKER_SAVE_PATH + this.dataModel.username + ".json";
    fs.unlinkSync(path);
  }
  updateLastDate() {
    this.dataModel.lastDate = new Date().toLocaleString();
    return this;
  }

  allowedServer(list) {
    if (!list) return this.dataModel.allowedServer;
    this.dataModel.allowedServer = list;
    return this;
  }

  hasServer(serverName) {
    for (let key in this.dataModel.allowedServer) {
      if (this.dataModel.allowedServer[key] == serverName) {
        return true;
      }
    }
    return false;
  }
}

module.exports = {
  Worker,
  WORKER_SAVE_PATH
};
