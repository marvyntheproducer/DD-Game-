// Shared by the shipped app and its real Electron integration test.
function installGameSession(session){
  session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.setPermissionCheckHandler(()=>false);
  session.webRequest.onBeforeRequest((details,callback)=>{
    try{const url=new URL(details.url);callback({cancel:!(url.protocol==='drift:'&&url.host==='game'||url.protocol==='data:'||url.protocol==='blob:')});}
    catch{callback({cancel:true});}
  });
}
module.exports={installGameSession};
