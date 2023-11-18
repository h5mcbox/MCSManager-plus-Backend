let fs = require("fs");

// 数据模型类
// 用作数据与真实文件之间的抽象关系，数据模型保存的所有数据均会序列化成 JSON 格式保存在文件中。
class DataModel {
  #memoryModel=false;
  #filename="";
  constructor(filename,OnlyMemory=false) {
    this.#memoryModel=OnlyMemory;
    this.#filename = `./${filename}.json`;
  }

  filename(newFilename) {
    if (newFilename) this.#filename = newFilename + ".json";
    else return this.#filename;
  }

  // 从JSON文件装载到数据模型
  load() {
    if(this.#memoryModel){return undefined;}
    let data = fs.readFileSync(this.#filename , "utf-8");
    let ele = JSON.parse(data);
    for (var key in ele) {
      this[key] = ele[key];
    }
  }

  // 数据模型写入到JSON文件中
  save() {
    if(this.#memoryModel){return undefined;}
    fs.writeFileSync(this.#filename, JSON.stringify(this, null, 4));
  }

  isExist(callback) {
    fs.existsSync(this.filename)&&callback(exists);
  }

  update(needJson) {
    for (let key in needJson) {
      this[key] = needJson[key];
    }
  }

  upload(that, needkey) {
    let key = null;
    if (needkey == undefined) {
      // eslint-disable-next-line no-unused-vars
      for (var mineKey in this) {
        that[key] = this[key];
      }
      return;
    }
    for (let i = 0; i < needkey.length; i++) {
      key = needkey[i];
      if (this.hasOwnProperty(key)) {
        that[key] = this[key];
      } else {
        that[key] = undefined;
      }
    }
    return;
  }
}

module.exports = DataModel;
