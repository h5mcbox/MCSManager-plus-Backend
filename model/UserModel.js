const UserCenter = require("../core/User/UserCenter");

let userCenter = new UserCenter;

module.exports.userCenter = () => userCenter;

module.exports.deleteUser = (username, truecb, falsecb) => {
  try {
    if (userCenter.deleteUser(username)) {
      truecb && truecb();
      return;
    }
    falsecb && falsecb();
  } catch (e) {
    MCSERVER.log(e);
    falsecb && falsecb();
  }
  return false;
};

module.exports.reAllowedServer = (username, list) => {
  return userCenter.get(username).allowedServer(list).save();
};
