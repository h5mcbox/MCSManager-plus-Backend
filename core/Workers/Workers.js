//用户模型

const msgpack = require("../../helper/msgpack");
const DataModel = require("../DataModel");
const { WorkerObserver } = require("../../model/WebSocketModel");
const { hash } = require("../User/CryptoMine");
const fetch = require("node-fetch");
const fs = require("fs");

const WORKER_SAVE_PATH = "workers/";
class Worker {
  #RequestMap=new Map;
  #RequestID=0;
  #HeartbeatTimer=0;
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
   * @returns {Promise<Boolean>}
   */
  async connect() {
    if (this.connected) {
      this.broadcastMessage(`[${this.dataModel.workername}]已连接,无法重复断开`);
      return false;
    }
    let nowStr = new Date().toLocaleString();
    let now = Math.floor(Date.now() / 1000);
    try {
      let u = new URL(this.dataModel.RemoteDescription.endpoint);
      let timeWindow = Math.floor(now / 10);
      let timeKey = hash.hmac(this.dataModel.MasterKey, timeWindow.toString());
      u.pathname = "/token";
      u.searchParams.set("apikey", timeKey);
      let res = await fetch(u);
      let reso = await res.json();
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
  broadcastMessage(msg) {
    let payload = msgpack.encode([{
      ResponseKey: "window/msg",
      ResponseValue: ""
    }, msg]);
    for (let client of Object.values(MCSERVER.allSockets)) client.ws.send(payload);
  }
  disconnect() {
    if (!this.connected) {
      return false;
    }
    clearInterval(this.#HeartbeatTimer);
    this.broadcastMessage(`[${this.dataModel.workername}]断开连接`);
    this.wsClient?.close();
    return this.connected = false;
  }
  async connectWebSocket(token) {
    let u = new URL(this.dataModel.RemoteDescription.endpoint);
    u.pathname = "/websocket/ws"
    if (u.protocol === "https:") u.protocol = "wss:"
    if (u.protocol === "http:") u.protocol = "ws:"
    u.searchParams.set("_T0K_N", token);
    let wsClient = require("ws");
    let wsC = new wsClient(u.href);
    wsC.on("close", () => this.disconnect());
    this.#HeartbeatTimer=setInterval(()=>this.call("HBPackage",null),10000);
    wsC.on("message", data => {
      const [header, body] = msgpack.decode(data);
      const {RequestID}=header;

      if(RequestID===null){
        WorkerObserver().emit("worker/res", {
          wsC,
          Worker:this,
          header,
          body
        });
      }
      let RequestMap=this.#RequestMap;
      if(!RequestMap.has(RequestID))return;
      const [resolve,reject]=RequestMap.get(RequestID);
      RequestMap.delete(RequestID);
      resolve([header,body]);
    });
    try {
      await new Promise((resolve, reject) => { wsC.on("open", resolve); wsC.on("error", reject) });
    } catch {
      this.disconnect();
    }
    this.wsClient = wsC;
  }
  /**
   * @param {String} path
   * @param {String} data
   * @returns {Promise<any[]>}
   */
  async call(path, data) {
    if (!this.connected) {
      //MCSERVER.error(`Worker ${this.dataModel.workername}未连接,已忽略消息`);
      //return false;
      await this.connect();
    };
    const RequestID=this.#RequestID++;
    let header = {
      RequestKey: "req",
      RequestValue: path,
      RequestID
    };
    this.wsClient.send(msgpack.encode([header,data]));
    let onReply = new Promise((resolve, reject) => this.#RequestMap.set(RequestID,[resolve,reject]));
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
