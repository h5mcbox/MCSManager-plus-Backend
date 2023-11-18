const WorkerCenter = require("../core/Workers/WorkerCenter");

let OnlyWorkerCenters = new WorkerCenter();
module.exports = OnlyWorkerCenters;
OnlyWorkerCenters.getOnlineWorkers = () => {
  var workers = [];
  OnlyWorkerCenters.getWorkerList().forEach(function (item) {
    if (item.data.online) workers.push(OnlyWorkerCenters.get(item.workername));
  });
  return workers;
}
(async () => {
  for (let { workername } of OnlyWorkerCenters.getWorkerList()) await OnlyWorkerCenters.get(workername).connect();
})();