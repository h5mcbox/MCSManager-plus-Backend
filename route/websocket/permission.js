const { WebSocketObserver } = require("../../model/WebSocketModel");
const { userCenter } = require("../../model/UserModel");
const permission = require("../../helper/Permission");
const uuid = require("uuid");
const response = require("../../helper/Response");
WebSocketObserver().listener("permission/getPermissionID", (data) => {
  if (!permission.hasRights(data.WsSession.username, "permission:getPermissionID")) return;
  let permissionTableBucket = data.WsSession.PIDs;
  if (!permissionTableBucket) data.WsSession.PIDs = permissionTableBucket = {};
  let PermissionTable;
  let [type,param] = data.body.split(":");
  if (type === "PID") {
    if (!permissionTableBucket[param]) {
      let newPID = uuid.v4();
      PermissionTable = permissionTableBucket[newPID] = {};
      PermissionTable.permissions = [];
      PermissionTable.PID = newPID;
    } else {
      PermissionTable = permissionTableBucket[param];
    }
  } else if (type === "username") {
    let username = permission.hasRights(data.WsSession.username, "permission:customUsername") ? param : data.WsSession.username;
    let user = userCenter().get(username);
    if (!user) {
      response.wsMsgWindow(data.ws, "用户不存在");
      return false;
    }
    let newPID = uuid.v4();
    let userRights = user.dataModel.userRights;
    PermissionTable = permissionTableBucket[newPID] = {};
    PermissionTable.permissions = userRights ?? [];
    PermissionTable.PID = newPID;
    PermissionTable.RestrictedUsername = username;
  } else {
    response.wsMsgWindow(data.ws, "数据格式不正确");
    return false;
  }
  PermissionTable.probablyPermissions = MCSERVER.probablyPermissions || [];

  response.wsResponse(data, PermissionTable);
});
WebSocketObserver().listener("permission/savePID", (data) => {
  if (!permission.hasRights(data.WsSession.username, "permission:setPermissionID")) return;
  let PermissionTable = data.body;
  let permissionTableBucket = data.WsSession.PIDs;
  let oldPermissionTable = permissionTableBucket[PermissionTable.PID];
  if (!permissionTableBucket) data.WsSession.PIDs = permissionTableBucket = {};
  if (!Array.isArray(PermissionTable.permissions)) {
    response.wsMsgWindow(data.ws, "数据格式不正确");
    //response.wsResponse(data, false);
    return false;
  }
  if (!permissionTableBucket[PermissionTable.PID]) {
    response.wsMsgWindow(data.ws, "错误:权限表不存在");
    //response.wsResponse(data, false);
    return false;
  }
  let hasAllRights = true;
  for (let e of PermissionTable.permissions) {
    if (!permission.hasRights(data.WsSession.username, e)) { hasAllRights = false; break; }
  }
  if (!hasAllRights) {
    response.wsMsgWindow(data.ws, "错误:权限不足");
    response.wsResponse(data, false);
    return false;
  }
  permissionTableBucket[PermissionTable.PID] = {
    PID: PermissionTable.PID,
    permissions: PermissionTable.permissions,
    RestrictedUsername: oldPermissionTable.RestrictedUsername
  };
  response.wsMsgWindow(data.ws, "保存成功√");
  response.wsResponse(data, true);
});
MCSERVER.addProbablyPermissions("permission","管理子权限");
MCSERVER.addProbablyPermissions("permission:getPermissionID","获取权限表");
MCSERVER.addProbablyPermissions("permission:setPermissionID","保存权限表");