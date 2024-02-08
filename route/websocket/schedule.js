const { WebSocketObserver } = require("../../model/WebSocketModel");
const permission = require("../../helper/Permission");
const response = require("../../helper/Response");
const schedulejob = require("../../helper/Schedule");
const tools = require("../../core/tools");

//每个服务器最大数量计划任务
const MAX_MASK = MCSERVER.localProperty.schedule_max || 10;

//创建计划任务函数
function CreateScheduleJob(obj) {
  let id = tools.randomString(6) + "_" + new Date().getTime();
  schedulejob.createScheduleJobCount(id, obj.time, obj.count, obj.commande, obj.servername);
}

//过滤计划任务列表
function getMineScheduleList(servername) {
  let list = MCSERVER.Schedule.dataModel.list;
  const sendlist = [];
  for (const iterator of list) {
    if (iterator && iterator.servername == servername) {
      sendlist.push(iterator);
    }
  }
  return sendlist;
}

//列出计划任务
WebSocketObserver().listener("schedule/list", (data) => {
  let username = data.WsSession.username;
  let servername = data.body;
  // let list = MCSERVER.Schedule.dataModel.list;
  let sendlist = getMineScheduleList(servername);

  if (permission.isCanServer(username, servername)) {
    response.wsResponse(data, {
      username: data.WsSession.username,
      servername: servername,
      schedules: sendlist
    });
  }
});

//创建计划任务
WebSocketObserver().listener("schedule/create", (data) => {
  let username = data.WsSession.username;
  let obj = data.body ?? {};

  if (permission.isCanServer(username, obj.servername || "")) {
    try {
      const list = getMineScheduleList(obj.servername);
      if (list.length > MAX_MASK) {
        response.wsMsgWindow(data.ws, "到达创建数量上限！");
        return response.wsResponse(data, false);
      }
      CreateScheduleJob(obj);
      response.wsMsgWindow(data.ws, "创建计划任务成功 √");
      return response.wsResponse(data, true);
    } catch (err) {
      response.wsMsgWindow(data.ws, "错误！创建失败:" + err);
      return response.wsResponse(data, false);
    }
  }
});

//删除计划任务
WebSocketObserver().listener("schedule/delete", (data) => {
  let username = data.WsSession.username;
  let obj = data.body || {};

  if (permission.isCanServer(username, obj.servername || "")) {
    try {
      schedulejob.deleteScheduleJob(obj.id || "");
      response.wsMsgWindow(data.ws, "删除序号:" + obj.id + "计划任务");
      return response.wsResponse(data, true);
    } catch (err) {
      response.wsMsgWindow(data.ws, "删除失败！" + err);
      return response.wsResponse(data, false);
    }
  }
});
