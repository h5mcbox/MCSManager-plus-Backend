//Websocket 层
(function () {
  var DEBUG = false; //Websocket DEBUG

  //from @BBleae
  //10 秒自动发送一次心跳包，此时间不可改变
  /**
   * 
   * @param {WebSocketClient} ws 
   */
  function wsHeartBeatPackage(ws) {
    setInterval(function () {
      ws.call("HBPackage", "");
    }, 1000 * 10);
  }

  class WebSocketClient{
    #RequestMap = new Map;
    #RequestID = 0;
    /** @type {WebSocket}*/
    socket;
    openCallback = null;
    init(openCallback) {
      this.openCallback = openCallback;
      var wsURL = "websocket/ws?" + RES.TOKEN_NAME + "=" + RES.TOKEN;
      this.socket = new WebSocket(MCSERVER.URL(wsURL, MCSERVER.WS_PROTOCOL));
      this.socket.onopen=()=>this.onopen();
      this.socket.onmessage=e=>this.onmessage(e);
      this.socket.onerror=err=>this.onerror(err);
      this.socket.onclose=()=>this.onclose()
      this.socket.binaryType = "arraybuffer";
      wsHeartBeatPackage(this); //心跳包定时器开启
    }
    onmessage(e) {
      const [header, body] = msgpack.decode(new Uint8Array(e.data));
      const {RequestID}=header;
      try {
        if (DEBUG) {
          console.log("=== Websocket 收到触发 ===");
          console.log(header);
          console.log("Body:" + body);
          console.log("=== Websocket 收到结束 ===");
        }
        //header.body = body;
        let RequestMap = this.#RequestMap;
        if (!RequestMap.has(RequestID)) return;
        const [resolve, reject] = RequestMap.get(RequestID);
        RequestMap.delete(RequestID);
        resolve([header.ResponseValue, body]);

        MI.on("ws/response", header, body);
        //产生当时数据接受事件
        this.tmp_callback && this.tmp_callback(header);
      } catch (e) {
        console.log("Websocket 数据到达时逻辑异常:");
        console.log(e);
      }
    }
    onerror(err) {
      console.log(err);
      MI.on("ws/error", err);
    }
    onclose() {
      MI.on("ws/close", this);
    }
    onopen() {
      this.openCallback && this.openCallback();
      MI.on("ws/open", this);
    }
    async call(value, body) {
      let socket = this.socket;
      const RequestID = this.#RequestID++;
      let header = {
        RequestKey: "req",
        RequestValue: value,
        RequestID
      };
      if (DEBUG) {
        console.log("=== Websocket 发送触发 ===");
        console.log(header);
        console.log(body);
        console.log("=== Websocket 发送结束 ===");
      }
      body = body ?? "";
      if (socket.readyState != socket.OPEN) {
        return TOOLS.pushMsgWindow("与服务器链接中断，数据发送失败，请刷新或登陆重试");
      }
      socket.send(msgpack.encode([header, body]));
      let onReply = new Promise((resolve, reject) => this.#RequestMap.set(RequestID, [resolve, reject]));
      return await onReply;
    }
    close(){
      this.socket.close();
    }
  };
  window.WS = new WebSocketClient;
  return this;
})();

MI.listener("ws/close", function () {
  TOOLS.pushMsgWindow("与服务器连接断开,刷新网页可以重新链接");
});
