const { WebSocketObserver } = require("../../model/WebSocketModel");
const { userCenter } = require("../../model/UserModel");
const permission = require("../../helper/Permission");
const response = require("../../helper/Response");

// 获取指定用户的 API KEY
WebSocketObserver().listener("apikey/get", (data) => {
  if (!permission.hasRights(data.WsSession.username, "genuser:getAPIKEY")) return;
  const username = permission.hasRights(data.WsSession.username, "customApikey") ? data.body : data.WsSession.username;

  const user = userCenter().get(username);
  if (!user) return;
  response.wsSend(data.ws, "apikey/get", user.dataModel.apikey);
});

// 更新用户的 API KEY
// 其中，API KEY 不可自定义，有且只能根据后端算法生成
WebSocketObserver().listener("apikey/update", (data) => {
  if (!permission.hasRights(data.WsSession.username, "genuser:updateAPIKEY")) return;
  const username = permission.hasRights(data.WsSession.username, "customApikey") ? data.body : data.WsSession.username;

  const user = userCenter().get(username);
  if (!user) return;

  // 更新用户KEY
  user.updateApiKey();
  user.save();

  response.wsSend(data.ws, "apikey/update", user.dataModel.apikey);
});

// 删除 API KEY
WebSocketObserver().listener("apikey/delete", (data) => {
  if (!permission.hasRights(data.WsSession.username, "genuser:deleteAPIKEY")) return;
  const username = permission.hasRights(data.WsSession.username, "customApikey") ? data.body : data.WsSession.username;

  const user = userCenter().get(username);
  if (!user) return;

  // 将 KEY 设置为空即可
  user.setApiKey("");
  user.save();

  response.wsSend(data.ws, "apikey/delete", user.dataModel.apikey);
});
MCSERVER.addProbablyPermissions("apikey","管理API密钥");
MCSERVER.addProbablyPermissions("apikey:deleteAPIKEY","删除API密钥");