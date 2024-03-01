const { Router } = require("express");
const serverModel = require("../model/ServerModel");
const userModel = require("../model/UserModel");
const mcPingProtocol = require("../helper/MCPingProtocol");
const apiResponse = require("../helper/ApiResponse");
const keyManager = require("../helper/KeyManager");
const requestLimit = require("../helper/RequestLimit");
const WorkerCenter = require("../model/WorkerModel");
const tools = require("../core/tools");

const router = Router();

// 服务端实例状态获取 | 公共性 API 接口
// 无需任何权限判定
router.get("/status/:name", async function (req, res) {
  if (MCSERVER.localProperty.allow_status_api) {
    res.status(403).send("管理员禁止此项功能 | Access denied");
    res.end();
    return;
  }
  let params = req.params || {};
  let serverName = params.name || "";
  let mcserver = serverModel.ServerManager().getServer(serverName.trim());
  if (mcserver == null) {
    res.send("null");
    return;
  }
  let serverLocation = mcserver.dataModel.location;
  let worker;
  if (!(worker = WorkerCenter.get(serverLocation))) {
    res.status(404).send("Worker不存在");
    res.end();
  }
  let sendStatus = null;
  let serverData = await worker.call("server/get", serverName);
  // 取缓存资料
  const mcpingResult = serverData.mcpingResult;
  // 判断服务器启动状态发送不同的数据
  if (serverData.run && mcpingResult) {
    sendStatus = {
      id: serverName,
      serverName: serverData.mcpingConfig.mcpingName,
      lastDate: serverData.mcpingConfig.lastDate,
      status: serverData.run(),
      current_players: mcpingResult.current_players,
      max_players: mcpingResult.max_players,
      motd: serverData.mcpingConfig.mcpingMotd || mcpingResult.motd,
      version: mcpingResult.version
    };
  } else {
    sendStatus = {
      id: serverName,
      lastDate: serverData.lastDate,
      status: serverData.run
    };
  }
  res.json(sendStatus);
  res.end();
});

// 获取所有实例 | API
router.get("/server", async function (req, res) {
  // 仅仅准许管理员使用
  if (!keyManager.hasRights(apiResponse.key(req), "server")) {
    apiResponse.forbidden(res);
    return;
  }
  let allServers = [];
  for (let { status, value } of await Promise.allSettled(workerModel.getOnlineWorkers().map(item => item.call("server/view")))) {
    if (status === "fulfilled") allServers.push(...value.items);
  }
  apiResponse.send(res, allServers);
});

// 创建服务器实例 | API
router.post("/server", async function (req, res) {
  // 仅仅准许管理员使用
  if (!keyManager.hasRights(apiResponse.key(req), "server")) {
    apiResponse.forbidden(res);
    return;
  }
  // 解析请求参数
  try {
    const params = req.body;
    const serverLocation = params.location;
    let worker;
    if (!(worker = WorkerCenter.get(serverLocation))) {
      res.status(404).send("Worker不存在");
      res.end();
    }
    // 创建名判定
    if (!tools.between(params.serverName, 6, 32)) {
      apiResponse.error(res, new Error("名字格式不正确"));
      return;
    }
    // 附加参数解析
    const addList = (params.addCmd || "").split(" ");
    params.addCmd = addList;
    // 工作目录确定
    params.cwd = params.cwd || "";
    // 创建
    await worker.call("server/create", params);
    const result = serverModel.createServer(params.serverName, params);
    // 返回状态码
    result ? apiResponse.ok(res) : apiResponse.error(res);
  } catch (err) {
    apiResponse.error(res, err);
  }
});

// 删除实例 API
router.delete("/server/:name", async function (req, res) {
  // 仅仅准许管理员使用
  if (!keyManager.hasRights(apiResponse.key(req), "server")) {
    apiResponse.forbidden(res);
    return;
  }
  // 解析请求参数
  const params = req.params.name;
  try {
    let server = serverModel.ServerManager().getServer(params);
    const serverLocation = server.dataModel.location;
    let worker = WorkerCenter.get(serverLocation);
    if (!worker) {
      res.status(404).send("Worker不存在");
      res.end();
    }
    await worker.call("server/delete", params);
    serverModel.deleteServer(params);
    apiResponse.ok(res);
  } catch (err) {
    apiResponse.error(res, err);
  }
  res.end();
});

