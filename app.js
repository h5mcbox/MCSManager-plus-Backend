var cp=require("child_process");
var appConfig=require("./app.package.json");
const VERSION=0;
if(appConfig.version===VERSION){
  var instance=cp.fork("./helper/installer/packer.js");
}else{
  var instance=cp.fork("./helper/installer/installer.js");
}
process.on("SIGINT",function(){});
function exithandler(code){
  if(code ===null){
    
  }else if(code!==255){
    process.exit(code);
  }
}
var ProcessClosed=new WeakSet();
function handler(msg){
  if(typeof msg!=="object"){return;}
  if(msg.restart){
    instance.on("close",function (){
      ProcessClosed.add(instance)
    })
    instance.off("close",exithandler);
    setTimeout(function _(){
      if(!ProcessClosed.has(instance)){
        setTimeout(_,100);
        return;
      }
      instance=cp.fork(msg.restart)//,{stdio:"pipe"});
      instance.on("message",handler);
      instance.on("close",exithandler);
    },0);
  }
}
instance.on("message",handler);
instance.on("close",exithandler);