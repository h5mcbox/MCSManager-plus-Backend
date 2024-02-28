/* eslint-disable no-prototype-builtins */

module.exports = class RPCHandler {
  #routes = new Map;
  //监听
  define(event, _, callback = null) {
    if (callback === null) {
      callback = _; _ = null;
    }
    let callbackConfig = { callback };
    this.#routes.set(event, callbackConfig);
  };
  //触发
  async emit(event, ...args) {
    if (!this.#routes.has(event)) return [false, null];
    let { callback } = this.#routes.get(event);
    return [true, await callback(...args)];
  }
  //移除监听
  remove(event) {
    this.#routes.delete(event);
  };
}