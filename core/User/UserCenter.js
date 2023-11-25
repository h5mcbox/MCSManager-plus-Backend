const { User, USER_SAVE_PATH } = require("./User");
const { hash, createPassword, randomString } = require("./CryptoMine");
const ECC = require("./simpleecc")("secp256k1");
const fs = require("fs");
const totp = require("../../helper/totp");
const fromHEXString = hexString =>
  new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

const toHEXString = bytes =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
//目前hash算法:sha256


const USER_DIR = "./" + USER_SAVE_PATH;

class UserCenter {
  /** @type {Object.<string,User>} */
  userList = {}
  constructor() {
    this.userList = {};
  }

  initUser() {
    let memoryUser = {};
    if (this.userList) {
      for (let uName of Object.keys(this.userList)) {
        let user = this.userList[uName];
        if (user.dataModel.OnlyMemory) {
          memoryUser[uName] = user;
        }
      }
    }
    this.userList = {};
    for (let uName of Object.keys(memoryUser)) {
      this.userList[uName] = memoryUser[uName];
    }
    let users = fs.readdirSync(USER_DIR);
    let username = null;
    let userTemp = null;
    //当管理员忘记密码时候使用
    let masterUserCounter = 0;
    for (let key in users) {
      username = users[key].replace(".json", "");
      userTemp = new User(username);
      userTemp.load();
      this.userList[username] = userTemp;
    }
    for (let userTemp of Object.values(this.userList)) {
      if (userTemp.dataModel.group === "master" || (userTemp.dataModel.username.substring(0, 1) === "#")) masterUserCounter++;
    }
    //删除所有管理员账号后，自动创建一个新的初始化用户
    if (masterUserCounter == 0) {
      let tempPassword = randomString(13);
      const tempUsername = "#_master";
      this.userList[tempUsername] = this.register(tempUsername, tempPassword);
      MCSERVER.log("========================================================");
      MCSERVER.log(`管理用户已初始化 | 创建账号: ${tempUsername} 密码 ${tempPassword}`);
      MCSERVER.log(`此账户为内存账户,请自行创建自己的管理账号并重启面板`);
      MCSERVER.log("========================================================");
      MCSERVER.log("请注意！凡是以 # 符号开头的用户名,均视为管理员账号。");
    }
  }

  register(username, password, LoginPublicKey, group, userRights) {
    let isRandomPassword = password.length == 0 && LoginPublicKey;
    let [passwordHash, salt] = createPassword(isRandomPassword ? randomString(32) : password, randomString(16));
    let newUser = new User(username, passwordHash, salt);
    Object.assign(newUser.dataModel, {
      LoginPublicKey,
      group,
      randomPassword: isRandomPassword
    });
    if (userRights) newUser.dataModel.userRights = userRights;
    if (isRandomPassword) newUser.dataModel.randomPassword = true;
    if (!newUser.dataModel.OnlyMemoryUser) newUser.save();
    this.userList[username] = newUser;
    return newUser;
  }

  //理应只有管理员可以操作
  rePassword(username, password) {
    let [passwordHash, salt] = createPassword(password, randomString(16));
    this.get(username).dataModel.randomPassword = password.length === 0;
    this.get(username).dataModel.password = passwordHash;
    this.get(username).dataModel.salt = salt;
    this.userList[username].save();
  }
  //理应只有管理员可以操作
  reLoginPublicKey(username, LoginPublicKey) {
    this.get(username).dataModel.LoginPublicKey = LoginPublicKey;
    this.userList[username].save();
  }
  //理应只有管理员可以操作
  reGroup(username, group) {
    this.get(username).dataModel.group = group;
    this.userList[username].save();
  }

  //理应只有管理员可以操作
  reUsername(username, newUsername) {
    let oldDataModel = this.userList[username].dataModel;
    let newUser = new User(newUsername, oldDataModel.password, oldDataModel.salt);
    //移植數據
    // for (let k in oldDataModel) {
    //     if (k == '__filename__') continue;
    //     newUser.dataModel[k] = oldDataModel[k];
    // }
    newUser.dataModel.createDate = oldDataModel.createDate;
    newUser.dataModel.lastDate = oldDataModel.lastDate;
    newUser.dataModel.randomPassword = oldDataModel.randomPassword;
    newUser.dataModel.group = oldDataModel.group;
    newUser.allowedServer(oldDataModel.allowedServer || []);
    newUser.save();
    this.userList[newUsername] = newUser;
    this.deleteUser(username);
  }

  /**
   * @description 统一登录验证
   * @param {Object} param0 
   * @param {string} param0.loginSalt
   * @param {string} param0.password
   * @param {string} param0.username
   * @param {boolean} param0.notSafeLogin
   * @returns {{verified:boolean,user:User}}
   */
  loginCheck({
    username = "",
    password = "",
    loginSalt = "",
    is2FACode = false,
    notSafeLogin = false,
  }) {
    let user = this.userList[username];
    if (!user && !this.userList.hasOwnProperty(username)) return { verified: false };
    user.load();
    if (loginSalt && !notSafeLogin) {
      let verified = password === hash.hmac(loginSalt, is2FACode ? totp.totp(user.dataModel.TwoFAKey,6) : user.passwordHash);
      return { verified, user: user };
    }
    if (notSafeLogin) {
      return { verified: user.isPassword(password), user: user };
    }
  }

  deleteUser(username) {
    let isMemoryUser;
    if (this.userList[username]) {
      isMemoryUser = this.userList[username].dataModel.OnlyMemoryUser
    }
    let filePath = "./" + USER_SAVE_PATH + username + ".json";
    if (fs.existsSync(filePath)) {
      delete this.userList[username];
      fs.unlinkSync(filePath);
      return true;
    } else if (isMemoryUser) {
      delete this.userList[username];
      return true;
    }
    return false;
  }

  /**
   * @param {String} username
   * @returns {User|null}
   * @memberof UserCenter
   */
  get(username) {
    if (this.userList[username]) return this.userList[username];
    return null;
  }

  isExist(name) {
    if (this.userList.hasOwnProperty(name)) {
      return true;
    }
    return false;
  }

  getUserList() {
    let list = [];
    let data = {};
    let tmp = null;
    for (let k in this.userList) {
      data = {}; //BUG Note: 引用初始化

      if (!this.userList[k]) continue;
      tmp = this.userList[k].dataModel;
      //删除掉一些不可泄露的信息
      data.username = tmp.username;
      data.lastDate = tmp.lastDate;
      data.createDate = tmp.createDate;
      list.push({
        username: this.userList[k].dataModel.username,
        data: data
      });
    }
    return list;
  }

  getAdvancedUserList() {
    const list = [];
    for (const name in this.userList) {
      // 暴力克隆对象
      const newData = JSON.parse(JSON.stringify(this.userList[name].dataModel));
      // 删除一部分隐私
      delete newData["password"];
      delete newData["salt"];
      delete newData["__filename__"];
      delete newData["apikey"];
      list.push(newData);
    }
    return list;
  }

  getUserCounter() {
    let tmp = 0;
    // eslint-disable-next-line no-unused-lets
    for (let k in this.userList) tmp++;
    return tmp;
  }

  saveAllUser() {
    let objs = this.userList;
    for (let k in objs) {
      objs[k].save();
    }
  }

  returnUserObjList() {
    return this.userList;
  }
}

module.exports = UserCenter;
