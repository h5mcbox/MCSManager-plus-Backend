const userCenter = require("../model/UserModel").userCenter();
const permission = require("./Permission");

// 通过 KEY 来获取相对的用户身份
function getUser(key = "") {
  key = key.trim();
  // 感谢来自 https://lazy.ink 贡献。
  if (!key) return null;
  const userList = userCenter.userList;
  for (const userName in userList) {
    const userApiKey = userList[userName].dataModel.apikey;
    if (!userApiKey) continue;
    if (userApiKey === key) {
      return userList[userName];
    }
  }
  return null;
}

module.exports.hasRights=function(key,r){
  const user = getUser(key);
  if (!user) return false;

  const userName = user.dataModel.username;
  return permission.hasRights(userName,r);
}

module.exports.hasServer = (key, serverName) => {
  const user = getUser(key);
  if (!user) return false;

  const userName = user.dataModel.username;
  return permission.isCanServer(userName, serverName);
};
