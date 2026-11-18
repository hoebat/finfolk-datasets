// Read-only, bounded gateways for display data. Survey releases remain Git/LFS-backed.
const PROVIDER_PREFIX='/v1/map/providers/';
const NSW='https://mapprod2.environment.nsw.gov.au/arcgis/rest/services/Coastal_Marine/NSW_Marine_Lidar_Bathymetry_Data_2018/MapServer/';
const VIC='https://biod-gis.mapshare.vic.gov.au/arcgis/rest/services/CoastKit/Bathymetry/MapServer/';
function tilePath(path,extension,maxzoom){
 const m=path.match(new RegExp('^(\\d+)/(\\d+)/(\\d+)\\.'+extension+'$'));
 return m&&Number(m[1])<=maxzoom&&Number(m[2])<2**Number(m[1])&&Number(m[3])<2**Number(m[1]);
}
function arcgisQuery(url,provider,path){
 if(path==='legend')return new URLSearchParams({f:'json'});
 if(path!=='export')return null;
 const p=url.searchParams,keys=['f','bbox','bboxSR','imageSR','size','format','transparent','layers','interpolation'];
 if([...p.keys()].some(k=>!keys.includes(k)))return null;
 const bbox=(p.get('bbox')||'').split(',').map(Number),size=(p.get('size')||'').split(',').map(Number);
 if(bbox.length!==4||bbox.some(n=>!Number.isFinite(n)||Math.abs(n)>20037509)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3]||size.length!==2||size.some(n=>!Number.isInteger(n)||n<1||n>1400))return null;
 if(!['show:2',...(provider==='vic'?['show:13','show:15','show:19']:[])].includes(p.get('layers'))||provider==='vic'&&p.get('layers')==='show:2')return null;
 if(p.get('f')!=='image'||p.get('bboxSR')!=='3857'||p.get('imageSR')!=='3857'||p.get('format')!=='png32'||p.get('transparent')!=='true'||p.get('interpolation')!=='RSP_NearestNeighbor')return null;
 return new URLSearchParams(keys.map(k=>[k,p.get(k)]));
}
function targetFor(url){
 const [provider,...parts]=url.pathname.slice(PROVIDER_PREFIX.length).split('/'),path=parts.join('/');
 if(!path||/%2f|%5c|\.\.|[\\\x00-\x20]/i.test(path))return null;
 if(provider==='osm'&&tilePath(path,'png',19))return {provider,url:'https://tile.openstreetmap.org/'+path};
 if(provider==='terrain'&&tilePath(path,'png',8))return {provider,url:'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+path};
 if(['nsw','vic'].includes(provider)){
  const query=arcgisQuery(url,provider,path);if(!query)return null;
  return {provider,url:(provider==='nsw'?NSW:VIC)+path+'?'+query,metadata:path==='legend'};
 }
 if(provider==='openfreemap'){
  const metadata=path==='styles/liberty'||path==='planet';
  const allowed=metadata||/^sprites\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_@.-]+\.(json|png)$/.test(path)||/^fonts\/[^/]+\/\d+-\d+\.pbf$/.test(path)||/^planet\/[a-zA-Z0-9_.-]+\/\d+\/\d+\/\d+\.pbf$/.test(path)||path.startsWith('natural_earth/ne2sr/')&&tilePath(path.slice('natural_earth/ne2sr/'.length),'png',6);
  if(allowed)return {provider,url:'https://tiles.openfreemap.org/'+path,metadata};
 }
 return null;
}
function rewriteLocation(value,base){
 const path=value.replace(/^https:\/\/tiles\.openfreemap\.org\//,'');
 if(path===value)throw Error('Unexpected map resource origin');
 const candidate=new URL(PROVIDER_PREFIX+'openfreemap/'+path,base);
 // Templates are intentionally kept unescaped for MapLibre substitution.
 return candidate.href.replaceAll('%7B','{').replaceAll('%7D','}');
}
function rewriteMetadata(value,base){
 const data=structuredClone(value);
 if(data.sprite){if(typeof data.sprite==='string')data.sprite=rewriteLocation(data.sprite,base);else for(const sprite of data.sprite)sprite.url=rewriteLocation(sprite.url,base);}
 if(data.glyphs)data.glyphs=rewriteLocation(data.glyphs,base);
 if(data.tiles)data.tiles=data.tiles.map(url=>rewriteLocation(url,base));
 for(const source of Object.values(data.sources||{})){
  if(source.url)source.url=rewriteLocation(source.url,base);
  if(source.tiles)source.tiles=source.tiles.map(url=>rewriteLocation(url,base));
 }
 return data;
}
export async function mapProviderResponse(request,fetcher=fetch){
 const url=new URL(request.url),cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Accept, Content-Type','Access-Control-Expose-Headers':'ETag, Last-Modified','X-Content-Type-Options':'nosniff'};
 const error=(message,status)=>new Response(request.method==='HEAD'?null:JSON.stringify({error:message}),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(!['GET','HEAD'].includes(request.method))return error('Read-only map data',405);
 if(!url.pathname.startsWith(PROVIDER_PREFIX))return error('Map provider not found',404);
 const target=targetFor(url);if(!target)return error('Map resource not allowed',404);
 try{
  const upstream=await fetcher(target.url,{method:target.metadata?'GET':request.method,redirect:'manual',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'FinFolkDatasets/1.0 (+https://datasets.finfolk.com.au)','Referer':request.headers.get('Referer')||'https://datasets.finfolk.com.au/'},cf:{cacheEverything:true}});
  if(!upstream.ok)return error('Map provider unavailable',upstream.status===404?404:502);
  const headers=new Headers(cors);
  for(const key of ['Content-Type','Cache-Control','Expires','ETag','Last-Modified','Content-Encoding'])if(upstream.headers.has(key))headers.set(key,upstream.headers.get(key));
  if(!headers.has('Cache-Control'))headers.set('Cache-Control','public, max-age='+(target.provider==='osm'?604800:3600));
  if(target.metadata){
   const value=await upstream.json(),body=JSON.stringify(target.provider==='openfreemap'?rewriteMetadata(value,url.origin):value);
   headers.set('Content-Type','application/json');headers.delete('ETag');headers.delete('Content-Encoding');
   return new Response(request.method==='HEAD'?null:body,{headers});
  }
  return new Response(request.method==='HEAD'?null:upstream.body,{headers});
 }catch{return error('Map provider temporarily unavailable',502);}
}
