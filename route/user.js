const router = require("express")();
const { loginUser, userCenter } = require("../model/UserModel");
const response = require("../helper/Response");
const loginedContainer = require("../helper/LoginedContainer");
const tools = require("../core/tools");
const TokenManager = require("../helper/TokenManager");
const { hash, createPassword, randomString } = require("../core/User/CryptoMine");
const userManager = userCenter();
const fakeLoginKeys = {};

//用户退出事件
router.post("/loginout", function (req, res) {
  if (!req.xhr) return;
  //删除一些辅助管理器的值
  if (req.session["username"] && req.session["login"]) loginedContainer.delLogined(req.sessionID);

  TokenManager.delToken(req.session["token"]);
  MCSERVER.log("[ loginout ] 用户:", req.session["username"], "退出，会话注销");

  //退出后的 Session 并不会立刻反馈到所有 Session 上
  req.session["login"] = false;
  req.session["username"] = undefined;
  req.session["token"] = undefined;
  req.session.destroy();
  response.returnMsg(res, "user/logout", "loginOut");
});

MCSERVER.login._banip = 0;

function LoginRule(ip) {
  let count = MCSERVER.login[ip] || 0;
  if (count > 100) {
    //值触发一次定时器
    if (count == 101) {
      setTimeout(() => {
        MCSERVER.login[ip] = 0;
      }, 1000 * 60 * 10);
    }
    return false;
  }
  return true;
}

//唯一性登录检查
function OnlyLoginCheck(sessionID) {
  for (let k in MCSERVER.allSockets) {
    if (MCSERVER.allSockets[k].sessionID == sessionID) {
      return true;
    }
  }
  return false;
}

const counter = require("../core/counter");

//用户登录请求路由
router.get("/login", function (req, res) {
  let ip = req.socket.remoteAddress;
  if (!LoginRule(ip)) {
    response.returnMsg(res, "login/check", "密码错误次数过多!您已被锁定!请10分钟之后再进行登录!");
    return;
  }
  var ChallengeID = randomString(32);
  var salt = MCSERVER.localProperty.MasterSalt;
  var period = MCSERVER.localProperty.ChallengePeriod || 30;
  MCSERVER.ChallengeIDSet.add(ChallengeID);
  setTimeout(function () { MCSERVER.ChallengeIDSet.delete(ChallengeID) }, period * 1024);
  var Challenge = hash.hmac(salt, ChallengeID);
  res.json({ ChallengeID, Challenge });
})
router.post("/login", function (req, res) {
  if (!req.xhr) return;
  let ip = req.socket.remoteAddress;
  let username = req.body.username || "";
  let password = req.body.password || "";
  let ChallengeID = req.body.ChallengeID || false;
  let TwoFACode = req.body["2FACode"] || false;
  let enkey = req.session["login_Hashkey"] || "";
  //登陆规则
  if (!LoginRule(ip)) {
    response.returnMsg(res, "login/check", "密码错误次数过多!您已被锁定!请10分钟之后再进行登录!");
    return;
  }

  //判断是否有 ws 正在连接
  if (OnlyLoginCheck(req.sessionID)) {
    response.returnMsg(res, "login/check", "您已在此浏览器登录过账号,请关闭所有与服务器的链接网页并退出账号!");
    return;
  }

  //同 Session 只可登录一个 用户
  if (loginedContainer.isLogined(req.sessionID)) {
    response.returnMsg(res, "login/check", 302);
    return;
  }

  //登陆次数加一
  counter.plus("login");
  MCSERVER.log("用户", username, "正在尝试登录...");
  loginUser(
    username,
    password,
    (loginUser, TwoFAPassed = false) => {
      //只有这里 唯一的地方设置 login = true
      req.session["login"] = true;
      req.session["username"] = loginUser.dataModel.username;
      req.session["dataModel"] = loginUser.dataModel; //Only read
      req.session["login_Hashkey"] = undefined;
      req.session["status"] = "logined";
      req.session.save();
      delete MCSERVER.login[ip];
      var userDataModel = loginUser.dataModel;
      if (userDataModel.TwoFAEnabled && (!TwoFAPassed) && (!MCSERVER.localProperty.skipLoginCheck)) {
        req.session["login"] = false;
        req.session["status"] = "2fa";
        response.returnMsg(res, "login/2fa-needed", "2fa-needed");
        return;
      }
      //添加到 login 容器  注意，全部代码只能有这一个地方使用这个函数
      loginedContainer.addLogined(req.sessionID, username, loginUser.dataModel);
      MCSERVER.log("[ Login ]", "用户:", username, "密匙正确", "准许登录");
      response.returnMsg(res, "login/check", true);
    },
    () => {
      //密码错误记录
      MCSERVER.login[ip] ? MCSERVER.login[ip]++ : (MCSERVER.login[ip] = 1);
      //防止数目过于太大 溢出
      MCSERVER.login[ip] > 1000 ? (MCSERVER.login[ip] = 1000) : null;
      //passwordError
      counter.plus("passwordError");
      req.session["login"] = false;
      req.session["username"] = undefined;
      req.session["login_Hashkey"] = undefined;
      req.session["dataModel"] = undefined;
      req.session.save();
      //删除到 login 容器
      if (req.session["username"]) loginedContainer.delLogined(req.sessionID);
      MCSERVER.log("[ Login ]", "用户:", username, "密匙错误", "拒绝登录");
      response.returnMsg(res, "login/check", false);
    },
    enkey,
    TwoFACode,
    ChallengeID
  );
});

//用户请求登录键路由
router.get("/login_key", function (req, res) {
  if (!req.xhr) return;
  let username = req.query.username || null;
  let hashKey = req.session["login_Hashkey"] || tools.randomString(32);
  let okflag = true;

  //拒绝掉已登录用户
  if (!username || loginedContainer.isLogined(req.sessionID)) okflag = false;

  req.session["login_Hashkey"] = hashKey;
  //取salt
  let loggingUser = userManager.get(username);
  //是否存在用户名 && Flag is true
  if (loggingUser && okflag) {
    res.send(
      JSON.stringify({
        //salt
        enkey1: loggingUser.dataModel.salt,
        //md5Key
        enkey2: hashKey
      })
    );
    return;
  } else {
    //这里是 随机的 salt 与 md5key 因为用户根本不存在，则返回一个随机的类似于正常的信息，让前端判断错误
    //(del)防止轻而易举的遍历用户名，但这仍然可以通过两次或三次尝试判断用户名是否存在(del)
    //好了,也没法判断是否存在了，因为我们把假的salt也保存下来了
    var enkey1 = fakeLoginKeys[username] || tools.randomString(6);
    fakeLoginKeys[username] = enkey1;
    res.send(
      JSON.stringify({
        //salt
        enkey1,
        //md5Key
        enkey2: hashKey
      })
    );
    return;
  }
  /*
  //这里是 随机的 salt 与 md5key 因为用户根本不存在，则返回一个随机的类似于正常的信息，让前端判断错误
  //(del)防止轻而易举的遍历用户名，但这仍然可以通过两次或三次尝试判断用户名是否存在(del)
  res.send(
    JSON.stringify({
      enkey1: tools.randomString(6),
      enkey2: tools.randomString(32)
    })
  );
  */
});

//模块导出
module.exports = router;
