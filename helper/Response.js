const msgpack = require("./msgpack");
function send(res, info, value) {
  let str = JSON.stringify({
    ResponseKey: info,
    ResponseValue: value
  });

  try {
    res.send(str);
  } catch (e) {
    MCSERVER.log("一个HTTP响应报文发送失败:");
    MCSERVER.log(e);
  }
  // res.end();
}

function wsSend(ws, info, ResponseValue, RequestID = null) {
  let header = {
    ResponseKey: info,
    RequestID
  };
  try {
    if (ws.readyState == ws.OPEN) {
      ws.send(msgpack.encode([header, ResponseValue]));
    }
  } catch (e) {
    MCSERVER.log("一个Websocket数据包发送失败:");
    MCSERVER.log(e);
  }

  // ws.send(str);
}

module.exports.returnMsg = (res, info, value) => {
  send(res, info, value);
};

module.exports.returnInfo = (res, value) => {
  send(res, "info/show", value);
};

module.exports.wsSend = (ws, info, value) => {
  wsSend(ws, info, value);
};

module.exports.wsResponse = ({ ws, RequestID, RequestKey }, value) => {
  wsSend(ws, RequestKey, value, RequestID);
}

module.exports.wsMsgWindow = (ws, msg = "") => {
  wsSend(ws, "window/msg", msg, null);
};
