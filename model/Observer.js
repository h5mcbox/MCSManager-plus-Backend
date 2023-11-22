/* eslint-disable no-prototype-builtins */

const CALLBACK = "CALLBACK";
const CALLBACK_NAME = "CALLBACK_NAME";

module.exports = class Observer {
  static FUNCTION_END = "__FUNCTI0N_END__";
  #observerMask = {};
  //监听
  listener(event, _callbackName, _callback) {
    const observerMask = this.#observerMask;
    let callbackName = "";
    let callback = null;
    if (_callback != undefined) {
      callbackName = _callbackName;
      callback = _callback;
    } else {
      callback = _callbackName;
    }
    let callbackConfig = {};
    callbackConfig[CALLBACK_NAME] = callbackName;
    callbackConfig[CALLBACK] = callback;

    if (observerMask.hasOwnProperty(event)) {
      observerMask[event].push(callbackConfig);
      return true;
    }
    observerMask[event] = [callbackConfig];
    return false;
  };
  //触发
  emit(event, msg) {
    const observerMask = this.#observerMask;
    if (observerMask.hasOwnProperty(event)) {
      for (var i in observerMask[event]) {
        let returnV = observerMask[event][i][CALLBACK](msg);
        if (returnV && returnV === this.FUNCTION_END) {
          //如果函数返回 FUNCTION_END，移除监听
          delete observerMask[event][i][CALLBACK];
          delete observerMask[event][i];
        }
      }
      return true;
    }
    return false;
  }
  //移除监听
  remove(event, callbackName) {
    const observerMask = this.#observerMask;
    if (observerMask.hasOwnProperty(event)) {
      for (var i in observerMask[event]) {
        if ((observerMask[event][i][CALLBACK_NAME] = callbackName)) {
          delete observerMask[event][i][CALLBACK];
          delete observerMask[event][i];
          return true;
        }
      }
    }
    return false;
  };
  get FUNCTION_END() {
    return Observer.FUNCTION_END;
  }
}