// 获取所有用户 | API
router.get("/user", function (req, res) {
  // 仅仅准许管理员使用
  if (!keyManager.hasRights(apiResponse.key(req), "userset")) {
    apiResponse.forbidden(res);
    return;
  }
  const list = userModel.userCenter().getAdvancedUserList();
  apiResponse.send(res, list);
});

// 创建用户 | API
// params.username
// params.password
// params.serverList
router.post("/user", function (req, res) {
  // 仅仅准许管理员使用
  if (!keyManager.hasRights(apiResponse.key(req), "userset")) {
    apiResponse.forbidden(res);
    return;
  }
  try {
    // 账号密码判定
    const uPattern = /^[a-zA-Z0-9_#$]{4,18}$/;
    if (!uPattern.test(req.body.username) || !tools.between(req.body.password, 6, 18)) {
      apiResponse.error(res, new Error("用户名或密码格式不正确"));
      return;
    }
    // 注册用户
    userModel.userCenter().register(req.body.username, req.body.password);
    // 注册其名下的服务端实例
    const allowedServerList = [];
    const serverList = req.body.serverlist.split(" ");
    for (const k in serverList) {
      if (serverList[k] != " " && serverList.length > 0) {
        allowedServerList.push(serverList[k]);
      }
    }
    userModel.userCenter().get(req.body.username).allowedServer(allowedServerList);
    // 数据模型保存
    userModel.userCenter().get(req.body.username).dataModel.save();
    // 返回状态码
    apiResponse.ok(res);
  } catch (err) {
    apiResponse.error(res, err);
  }
});

// 删除用户 API
router.delete("/user/:name", function (req, res) {
  // 仅仅准许管理员使用
  if (!keyManager.hasRights(apiResponse.key(req), "userset")) {
    apiResponse.forbidden(res);
    return;
  }
  try {
    // 解析请求参数
    const userName = req.params.name;
    // 注册用户
    userModel.userCenter().deleteUser(userName);
    // 返回状态码
    apiResponse.ok(res);
  } catch (err) {
    apiResponse.error(res, err);
  }
});

// 启动服务器 | API
router.all("/start_server/:name", async function (req, res) {
  // 用户权限判定
  if (!keyManager.hasServer(apiResponse.key(req), req.params.name)) {
    apiResponse.forbidden(res);
    return;
  }
  // 流量限制 | 10 秒间隔
  if (!requestLimit.execute(apiResponse.key(req) + "start_server", 1000 * 10)) {
    apiResponse.unavailable(res);
    return;
  }
  try {
    // 解析请求参数
    const name = req.params.name;
    let server = serverModel.ServerManager().getServer(name);
    const serverLocation = server.dataModel.location;
    let worker = WorkerCenter.get(serverLocation);
    if (!worker) {
      res.status(404).send("Worker不存在");
      res.end();
    }
    // 启动服务器
    await worker.call("server/console/open", name);
    // 返回状态码
    //result ? apiResponse.ok(res) : apiResponse.error(res);
    apiResponse.ok(res)
  } catch (err) {
    apiResponse.error(res, err);
  }
});

// 重启服务器 | API
router.all("/restart_server/:name", async function (req, res) {
  // 用户权限判定
  if (!keyManager.hasServer(apiResponse.key(req), req.params.name)) {
    apiResponse.forbidden(res);
    return;
  }
  // 流量限制 | 60 秒执行一次
  if (!requestLimit.execute(apiResponse.key(req) + "restart_server", 1000 * 60)) {
    apiResponse.unavailable(res);
    return;
  }
  try {
    // 解析请求参数
    const name = req.params.name;
    let server = serverModel.ServerManager().getServer(name);
    const serverLocation = server.dataModel.location;
    let worker = WorkerCenter.get(serverLocation);
    if (!worker) {
      res.status(404).send("Worker不存在");
      res.end();
    }
    // 重启服务器
    await worker.call("server/console/command", {
      command: "__restart__",
      serverName: name
    });
    // 返回状态码
    apiResponse.ok(res);
  } catch (err) {
    apiResponse.error(res, err);
  }
});

// 关闭服务器 | API
router.all("/stop_server/:name", async function (req, res) {
  // 用户权限判定
  if (!keyManager.hasServer(apiResponse.key(req), req.params.name)) {
    apiResponse.forbidden(res);
    return;
  }
  // 流量限制 | 5 秒间隔
  if (!requestLimit.execute(apiResponse.key(req) + "stop_server", 1000 * 5)) {
    apiResponse.unavailable(res);
    return;
  }
  try {
    // 解析请求参数
    const name = req.params.name;
    let server = serverModel.ServerManager().getServer(name);
    const serverLocation = server.dataModel.location;
    let worker = WorkerCenter.get(serverLocation);
    if (!worker) {
      res.status(404).send("Worker不存在");
      res.end();
    }
    // 关闭服务器
    await worker.call("server/console/command", {
      command: "__stop__",
      serverName: name
    });
    // 返回状态码
    apiResponse.ok(res);
  } catch (err) {
    apiResponse.error(res, err);
  }
});

// 向某服务器执行命令 | API
// params.name, params.command
router.post("/execute/", async function (req, res) {
  // 用户权限判定
  if (!keyManager.hasServer(apiResponse.key(req), req.body.name)) {
    apiResponse.forbidden(res);
    return;
  }
  // 流量限制 | 0.5 秒间隔
  if (!requestLimit.execute(apiResponse.key(req) + "execute", 500)) {
    apiResponse.unavailable(res);
    return;
  }
  try {
    // 解析请求参数
    const params = req.body;
    let server = serverModel.ServerManager().getServer(params.name);
    const serverLocation = server.dataModel.location;
    let worker = WorkerCenter.get(serverLocation);
    if (!worker) {
      res.status(404).send("Worker不存在");
      res.end();
    }
    let serverData = await worker.call("server/get", params.name);
    // 判定服务器是否运行
    if (!serverData) return;
    if (!serverData.run) {
      apiResponse.error(res, new Error("服务器非运行状态,无法投递命令"));
      return;
    }
    // 发送指令
    await worker.call("server/console/command", {
      command: "__stop__",
      serverName: params.name
    });
    // 返回状态码
    apiResponse.ok(res);
  } catch (err) {
    apiResponse.error(res, err);
  }
});

// 创建服务器实例（JSON） | API
router.post("/advanced_create_server", async function (req, res) {
  // 仅仅准许管理员使用
  if (!keyManager.hasRights(apiResponse.key(req), "server")) {
    apiResponse.forbidden(res);
    return;
  }
  // 解析请求参数
  try {
    const params = req.body;
    const config = JSON.parse(params.config);
    const serverLocation = config.location;
    let worker = WorkerCenter.get(serverLocation);
    if (!worker) {
      res.status(404).send("Worker不存在");
      res.end();
    }
    // 创建
    //const result = serverModel.createServer(params.serverName, config);
    await worker.call("server/create", config);
    // 返回状态码
    apiResponse.ok(res);
  } catch (err) {
    apiResponse.error(res, err);
  }
});

// 修改服务器实例（JSON） | API
router.post("/advanced_configure_server", async function (req, res) {
  // 仅仅准许管理员使用
  if (!keyManager.hasRights(apiResponse.key(req), "server")) {
    apiResponse.forbidden(res);
    return;
  }
  // 解析请求参数
  try {
    const params = req.body;
    let server = serverModel.ServerManager().getServer(params.serverName);
    const serverLocation = server.dataModel.location;
    let worker = WorkerCenter.get(serverLocation);
    if (!worker) {
      res.status(404).send("Worker不存在");
      res.end();
    }
    const config = JSON.parse(params.config);
    // 使用松散配置模式
    config.modify = true;
    if (!server) {
      apiResponse.error(res, "服务器并不存在");
      return;
    }
    // 不更名的情况重新构建服务器实例
    //server.builder(config);
    await worker.call("server/rebuilder", config);
    apiResponse.ok(res);
  } catch (err) {
    apiResponse.error(res, err);
  }
});

//模块导出
module.exports = router;
