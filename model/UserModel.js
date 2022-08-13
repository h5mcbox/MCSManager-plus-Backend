const UserCenter = require("../core/User/UserCenter");

let userCenters = new UserCenter();
module.exports.userCenter = () => {
  return userCenters;
};

module.exports.registerUser = (username, password) => {
  return userCenters.register(username, password);
};

module.exports.loginUser = (username, password, truecb, falsecb, enkey, TwoFACode,ChallengeID) => {
  return userCenters.loginCheck(username, password, truecb, falsecb, enkey, false, TwoFACode,ChallengeID);
};

module.exports.believeLogin = (username, password, truecb, falsecb,ChallengeID) => {
  return userCenters.loginCheck(username, password, truecb, falsecb, null, true, null,ChallengeID);
};

module.exports.deleteUser = (username, truecb, falsecb) => {
  try {
    if (userCenters.deleteUser(username)) {
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
  return userCenters.get(username).allowedServer(list).save();
};
