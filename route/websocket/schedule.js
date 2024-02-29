const { WebSocketObserver } = require("../../model/WebSocketModel");
const permission = require("../../helper/Permission");
const schedulejob = require("../../helper/Schedule");
const tools = require("../../core/tools");
const { ServerManager } = require("../../model/ServerModel");

//过滤计划任务列表
async function getMineScheduleList(servername) {
  let server = ServerManager().getServer(servername);
  let { schedules } = await server.worker.call("schedule/list", servername);
  return schedules;
}

//列出计划任务
WebSocketObserver().define("schedule/list", async data => {
  let username = data.WsSession.username;
  let servername = data.body;
  // let list = MCSERVER.Schedule.dataModel.list;
  let schedules = await getMineScheduleList(servername);
  //let sendlist = getMineScheduleList(servername);

  if (permission.isCanServer(username, servername)) {
    return {
      username,
      servername,
      schedules
    };
  }
});

//创建计划任务
WebSocketObserver().define("schedule/create", async data => {
  let username = data.WsSession.username;
  let obj = data.body ?? {};

  if (permission.isCanServer(username, obj.servername || "")) {
    let server = ServerManager().getServer(obj.servername);
    return await server.worker.call("schedule/create", obj);
  }
});

//删除计划任务
WebSocketObserver().define("schedule/delete", async data => {
  let username = data.WsSession.username;
  let obj = data.body || {};

  if (permission.isCanServer(username, obj.servername || "")) {
    let server = ServerManager().getServer(obj.servername);
    return await server.worker.call("schedule/delete", obj);
  }
});
