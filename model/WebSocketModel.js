const { wsResponseError, wsResponse } = require("../helper/Response");
const RPCHandler = require("./RPCHandler");

const WebSocketModel = new RPCHandler;
const WorkerModel = new RPCHandler;

//事件二次转发  监听ws/req即可监听所有Websocket请求
WebSocketModel.define("ws/req", "", async data => {
  try {
    let [success, result] = await WebSocketModel.emit(data.header.RequestKey, data);
    if (success) wsResponse(data, result);
    else wsResponseError(data, "Method not found");
  } catch (err) {
    wsResponseError(data, err);
    throw err;
  }
});

//事件二次转发  监听worker/req即可监听所有Websocket推送消息
WorkerModel.define("worker/res", "", data => {
  WorkerModel.emit(data.header.ResponseKey, data);
});

module.exports = {
  WebSocketObserver() { return WebSocketModel; },
  WorkerObserver() { return WorkerModel; }
}