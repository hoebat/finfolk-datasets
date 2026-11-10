// Only files named in a pinned, build-verified manifest can be requested.
const archiveCache=new Map(),archivePending=new Map();let archiveBytes=0,archiveEpoch=0;
export function resetMapArchiveCache(){archiveCache.clear();archivePending.clear();archiveBytes=0;archiveEpoch++;}
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
async function readTileArchive(release,name,fetcher){
 const file=release.manifest.files[name],key=release.commit+':'+file.hash;
 if(archiveCache.has(key)){const item=archiveCache.get(key);archiveCache.delete(key);archiveCache.set(key,item);return item.value;}
 if(archivePending.has(key))return archivePending.get(key);
 const epoch=archiveEpoch;
 const pending=(async()=>{
  if(file.bytes>24*1024**2)throw Error('Tile archive exceeds runtime size limit');
  const path=release.path.replace(/manifest\.json$/,'files/')+file.storage.path;
  const response=await fetcher('https://media.githubusercontent.com/media/hoebat/finfolk-next/'+release.commit+'/'+path);
  if(!response.ok)throw Error('Tile archive source unavailable');
  const compressed=await response.arrayBuffer();
  if(compressed.byteLength!==file.storage.bytes||await digest(compressed)!==file.storage.hash)throw Error('Tile archive storage checksum mismatch');
  const body=await new Response(new Response(compressed).body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(body.byteLength!==file.bytes||await digest(body)!==file.hash)throw Error('Tile archive checksum mismatch');
  const value=JSON.parse(new TextDecoder().decode(body));
  if(value.version!==1||!value.tiles)throw Error('Invalid tile archive');
  if(epoch===archiveEpoch&&file.bytes<=16*1024**2){
   while(archiveBytes+file.bytes>16*1024**2&&archiveCache.size){const first=archiveCache.keys().next().value;archiveBytes-=archiveCache.get(first).bytes;archiveCache.delete(first);}
   archiveCache.set(key,{value,bytes:file.bytes});archiveBytes+=file.bytes;
  }
  return value;
 })();
 archivePending.set(key,pending);
 try{return await pending;}finally{if(archivePending.get(key)===pending)archivePending.delete(key);}
}
export async function mapResponse(request, releases, fetcher = fetch) {
 const url = new URL(request.url), prefix = '/v1/map/releases/';
 const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Expose-Headers':'Content-Length, ETag','X-Content-Type-Options':'nosniff'};
 const json = (value,status=200) => new Response(request.method==='HEAD'?null:JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(!['GET','HEAD'].includes(request.method))return json({error:'Read-only service'},405);
 const coastal=url.pathname.match(/^\/v1\/coastal\/(coastal-[a-f0-9]{16})\/(.+)$/);
 if(coastal){
  const owner=releases.find(r=>r.manifest.coastalRelease===coastal[1]);
  if(!owner)return json({error:'Coastal release not found'},404);
  url.pathname=prefix+owner.manifest.id+'/data/coastal/'+coastal[1]+'/'+coastal[2];
  return mapResponse(new Request(url,request),releases,fetcher);
 }
 if(url.pathname==='/v1/map/current'){
  const release=releases.at(-1);
  return release?json({id:release.manifest.id,base:new URL(prefix+release.manifest.id+'/',url).href,sourceCommit:release.commit,manifestSha256:release.sha256,regions:release.manifest.regions,rasterCount:release.manifest.rasterCount,contourRegions:release.manifest.contourRegions}):json({error:'No map release published'},404);
 }
 if(!url.pathname.startsWith(prefix))return json({error:'Not found'},404);
 const [id,...parts]=url.pathname.slice(prefix.length).split('/'),name=parts.join('/');
 const release=releases.find(r=>r.manifest.id===id);
 if(!release)return json({error:'Map release not found'},404);
 if(name==='manifest.json')return new Response(request.method==='HEAD'?null:JSON.stringify(release.manifest),{headers:{...cors,'Content-Type':'application/json','Cache-Control':'public, max-age=31536000, immutable'}});
 const tile=name.match(/^data\/explore-contours\/([-a-zA-Z0-9_]+)\/(\d+)\/(\d+)\/(\d+)\.pbf$/);
 if(tile){
  const archiveName=release.manifest.tileArchives?.[tile[1]+'/'+tile[2]+'/'+tile[3]]||release.manifest.tileArchives?.[tile[1]+'/'+tile[2]];
  if(!archiveName)return json({error:'Tile source not found'},404);
  let archive;try{archive=await readTileArchive(release,archiveName,fetcher);}catch{return json({error:'Tile archive temporarily unavailable'},502);}
  const key=tile[3]+'/'+tile[4],entry=Object.hasOwn(archive.tiles,key)?archive.tiles[key]:null;
  if(!entry)return json({error:'Tile not found'},404);
  const bytes=Uint8Array.from(atob(entry.data),c=>c.charCodeAt(0));
  if(bytes.length!==entry.bytes||await digest(bytes)!==entry.hash)return json({error:'Tile checksum mismatch'},502);
  const etag='"'+entry.hash+'"',headers={...cors,'Content-Type':'application/vnd.mapbox-vector-tile','Cache-Control':'public, max-age=31536000, immutable','ETag':etag};
  if(request.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers});
  headers['Content-Length']=String(entry.bytes);
  return new Response(request.method==='HEAD'?null:bytes,{headers,encodeBody:'manual'});
 }
 const file=Object.hasOwn(release.manifest.files,name)?release.manifest.files[name]:null;
 if(!file)return json({error:'Release file not found'},404);
 const type=name.endsWith('.tif')?'image/tiff; application=geotiff':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.png')?'image/png':name.endsWith('.gz')?'application/gzip':'application/json; charset=utf-8';
 const etag='"'+file.hash+'"',headers={...cors,'ETag':etag,'Cache-Control':'public, max-age=31536000, immutable','Content-Type':type};
 if(request.headers.get('If-None-Match')===etag)return new Response(null,{status:304,headers});
 const repository='https://media.githubusercontent.com/media/hoebat/finfolk-next/';
 const stored=file.storage||{path:name,bytes:file.bytes};
 const path=release.path.replace(/manifest\.json$/,'files/')+stored.path;
 let upstream;
 try{upstream=await fetcher(repository+release.commit+'/'+path,{method:request.method,redirect:'follow'});}catch{return json({error:'Dataset source temporarily unavailable'},502);}
 if(!upstream.ok)return json({error:'Dataset source temporarily unavailable'},502);
 const length=upstream.headers.get('Content-Length');
 if(length!==null&&Number(length)!==stored.bytes)return json({error:'Dataset source size mismatch'},502);
 headers['Content-Length']=String(stored.bytes);
 if(stored.encoding==='gzip')headers['Content-Encoding']='gzip';
 // Stream large contours; DatasetCache checks SHA-256 before persisting bytes.
 // Workers otherwise gzip this already-compressed stream a second time.
 return new Response(request.method==='HEAD'?null:upstream.body,{status:200,headers,encodeBody:'manual'});
}
