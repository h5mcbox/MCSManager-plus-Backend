const WorkerCenter = require("../core/Workers/WorkerCenter");

let OnlyWorkerCenters = new WorkerCenter();
module.exports=OnlyWorkerCenters;
OnlyWorkerCenters.getOnlineWorkers=()=>{
  var workers=[];
  OnlyWorkerCenters.getWorkerList().forEach(function(item){
    if(item.data.online)workers.push(OnlyWorkerCenters.get(item.workername));
  });
  return workers;
}
(async ()=>{
  var workers=[];
  OnlyWorkerCenters.getWorkerList().forEach(function(item){
    workers.push(OnlyWorkerCenters.get(item.workername));
  });
  for(let worker of workers){
    await worker.connect();
  }
  return workers;
})()