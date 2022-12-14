const { WebSocketObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");
const permission=require("../../helper/Permission");

WebSocketObserver().listener("menu", (data) => {
  //Object {ws: WebSocket, req: IncomingMessage, user: undefined, header: Object, body: "[body 开始]
  //Object {RequestKey: "req", RequestValue: "some"}

  if (data.WsSession.login == false) {
    response.wsMsgWindow(data.ws, "身份信息丢失，请重新登陆补全身份信息");
    return;
  }
  response.wsSend(data.ws, "ws/muem", {
    username: data.WsSession.username,
    group:permission.getUserGroup(data.WsSession.username)
  });
  // response.wsMsgWindow(data.ws, '欢迎上线 ' + data.WsSession.username);
});
