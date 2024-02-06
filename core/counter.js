const DataModel = require("./DataModel");

class Counter {
  #initDataCallbackList = [];
  #counterMask = {};
  #dataModel = new DataModel("core/info");
  initData(callback) {
    const initDataCallbackList = this.#initDataCallbackList;
    initDataCallbackList.push(callback);
  };
  init() {
    const dataModel = this.#dataModel;
    const initDataCallbackList = this.#initDataCallbackList;
    this.load();
    //定时清楚
    setInterval(function () {
      if (new Date().getDate() == 1 && new Date().getMonth() + 1 >= dataModel.reloadMonth) {
        dataModel.reloadMonth = new Date().getMonth() + 2; //调至下个月
        MCSERVER.log(" ---- 数据期限已到 清空数据统计 ---- ");
        for (let i in initDataCallbackList) {
          initDataCallbackList[i]();
        }
        this.save();
      }
    }, 10000);
  }
  load() {
    const dataModel = this.#dataModel;
    dataModel.load();
    this.#counterMask=dataModel.counterData;
    if (dataModel.reloadMonth == undefined) dataModel.reloadMonth = new Date().getMonth() + 2; //下个月
    dataModel.save();
    return this;
  }
  save() {
    const dataModel = this.#dataModel;
    const counterMask = this.#counterMask;
    dataModel.counterData = counterMask;
    dataModel.save();
    return this;
  }
  plus(event) {
    const counterMask = this.#counterMask;
    if (counterMask[event] != undefined) {
      counterMask[event]++;
    } else {
      counterMask[event] = 1;
    }
    return this;
  }
  minus(event) {
    const counterMask = this.#counterMask;
    if (counterMask[event] != undefined) {
      counterMask[event]--;
    } else {
      counterMask[event] = 1;
    }
    return this;
  }
  set(event, value) {
    const counterMask = this.#counterMask;
    counterMask[event] = value;
    return this;
  }
  get(event) {
    const counterMask = this.#counterMask;
    if (counterMask[event] != undefined) {
      return counterMask[event];
    }
    return 0;
  }
  add(event, value) {
    const counterMask = this.#counterMask;
    if (counterMask[event] != undefined) {
      counterMask[event] += value;
    } else {
      counterMask[event] = 1;
    }
    return this;
  }
}


module.exports = new Counter;
