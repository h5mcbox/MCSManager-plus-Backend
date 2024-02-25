const Observer = require("./Observer");

const WebSocketModel = new Observer;
const WorkerModel = new Observer;

//事件二次转发  监听ws/req即可监听所有Websocket请求
WebSocketModel.listener("ws/req", "", data => {
  WebSocketModel.emit(data.header.RequestKey, data);
});

//事件二次转发  监听worker/req即可监听所有Websocket推送消息
WorkerModel.listener("worker/res", "", data => {
  WorkerModel.emit(data.header.ResponseKey, data);
});

module.exports = {
  WebSocketObserver() {
    return WebSocketModel;
  },
  WorkerObserver() {
    return WorkerModel;
  }
}