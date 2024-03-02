//响应层
(function () {
  var DEBUG = false; // 调试开关
  var TOKEN_NAME = "_T0K_N";
  var RES = window.RES = {
    TOKEN_NAME,
    TOKEN: null,
    getToken(callback) {
      //同源策略可以防止其他域对这里发送一个Ajax请求.
      let _url = MCSERVER.URL("./token");
      fetch(_url, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        cache: "no-cache"
      }).then(res => res.json()).then(function (data) {
        if (data.hasOwnProperty("ResponseValue")) {
          MCSERVER.username = data["ResponseValue"].username;
          callback(data["ResponseValue"].token);
        } else {
          callback(undefined);
        }
      });
    },
    tokenAjax(parameter) {
      window.RES.getToken(function (token) {
        parameter["token"] = token;
      });
    },
    ajax(parameter) {
      if (!parameter["data"]) parameter["data"] = {};

      var tokenV = parameter["token"] || RES.TOKEN;
      if (tokenV != null) parameter["url"] += "?" + TOKEN_NAME + "=" + tokenV;
      AbortSignal.timeout ??= function timeout(ms) {
        const ctrl = new AbortController;
        setTimeout(() => ctrl.abort(), ms);
        return ctrl.signal;
      }

      fetch(MCSERVER.URL(parameter["url"]), {
        method: parameter["type"] || "POST",
        body: ["GET", "HEAD"].includes((parameter['type'] ?? "GET").toUpperCase()) ? undefined : JSON.stringify(parameter["data"]), //具体实例化
        signal: AbortSignal.timeout(parameter["timeout"] || 10000),
        //processData: parameter["processData"] == false || true,
        //traditional: parameter["traditional"] == false || true,
        cache: parameter["cache"] ? "force-cache" : "no-cache" ?? "no-cache"
      }).then(res => {
        if (res.ok) {
          return res.text();
        } else {
          if (parameter["error"]) parameter["error"]();
          DEBUG && console.log("Fetch ERROR 回调触发");
          DEBUG && console.log(res.statusText);
          //DEBUG && console.log(errorThrown);
          DEBUG && console.log(res.text());
          window.MI.routeOn("ajax/error", null);
        }
      }).then(function (data) {
        try {
          data = JSON.parse(data);
          if (typeof data == "object") {
            if (data["ResponseKey"]) {
              window.MI.routeOn(data["ResponseKey"], data["ResponseValue"]);
            }
          }
        } catch (e) {
          DEBUG && console.log("$.ajax 响应数据非一个JSON对象");
        } finally {
          if (parameter["success"]) parameter["success"](data);
        }
      });
    },
    redirectHTML(url, callback) {
      //静态文件均在 public 目录下，动态文件则在不同API接口
      var _url = MCSERVER.URL("./public/" + url);

      window.scrollTo(0, 0);

      fetch(_url).then(res => {
        if (res.ok) return res.text();
        else {
          TOOLS.pushMsgWindow(`[ ${res.status} ] 由于网络或权限问题,请求的网页无法成功！`);
        }
      }).then(text => {
        let elem = document.querySelector("#ConsoleMain");
        elem.innerHTML = text;
        for (let script of [...elem.querySelectorAll("script")]) {
          let newScript = document.createElement("script");
          for (let { name, value } of [...script.attributes]) newScript.setAttribute(name, value);
          newScript.appendChild(document.createTextNode(script.innerHTML));
          script.replaceWith(newScript);
        }
        callback && callback();
      })
    },
    redirectPage(url, callback) {
      TOOLS.setHeaderTitle(["正在加载...."].join(" "));
      ToolsLoadingStart(function () {
        MI.rOn("onend");
        PageLoading();
        //替換掉原先存在的函数 防止新的单页没有这些函数而导致代码二次执行
        MI.rListener("onend", function () { });
        MI.rListener("onload", function () { });
        //触发页面切换事件
        MI.on("RedirectPage", url);
        RES.redirectHTML(url, function () {
          MI.on("page/live");
          //赋予的单页刷新
          PAGE.refresh = function () {
            RES.redirectPage(url, callback);
          };
          ToolsLoadingEnd();
          MI.rOn("onload");
          callback && callback();
        });
      });
    }
  }

  MI.listener("RedirectPage", function () {
    //自动菜单更改
    MCSERVER.autoColmDo();
  });


  var PageMain = document.querySelector("#ConsoleMain");
  var ToolsLoading = document.querySelector("#ToolsLoading"); //进度条
  var ToolsPageLoading = document.querySelector("#ToolsPageLoading"); //进度条容器

  function ToolsLoadingStart(callback) {
    ToolsLoading.style.width = "0%";
    ToolsPageLoading.style.display = "block";
    let animations = [{ opacity: "0" }];
    PageMain.animate(animations, 150).onfinish = () => {
      for (let animate of animations) Object.assign(PageMain.style, animate);
      callback();
    }
  }

  function PageLoading() {
    ToolsLoading.style.width = "70%";
  }

  function ToolsLoadingEnd() {
    ToolsLoading.style.width = "100%";

    let animations = [{ opacity: "1" }];
    PageMain.animate(animations, 150).onfinish = e => {
      for (let animate of animations) Object.assign(PageMain.style, animate);
      setTimeout(function () {
        ToolsPageLoading.style.display = "none";
      }, 150);
    }
  }
})();
