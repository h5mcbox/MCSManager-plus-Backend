const { Router } = require("express");
const router = Router();
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
  let ChallengeID = randomString(32);
  let salt = MCSERVER.localProperty.MasterSalt;
  let period = MCSERVER.localProperty.ChallengePeriod || 30;
  MCSERVER.ChallengeIDSet.add(ChallengeID);
  setTimeout(function () { MCSERVER.ChallengeIDSet.delete(ChallengeID) }, period * 1024);
  let Challenge = hash.hmac(salt, ChallengeID);
  res.json({ ChallengeID, Challenge });
})
router.post("/login", function (req, res) {
  let ip = req.socket.remoteAddress;
  let {
    username = "",
    password = "",
    ChallengeID = "",
    is2FACode = false,
  } = req.body;
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
  let { verified, user } = userCenter().loginCheck({
    username,
    password,
    loginSalt: enkey,
    notSafeLogin: false,
    is2FACode,
    ChallengeID
  });
  if (!verified) {
    //密码错误记录
    MCSERVER.login[ip] ? MCSERVER.login[ip]++ : (MCSERVER.login[ip] = 1);
    //防止数目过于太大 溢出
    MCSERVER.login[ip] > 1000 ? (MCSERVER.login[ip] = 1000) : null;
    //passwordError
    counter.plus("passwordError");
    //删除到 login 容器
    if (req.session["username"]) loginedContainer.delLogined(req.sessionID);
    MCSERVER.log("[ Login ]", "用户:", username, "密匙错误", "拒绝登录");
    response.returnMsg(res, "login/check", false);
    return;
  }
  let { TwoFAEnabled } = user.dataModel;
  let TwoFAPassed = is2FACode && verified;
  if (TwoFAEnabled && (!TwoFAPassed) && (!MCSERVER.localProperty.skipLoginCheck)) {
    Object.assign(req.session, {
      login: false,
      username: user.dataModel.username,
      status: "2fa"
    });
    response.returnMsg(res, "login/2fa-needed", "2fa-needed");
    return;
  }
  let trustedTwoFA = (TwoFAPassed && req.session.status === "2fa" && req.session.username === username)
  if (!TwoFAEnabled || trustedTwoFA) {
    user.updateLastDate();
    //只有这里 唯一的地方设置 login = true
    Object.assign(req.session, {
      login: true,
      username: user.dataModel.username,
      dataModel: user.dataModel, //Only read
      login_Hashkey: undefined,
      status: "logined"
    });
    req.session.save();
    delete MCSERVER.login[ip];

    //添加到 login 容器  注意，全部代码只能有这一个地方使用这个函数
    loginedContainer.addLogined(req.sessionID, username, user.dataModel);
    MCSERVER.log("[ Login ]", "用户:", username, "密匙正确", "准许登录");
    response.returnMsg(res, "login/check", true);
    return false;
  } else if (TwoFAEnabled && !trustedTwoFA) {
    MCSERVER.login[ip] ? MCSERVER.login[ip]++ : (MCSERVER.login[ip] = 1);
    MCSERVER.login[ip] > 1000 ? (MCSERVER.login[ip] = 1000) : null;
    MCSERVER.log("[ Login ]", "用户:", username, "双因素认证失败", "拒绝登录");
    response.returnMsg(res, "login/check", false);
    return;
  }
});

//用户请求登录键路由
router.get("/login_key", function (req, res) {
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
        salt1: loggingUser.dataModel.salt,
        //md5Key
        salt2: hashKey
      })
    );
    return;
  } else {
    //这里是 随机的 salt 与 md5key 因为用户根本不存在，则返回一个随机的类似于正常的信息，让前端判断错误
    //没法判断是否存在了，因为我们把假的salt也保存下来了
    let salt1 = fakeLoginKeys[username] || tools.randomString(6);
    fakeLoginKeys[username] = salt1;
    res.send(
      JSON.stringify({
        //salt
        salt1,
        salt2: hashKey
      })
    );
    return;
  }
});

//模块导出
module.exports = router;
