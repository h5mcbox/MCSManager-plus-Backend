//Websocket 层
(function () {
  var DEBUG = false; //Websocket DEBUG

  //from @BBleae
  //10 秒自动发送一次心跳包，此时间不可改变
  function wsHeartBeatPackage(ws) {
    setInterval(function () {
      ws.sendMsg("HBPackage", "");
    }, 1000 * 10);
  }

  window.WS = new Object();

  window.WS.init = function (openCallback) {
    var wsURL = "websocket/ws?" + RES.TOKEN_NAME + "=" + RES.TOKEN;
    window.WS = new WebSocket(MCSERVER.URL(wsURL, MCSERVER.WS_PROTOCOL));
    window.WS.binaryType = "arraybuffer";
    var tmp_callback = null;
    wsHeartBeatPackage(WS); //心跳包定时器开启

    WS.onmessage = function (e) {
      let [header, body] = msgpack.decode(new Uint8Array(e.data));
      try {
        if (DEBUG) {
          console.log("=== Websocket 收到触发 ===");
          console.log(header);
          console.log("Body:" + body);
          console.log("=== Websocket 收到结束 ===");
        }
        header.body = body;
        MI.on("ws/response", header, body);
        //产生当时数据接受事件
        tmp_callback && tmp_callback(header);
        tmp_callback = null;
      } catch (e) {
        console.log("Websocket 数据到达时逻辑异常:");
        console.log(e);
      }
    };
    WS.onerror = function (err) {
      console.log(err);
      MI.on("ws/error", err);
    };
    WS.onclose = function () {
      MI.on("ws/close", this);
    };
    WS.onopen = function () {
      openCallback && openCallback();
      MI.on("ws/open", this);
    };
    WS.sendMsg = function (value, body, callback) {
      let header = {
        RequestKey: "req",
        RequestValue: value
      };
      if (DEBUG) {
        console.log("=== Websocket 发送触发 ===");
        console.log(header);
        console.log(body);
        console.log("=== Websocket 发送结束 ===");
      }
      body = body ?? "";
      if (callback) tmp_callback = callback;
      if (WS.readyState == WS.OPEN) {
        WS.send(msgpack.encode([header, body]));
      } else {
        TOOLS.pushMsgWindow("与服务器链接中断，数据发送失败，请刷新或登陆重试");
      }
      return this;
    };
  };
  return this;
})();

MI.listener("ws/close", function () {
  TOOLS.pushMsgWindow("与服务器连接断开,刷新网页可以重新链接");
});
