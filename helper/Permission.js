const loginedContainer = require("./LoginedContainer");
const userCenter = require("../model/UserModel").userCenter();

let groupRights = {
  loaded: false
};
/**
 * @param {String} username
*/
function getUser(username) {
  return userCenter.get(username);
}
/**
 * @param {String} username
 * @returns {String}
*/
function getUserGroup(username) {
  let user = getUser(username);
  if (username.substring(0, 1) === "#") return "master";
  if (user) {
    return user.dataModel.group;
  } else {
    return "";
  }
}
/**
 * @param {String} username
 * @returns {Set<String>}
*/
function getUserRights(username) {
  let user = getUser(username);
  if (username.substring(0, 1) === "#") return "master";
  if (user) {
    return new Set(user.dataModel.userRights);
  } else {
    return new Set;
  }
}
function loadRights() {
  var props = MCSERVER.localProperty;
  for (let i of Object.keys(props.rights)) {
    let t = props.rights[i], a = new Set();
    do {
      for (let f of t.rights) a.add(f);
      t = props.rights[t.inherits];
    } while (t);
    groupRights[i] = a;
  };
  return groupRights.loaded = true;
};
/**
 * @returns {Set<String>}
 * @param {String} group 
 */
function getRights(group) {
  return groupRights[group];
}
/**
 * @returns {Boolean}
 * @param {String} username 
 * @param {String} rname
 */
function hasRights(username, rname) {
  if (!groupRights.loaded) loadRights();
  if (username.substring(0, 1) === "#") return true;
  if ((!rname.startsWith("permission")) && hasRights(username, "permission:skipPermissionCheck")) return true;
  let group = getUserGroup(username);
  let userRights = getUserRights(username);
  let rights = getRights(group);
  let hasRight = rights.has(rname) || userRights.has(rname);
  if (!hasRight) {
    let rnameSplit = rname.split(":");
    if (rnameSplit.length === 1) return false;
    rnameSplit.pop();
    let parentRight = rnameSplit.join(":");
    return hasRights(username, parentRight);
  }
  return hasRight;
}

function randomString(len) {
  len = len || 32;
  var $chars = "ABCDEFGHIJKLNMOPQRSTUVWXYZabcdefghijklnmopqrstuvwxyz1234567890_";
  var maxPos = $chars.length;
  var pwd = "";
  for (let i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}

function defaultFalseCallBack(req, res, ResponseKey, ResponseValue, notAjaxRedirect) {
  if (req.xhr) {
    res.send({
      ResponseKey: ResponseKey,
      ResponseValue: ResponseValue
    });
  } else {
    res.redirect(notAjaxRedirect || "./error/notlogin");
  }
  res.end();
}

module.exports.randomString = randomString;
module.exports.groups = () => Object.keys(groupRights).filter(e => e !== "loaded");
module.exports.needLogin = (req, res, trueCallBack, falseCallBack) => {
  let username = req.session["username"];
  if (req.session["login"] && loginedContainer.isLogined(req.sessionID, username)) {
    if (req.session["login"] === true && username) {
      trueCallBack && trueCallBack();
      return true;
    }
  }
  falseCallBack ? falseCallBack() : defaultFalseCallBack(req, res, "user/status", "NotLogin");
  return false;
};

module.exports.hasRights = (u, r) => hasRights(u, r);
module.exports.getUserGroup = u => getUserGroup(u);

// 基于 SESSION 的权限判断
module.exports.hasSessionRights = (req, res, r) => {
  if (this.needLogin(req, res)) {
    const username = req.session["username"];
    return hasRights(username, r);
  }
  return false;
};

const TOKEN_NAME = "_T0K_N";
module.exports.tokenName = TOKEN_NAME;
module.exports.tokenCheck = (req, res, trueCallBack, falseCallBack) => {
  if (req.session["token"] && req.query[TOKEN_NAME]) {
    if (req.session["token"] == req.query[TOKEN_NAME]) {
      //不开启一次性 Token
      // req.session['token'] = randomString(32);
      trueCallBack && trueCallBack();
      //new token
      return;
    }
  }
  falseCallBack ? falseCallBack() : defaultFalseCallBack(req, res, "user/status", "NotToken", "/error/token");
};

const serverModel = require("../model/ServerModel");
const userModel = require("../model/UserModel");

//先判断用户是否存在，再是否能管理这个服务器，然后再判断这个服务器是否存在
module.exports.isCanServer = (userName, serverName) => {
  userName = userName.trim();
  serverName = serverName.trim();
  if (userName == "" || serverName == "") return false;
  if (getUserGroup(userName) === "master") return true;

  if (userModel.userCenter().isExist(userName)) {
    let user = userModel.userCenter().get(userName);
    if (user.hasServer(serverName)) {
      if (serverModel.ServerManager().isExist(serverName)) {
        return true;
      }
    }
  }
  return false;
};

module.exports.isOnline = (username) => {
  let onlineusers = MCSERVER.onlineUser;
  for (let k in onlineusers) {
    if (k === username) {
      return true;
    }
  }
  return false;
};

//是否到期时间已经到达
module.exports.isTimeLimit = (deallineStr) => {
  if (!deallineStr || deallineStr.length < 1) {
    return false;
  }
  let dealTime = new Date(deallineStr);
  let nowTime = new Date();
  return nowTime >= dealTime;
};
