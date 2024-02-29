//用户模型

const DataModel = require("../DataModel");
const { createPassword } = require("./CryptoMine");
const fs = require("fs");
const uuid = require("uuid");
const totp = require("../../helper/totp");


const USER_SAVE_PATH = "users/";
class User {
  constructor(username, password, salt) {
    let now = new Date().toLocaleString();
    if (username.startsWith("#_") || username.startsWith("_")) {
      this.dataModel = new DataModel(USER_SAVE_PATH + username, true);
      this.dataModel.OnlyMemoryUser = true;
    } else {
      this.dataModel = new DataModel(USER_SAVE_PATH + username);
      this.dataModel.OnlyMemoryUser = false;
    }

    this.dataModel.username = username;
    this.dataModel.password = password || undefined;
    this.dataModel.salt = salt || undefined;
    this.dataModel.createDate = now;
    this.dataModel.lastDate = now;
    this.dataModel.allowedServer = [];
    this.dataModel.lastOperator = "";

    // API KEYthis.dataModel.apikey
    this.dataModel.apikey = "";
  }

  load() {
    if (this.dataModel.OnlyMemoryUser) return this;
    this.dataModel.load();
    return this;
  }

  save() {
    if (this.dataModel.OnlyMemoryUser) return this;
    this.dataModel.save();
    return this;
  }

  delete() {
    if (this.dataModel.OnlyMemoryUser) return undefined;
    let path = "./" + USER_SAVE_PATH + this.dataModel.username + ".json";
    fs.unlinkSync(path);
  }

  isPassword(password) {
    let [_password] = createPassword(password, this.dataModel.salt);
    if (_password === this.dataModel.password) {
      this.updateLastDate();
      return true;
    }
    return false;
  }

  /**
   * @return {String}
   */
  get passwordHash() {
    return this.dataModel.password;
  }

  updateLastDate() {
    this.dataModel.lastDate = new Date().toLocaleString();
    return this;
  }

  allowedServer(list) {
    if (!list) return this.dataModel.allowedServer;
    this.dataModel.allowedServer = list;
    return this;
  }

  hasServer(serverName) {
    for (let key in this.dataModel.allowedServer) {
      if (this.dataModel.allowedServer[key] == serverName) {
        return true;
      }
    }
    return false;
  }

  setApiKey(v) {
    this.dataModel.apikey = v;
  }

  updateApiKey() {
    this.dataModel.apikey = uuid.v4().replace(/-/gim, "");
  }
}

module.exports = {
  User,
  USER_SAVE_PATH
};
