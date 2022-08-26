function readdirRecurivelySync(_root) {
  var fs = require("fs");
  var path = require("path");
  var results = [];
  var root = path.resolve(_root);
  function callbackGen(_path) {
    return function callback(element) {
      var current = path.resolve(_path);
      var target = path.resolve(current, element);
      if (fs.lstatSync(target).isDirectory()) {
        fs.readdirSync(target).forEach(callbackGen(target));
      } else {
        results.push("."+target.substring(root.length));
      }
    }
  }
  fs.readdirSync(root).forEach(callbackGen(root));
  return results;
}
module.exports=readdirRecurivelySync;