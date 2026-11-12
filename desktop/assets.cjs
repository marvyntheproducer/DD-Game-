const path=require('node:path');
const fs=require('node:fs/promises');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.ogg':'audio/ogg','.wav':'audio/wav','.png':'image/png','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
function resolveAsset(root,address){
 const url=new URL(address);
 if(url.protocol!=='drift:'||url.host!=='game'||url.username||url.password)throw new Error('Invalid game origin');
 const name=decodeURIComponent(url.pathname);
 if(name.includes('\0')||name.includes('\\'))throw new Error('Invalid asset path');
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 const relative=path.relative(root,file);
 if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||!MIME[path.extname(file)])throw new Error('Invalid asset path');
 return file;
}
async function assetResponse(root,request){
 try{
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const file=resolveAsset(root,request.url),data=await fs.readFile(file);
  return new Response(request.method==='HEAD'?null:data,{headers:{'Content-Type':MIME[path.extname(file)],'Content-Length':String(data.length),'X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Game file not found',{status:404});}
}
function safeBounds(raw={}){
 const finite=(v,def,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,Math.round(v))):def;
 return {width:finite(raw.width,1280,960,3840),height:finite(raw.height,800,600,2160),maximized:raw.maximized===true};
}
module.exports={resolveAsset,assetResponse,safeBounds};
