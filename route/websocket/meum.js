const { WebSocketObserver, WorkerObserver } = require("../../model/WebSocketModel");
const response = require("../../helper/Response");
const permission = require("../../helper/Permission");
const allPermissions = new Set(Object.values(MCSERVER.localProperty.rights).map(e => e.rights).flat())

WebSocketObserver().listener("menu", async (data) => {
  //Object {ws: WebSocket, req: IncomingMessage, user: undefined, header: Object, body: "[body 开始]
  //Object {RequestKey: "req", RequestValue: "some"}

  if (data.WsSession.login == false) {
    response.wsMsgWindow(data.ws, "身份信息丢失，请重新登陆补全身份信息");
    return response.wsResponse(data, null);
  }

  let options = {
    center: {
      class: "glyphicon-equalizer",
      name: "监控数据中心",
      link: "./template/center.html",
      api: "center/show",
      select: false
    },
    server: {
      class: "glyphicon-tasks",
      name: "服务端管理",
      link: "./template/server.html",
      api: "server/view",
      select: false
    },
    userset: {
      class: "glyphicon-th-large",
      name: "用户管理",
      link: "./template/userset.html",
      api: "userset/update",
      select: false
    },
    genuser: [{
      class: "glyphicon-home", //html元素 类
      name: "用户中心", //菜单名
      link: "./template/gen_home.html", //单击时跳转目的
      api: "genuser/home", //通过 Webscoket 后端请求的API,null为不请求,
      select: true
    }, {
      class: "glyphicon-th-list",
      name: "文件管理",
      link: "./template/filemanager.html",
      api: "genuser/home",
      select: false
    }],
    workers: {
      class: "glyphicon-tasks",
      name: "分布式服务",
      link: "./template/workers.html",
      api: "workers",
      select: false
    },
    "2FA": {
      class: "glyphicon-qrcode",
      name: "双因素认证",
      link: "./template/2FA.html",
      api: "userset/2fa/getAuthURL",
      select: false
    },
    general: [{
      class: "glyphicon-floppy-open",
      name: "服务",
      link: "./template/feelback.html",
      api: null,
      select: false
    }]
  }

  let username=data.WsSession.username;
  let group = permission.getUserGroup(username), returnMenu = [];
  let userAllRights = [];
  for (let name of allPermissions) {
    if (permission.hasRights(username, name)) userAllRights.push(name);
  }
  userAllRights.sort();
  if (group === "user" && userAllRights.length > 0) {
    for (let name of userAllRights) {
      if (Array.isArray(options[name])) {
        for (let _ of options[name]) {
          returnMenu.push(_);
        }
      } else {
        options[name] && returnMenu.push(options[name]);
      }
    }
  }

  response.wsResponse(data, {
    username,
    group,
    customMenu: group === "user" ? returnMenu : null
  });
});

WorkerObserver().listener("window/msg", ({ body }) => {
  for (let client of Object.values(MCSERVER.allSockets)) response.wsMsgWindow(client.ws, body);
})