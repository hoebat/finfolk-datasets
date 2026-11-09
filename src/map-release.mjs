// Only files named in a pinned, build-verified manifest can be requested.
export async function mapResponse(request, releases, fetcher = fetch) {
 const url = new URL(request.url), prefix = '/v1/map/releases/';
 const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Expose-Headers':'Content-Length, ETag','X-Content-Type-Options':'nosniff'};
 const json = (value,status=200) => new Response(request.method==='HEAD'?null:JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(!['GET','HEAD'].includes(request.method))return json({error:'Read-only service'},405);
 if(url.pathname==='/v1/map/current'){
  const release=releases.at(-1);
  return release?json({id:release.manifest.id,base:new URL(prefix+release.manifest.id+'/',url).href,sourceCommit:release.commit,manifestSha256:release.sha256,regions:release.manifest.regions,rasterCount:release.manifest.rasterCount,contourRegions:release.manifest.contourRegions}):json({error:'No map release published'},404);
 }
 if(!url.pathname.startsWith(prefix))return json({error:'Not found'},404);
 const [id,...parts]=url.pathname.slice(prefix.length).split('/'),name=parts.join('/');
 const release=releases.find(r=>r.manifest.id===id);
 if(!release)return json({error:'Map release not found'},404);
 if(name==='manifest.json')return new Response(request.method==='HEAD'?null:JSON.stringify(release.manifest),{headers:{...cors,'Content-Type':'application/json','Cache-Control':'public, max-age=31536000, immutable'}});
 const file=Object.hasOwn(release.manifest.files,name)?release.manifest.files[name]:null;
 if(!file)return json({error:'Release file not found'},404);
 const etag='"'+file.hash+'"',headers={...cors,'ETag':etag,'Cache-Control':'public, max-age=31536000, immutable','Content-Type':name.endsWith('.png')?'image/png':name.endsWith('.gz')?'application/gzip':'application/json; charset=utf-8'};
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
