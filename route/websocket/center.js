const { WebSocketObserver } = require("../../model/WebSocketModel");
const counter = require("../../core/counter");
const tools = require("../../core/tools");
const serverModel = require("../../model/ServerModel");
const permssion = require("../../helper/Permission");
const userModel = require("../../model/UserModel");
const { hash } = require("../../core/User/CryptoMine");
const fs = require("fs");
const os = require("os");
const mversion = require("../../helper/version");
const workerModel = require("../../model/WorkerModel");

const MB_SIZE = 1024 * 1024;
let serverM = serverModel.ServerManager();
let userM = userModel.userCenter();

//设置要定时清除的数据
counter.initData(() => {
  counter.set("notPermssionCounter", 0);
  counter.set("login", 0);
  counter.set("maybeLogin", 0);
  counter.set("passwordError", 0);
  counter.set("csrfCounter", 0);
});

const osUtils = require("os-utils");
//系统CPU
var cacheCPU = 0;
let cacheSystemInfo = null;
let usage = process.memoryUsage();

//init 记录器
MCSERVER.logCenter.initLogData("CPU", 24);
MCSERVER.logCenter.initLogData("RAM", 24);

// 数据缓存，以避免频繁请求带来的损耗
setInterval(async function () {
  // CPU 值缓存
  osUtils.cpuUsage(function (v) {
    cacheCPU = (v * 100).toFixed(2);
    MCSERVER.dataCenter.cacheCPU = cacheCPU;
  });
  let onliec = 0;
  let sockec = 0;
  let banipc = 0;
  //统计在线用户
  for (let k in MCSERVER.onlineUser) {
    if (MCSERVER.onlineUser[k] == null) continue;
    onliec++;
  }
  //统计在线 Ws
  for (let k in MCSERVER.allSockets) {
    if (MCSERVER.allSockets[k] == null) continue;
    sockec++;
  }
  //统计封号ip数量
  for (let k in MCSERVER.login) MCSERVER.login[k] > 10 ? banipc++ : banipc;
  //获取正在运行服务器的数量
  let allOnlineServers = 0;
  for (let { status, value } of await Promise.allSettled(workerModel.getOnlineWorkers().map(worker => worker.call("server/view")))) {
    if (status === "fulfilled")
      for (let serverInfo of value.items)
        if (serverInfo.data.run) allOnlineServers++;
  }
  //缓存值
  cacheSystemInfo = {
    rss: (usage.rss / MB_SIZE).toFixed(1),
    heapTotal: (usage.heapTotal / MB_SIZE).toFixed(1),
    heapUsed: (usage.heapUsed / MB_SIZE).toFixed(1),
    sysTotalmem: (os.totalmem() / MB_SIZE).toFixed(1),
    sysFreemem: (os.freemem() / MB_SIZE).toFixed(1),
    cpu: cacheCPU,
    uptime: os.uptime(),
    //more
    serverCounter: serverM.getServerCounter(),
    runServerCounter: allOnlineServers,
    userCounter: userM.getUserCounter(),
    userOnlineCounter: onliec,
    WebsocketCounter: sockec,
    loginCounter: counter.get("login"), //登陆次数
    banip: banipc, //封的ip
    passwordError: counter.get("passwordError"), //密码错误次数
    csrfCounter: counter.get("csrfCounter"), //可能存在的CSRF攻击次数
    notPermssionCounter: counter.get("notPermssionCounter"), //API的无权访问
    root: mversion.root,
    verisonA: mversion.verisonA,
    verisonB: mversion.verisonB,
    system: mversion.system,
    isPanel: true
  };

  let useMemPrecent = 100 - ((os.freemem() / os.totalmem()) * 100).toFixed(0);
  //压入记录器
  MCSERVER.logCenter.pushLogData("CPU", tools.getMineTime(), parseInt(cacheCPU));
  MCSERVER.logCenter.pushLogData("RAM", tools.getMineTime(), useMemPrecent);

  setTimeout(() => counter.save(), 0); //异步保存计数器
}, MCSERVER.localProperty.data_center_times);

//重启逻辑
WebSocketObserver().define("center/restart", data => {
  if (!permssion.hasRights(data.WsSession.username, "restart")) return false;
  MCSERVER.log("面板重启...");
  return process.nextTick(() => {
    process.send({ restart: "./app.js" });
    process.emit("SIGINT");
  });
});

//更新逻辑
WebSocketObserver().define("center/update", data => {
  if (!permssion.hasRights(data.WsSession.username, "update")) return false;
  let userName = data.WsSession.username;
  let { buffer } = data.body;

  const target_path = "./app.apkg";
  fs.writeFileSync("./app.backup.apkg", fs.readFileSync(target_path))
  fs.writeFileSync(target_path, buffer);
  MCSERVER.log(`[ 软件更新 ] 用户 ${userName} 执行Backend软件更新`);

  MCSERVER.log("面板重启...");
  return process.nextTick(() => {
    process.send({ restart: "./app.js" });
    process.emit("SIGINT");
  });
});

//更新逻辑
WebSocketObserver().define("center/updateWorker", async data => {
  if (!permssion.hasRights(data.WsSession.username, "update")) return false;
  let userName = data.WsSession.username;
  let { name, buffer } = data.body;

  let worker = workerModel.get(name);
  if (!worker) return false;

  let now = Math.floor(Date.now() / 1000);
  let timeWindow = Math.floor(now / 120);
  let timeKey = hash.hmac(worker.dataModel.MasterKey, timeWindow.toString());
  let sign = hash.hmac(timeKey, buffer);
  let ResponseValue = await worker.call("center/update", { buffer, sign });
  MCSERVER.log(`[ 软件更新 ] 用户 ${userName} 执行Worker ${name} 软件更新`);
  return ResponseValue;
});

//数据中心
WebSocketObserver().define("center/show", data => {
  if (!permssion.hasRights(data.WsSession.username, "center")) return;
  return cacheSystemInfo;
});

MCSERVER.addProbablyPermissions("center", "查看面板中心数据");
MCSERVER.addProbablyPermissions("restart", "重启面板");