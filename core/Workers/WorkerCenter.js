const { Worker, WORKER_SAVE_PATH } = require("./Worker");
const ServerModel = require("../../model/ServerModel");
const fs = require("fs");

const WORKER_DIR = "./" + WORKER_SAVE_PATH;

class WorkerCenter {
  /** @type {Object.<string,Worker>} */
  workerList = {}
  constructor() {
    this.initWorker();
  }

  initWorker() {
    let workers = fs.readdirSync(WORKER_DIR);
    let workername = null;
    let workerTemp = null;
    for (let key in workers) {
      workername = workers[key].replace(".json", "");
      workerTemp = new Worker(workername);
      workerTemp.load();
      this.workerList[workername] = workerTemp;
    }
  }

  createWorker(workername, MasterKey, RemoteDescription) {
    let newWorker = new Worker(workername, MasterKey, RemoteDescription);
    if (!newWorker.dataModel.OnlyMemoryWorker) newWorker.save();
    this.workerList[workername] = newWorker;
    return newWorker;
  }

  //理应只有管理员可以操作
  reMasterKey(Workername, MasterKey) {
    this.get(Workername).dataModel.MasterKey = MasterKey;
    this.workerList[Workername].save();
  }
  //理应只有管理员可以操作
  reRemoteDescription(Workername, RemoteDescription) {
    this.get(Workername).dataModel.RemoteDescription = RemoteDescription;
    this.workerList[Workername].save();
  }

  //理应只有管理员可以操作
  reWorkername(workername, newWorkername) {
    let oldDataModel = this.workerList[workername].dataModel;
    let newWorker = new Worker(newWorkername, oldDataModel.MasterKey, oldDataModel.RemoteDescription);
    //移植數據
    // for (let k in oldDataModel) {
    //     if (k == '__filename__') continue;
    //     newUser.dataModel[k] = oldDataModel[k];
    // }
    newWorker.dataModel.createDate = oldDataModel.createDate;
    newWorker.dataModel.lastDate = oldDataModel.lastDate;
    newWorker.save();
    this.workerList[newWorkername] = newWorker;
    this.deleteWorker(workername);

    //修改服务器的Worker指针
    let serverObjs = ServerModel.ServerManager().getServerObjects()
    Object.values(serverObjs).forEach(function (e) {
      if (e.dataModel.location === workername) {
        e.dataModel.location = newWorkername;
        e.dataModel.save();
      }
    });
  }

  deleteWorker(workername) {
    let filePath = "./" + WORKER_SAVE_PATH + workername + ".json";
    if (fs.existsSync(filePath)) {
      delete this.workerList[workername];
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
  /**
   * @param {String} workername
   * @returns {Worker}
   * @memberof WorkerCenter
   */
  get(workername) {
    if (this.workerList[workername]) return this.workerList[workername];
    return null;
  }

  isExist(name) {
    if (this.workerList.hasOwnProperty(name)) {
      return true;
    }
    return false;
  }

  getWorkerList() {
    let list = [];
    for (let worker of Object.values(this.workerList)) {
      let data = {};
      if (!worker) continue;
      let tmp = worker.dataModel;
      //删除掉一些不可泄露的信息
      data.online = worker.connected;
      data.lastDate = tmp.lastDate;
      data.createDate = tmp.createDate;
      list.push({
        /** @type {string} */
        workername: worker.dataModel.workername,
        /** @type {{online:boolean,lastDate:number,createDate:number}} */
        data: data
      });
    }
    return list;
  }

  getAdvancedWorkerList() {
    const list = [];
    for (const name in this.workerList) {
      // 暴力克隆对象
      const newData = JSON.parse(JSON.stringify(this.workerList[name].dataModel));
      // 删除一部分隐私
      delete newData["MasterKey"];
      delete newData["__filename__"];
      list.push(newData);
    }
    return list;
  }

  getWorkerCounter() {
    let tmp = 0;
    // eslint-disable-next-line no-unused-vars
    for (let k in this.workerList) tmp++;
    return tmp;
  }

  saveAllWorker() {
    let objs = this.workerList;
    for (let k in objs) {
      objs[k].save();
    }
  }

  returnWorkerObjList() {
    return this.workerList;
  }

  getOnlineWorkers() {
    return Object.values(this.workerList).filter(({ connected }) => connected);
  }
}

module.exports = WorkerCenter;
