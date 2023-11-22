const WorkerCenter = require("../core/Workers/WorkerCenter");
const Worker=require("../core/Workers/Worker")

let OnlyWorkerCenters = new WorkerCenter();
module.exports = OnlyWorkerCenters;
(async () => {
  for (let { workername } of OnlyWorkerCenters.getWorkerList()) await OnlyWorkerCenters.get(workername).connect();
})();