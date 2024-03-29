//ViewModel层
//用于各类数据模型的双向绑定和控制区域

(function () {
  var DEBUG = false;

  //ws 链接事件
  MI.listener("ws/open", function () {
    VIEW_MODEL["websocketStatus"] = {};
    var websocketStatus = VIEW_MODEL["websocketStatus"];
    websocketStatus["status"] = "服务器连接正常";
    websocketStatus["is"] = true;
    websocketStatus["tcolor"] = "#ffffff";
    VIEW_MODEL.newVue("websocketStatus", {
      el: "#websocket"
    });
    VIEW_MODEL.newVue("websocketStatus", {
      el: "#websocket2"
    });
    //左上角用户显示
    VIEW_MODEL.newVue("websocketStatus", {
      el: "#TitleUser"
    });
  });

  MI.listener("ws/close", function () {
    TOOLS.setHeaderTitle("离线 | 当前与服务器断开..");
    var websocketStatus = VIEW_MODEL["websocketStatus"];
    websocketStatus["status"] = "!!! 连接断开 !!!";
    websocketStatus["is"] = false;
    websocketStatus["tcolor"] = "#ffffff";
  });

  MI.listener("ws/error", function () {
    var websocketStatus = VIEW_MODEL["websocketStatus"];
    websocketStatus["status"] = "!!! 连接错误 !!!";
    websocketStatus["is"] = false;
    websocketStatus["tcolor"] = "#ffffff";
  });

  //单页生命周期替换事件
  MI.listener("page/live", function () {
    for (var tmp in PAGE) delete PAGE[tmp];
    window.PAGE = new Object();
  });

  //菜单获取
  MI.fillSideBar = function (data) {
    //菜单选项选择
    MI.listener("SideMeumClick", function () {
      DEBUG && console.log("--- 菜单选项被选择 ---");
      // MCSERVER.autoColmDo();
    });

    DEBUG && console.log("--- 系统菜单获取成功 ---");

    MCSERVER.username = data.username;
    MCSERVER.group = data.group;
    //虚拟的数据接受，让前端数据得到，菜单在前端建筑
    if (MCSERVER.group === "master") {
      data.items = MCSERVER.meumObject.masterMeum;
    } else if (MCSERVER.group === "user") {
      data.items = data.customMenu ?? MCSERVER.meumObject.masterMeum;
    } else if (MCSERVER.group === "banned") {
      data.items = MCSERVER.meumObject.bannedMeum;
    } else {
      data.items = MCSERVER.meumObject.bannedMeum;
    }
    //copy
    MI.routeCopy("col-muem", data);
    VIEW_MODEL.newVueOnce("col-muem", {
      el: "#SideColFor",
      data: {
        isOnMouse: false
      },
      methods: {
        onRedirect: function (link, api, item) {
          for (let k in this.items) {
            this.items[k].select = false;
          }
          item.select = true;
          DEBUG && console.log("菜单处网页开始跳转:" + link);
          // 取消黑色幕布
          TOOLS.blackJumbotron(false);
          // 触发菜单选项点击事件
          MI.on("SideMeumClick", null);
          // 跳转
          RES.redirectPage(link);
        }
      }
    });
  };


  //服务器控制台
  MI.routeListener("server/console", function (data) {
    if (data.ResponseValue == null) {
      TOOLS.pushMsgWindow("您并不拥有这个服务器的所有权，需要管理员设定");
      VIEW_MODEL["ConsolePanel"].serverData.name = null;
    }
    MI.routeCopy("ConsolePanel", data.ResponseValue);
  });

  // Minecraft 服务器终端换行替换符
  var terminalEncode = function (text) {
    var consoleSafe = TOOLS.encode(text);
    return consoleSafe;
  };

  // 终端控制台界面，实时接受服务端终端日志
  // 每当控制面板后端发送实时日志，都将第一时间触发此
  MI.routeListener("server/console/ws", function (data) {
    // 一种针对弹窗终端，一种针对网页终端
    var text;
    if (PAGE.methods == 0) {
      text = TOOLS.encodeConsoleColor(data.ResponseValue);
      MCSERVER.term.write(text);
    } else {
      text = TOOLS.encodeConsoleColorForHtml(terminalEncode(data.ResponseValue));
      var eleTerminal = document.getElementById("TerminalMinecraft");
      if (eleTerminal.innerHTML.length >= 100000) {
        eleTerminal.innerHTML =
          "<br /><br />[ 控制面板 ]: 日志显示过长，为避免网页卡顿，现已自动清空。<br />[ 控制面板 ]: 若想回看历史日志，请点击右上角刷新按钮，再重新进入点击 [历史] 按钮即可。<br /><br />";
      }
      eleTerminal.innerHTML = eleTerminal.innerHTML + text;
      var BUFF_FONTIER_SIZE_DOWN = eleTerminal.scrollHeight - eleTerminal.clientHeight;
      var flag = eleTerminal.scrollTop + 400 >= BUFF_FONTIER_SIZE_DOWN;
      if (flag) eleTerminal.scrollTop = eleTerminal.scrollHeight;
    }
  });

  // 获取MC服务端终端日志历史记录
  MI.routeListener("server/console/history", function (data) {
    var text;
    if (PAGE.methods == 0) {
      text = TOOLS.encodeConsoleColor(data.ResponseValue);
      MCSERVER.term.write(text);
    } else {
      var eleTerminal = document.getElementById("TerminalMinecraft");
      text = TOOLS.encodeConsoleColorForHtml(terminalEncode(data.ResponseValue));
      if (eleTerminal.innerHTML.length >= 100000) {
        eleTerminal.innerHTML =
          "<br /><br />[ 控制面板 ]: 日志显示过长，为避免网页卡顿，现已自动清空。<br />[ 控制面板 ]: 若想回看历史日志，请点击右上角刷新按钮，再重新进入点击 [历史] 按钮即可。<br /><br />";
      }
      eleTerminal.innerHTML = text + eleTerminal.innerHTML;
    }
  });
  // 初始化终端
  function initTerminal() {
    // 若终端未初始化则初始化终端与其方法
    if (!MCSERVER.term) {
      var fontSize = 12;
      // eslint-disable-next-line no-undef
      var term = (MCSERVER.term = new Terminal({
        disableStdin: false,
        rows: 30,
        cols: 100,
        fontSize: fontSize,
        convertEol: true
      }));
      // 终端基本颜色代码
      term.TERM_TEXT_RED = "\x1B[31m";
      term.TERM_TEXT_GREEN = "\x1B[32m";
      term.TERM_TEXT_YELLOW = "\x1B[33m";
      term.TERM_TEXT_BLUE = "\x1B[34m";
      term.TERM_TEXT_FUCHSIA = "\x1B[35m";
      term.TERM_TEXT_CYAN = "\x1B[36m";
      term.TERM_TEXT_WHITE = "\x1B[37m";
      term.TERM_TEXT_B = "\x1B[1m";
      // 装载终端到 DOM 对象
      term.open(document.getElementById("WebTerminal"));
      // 终端提示行
      term.prompt = function (command) {
        term.write(
          "\x1B[1;1;33m" + "[" + term.TERM_TEXT_WHITE + term.TERM_TEXT_GREEN + PAGE.serverName + "@" + "app" + term.TERM_TEXT_YELLOW + "]" + term.TERM_TEXT_WHITE + (command || "") + "\x1B[0m \r\n"
        );
      };
      // 初始化终端方法
      term.startTerminal = function () {
        MCSERVER.term.clear();
        // MCSERVER.term.prompt();
      };

      term.simpleLoadHistory = async function () {
        await WS.call("server/console/history", { serverName: PAGE.serverName });
      };
    }
    // 清空屏幕并输出基本欢迎语
    MCSERVER.term.startTerminal();

    // 终端的Vue组件
    new Vue({
      el: "#WebTerminalControl",
      data: {
        command: ""
      },
      methods: {
        toOpenServer: async function () {
          await WS.call("server/console/open", PAGE.serverName);
        },
        toCommand: async function (parCommand) {
          if (parCommand && typeof parCommand == "string") this.command = parCommand;
          MCSERVER.term.prompt(this.command);
          console.log("发送命令:", this.command);
          var data = {
            command: this.command,
            serverName: PAGE.serverName
          };
          if (this.command.length >= 1 || typeof parCommand == "string") {
            //压入命令栈 并 发送
            await WS.call("server/console/command", data);
          }
          this.command = "";
        },
        stopServer: function () {
          this.toCommand("__stop__");
        },
        simpleLoadHistory: async function () {
          await WS.call(
            "server/console/history",
            JSON.stringify({
              serverName: PAGE.serverName
            })
          );
        }
      }
    });
    document.querySelector("#WebTerminalScreenWapper").removeAttribute("style");
    document.querySelector("#WebTerminalScreenWapper").style.display = "none";
  }

  initTerminal();
})();
