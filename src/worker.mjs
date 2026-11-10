/* RELEASE_DATA */
const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN','Cache-Control':'public, max-age=60, must-revalidate'};
const csp="default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'self'";
export default {async fetch(request){
const url=new URL(request.url),path=url.pathname.replace(/\/$/,'')||'/',api=path.startsWith('/v1/')||path==='/health';
if(path==='/v1/map'||path.startsWith('/v1/map/')||path.startsWith('/v1/coastal/'))return mapResponse(request,mapReleases);
const h={...headers,...(api?{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Accept, Content-Type'}:{})};
const respond=(body,status=200,type='application/json; charset=utf-8')=>new Response(request.method==='HEAD'?null:body,{status,headers:{...h,'Content-Type':type}});
const json=(body,status=200)=>respond(JSON.stringify(body),status);
if(request.method==='OPTIONS'&&api)return new Response(null,{status:204,headers:h});
if(!['GET','HEAD'].includes(request.method))return json({error:'Read-only service'},405);
if(path==='/health')return json({status:'ok',schemaVersion:1,sourceCommit:catalogue.release.commit});
if(path==='/v1/manifest')return json({schemaVersion:1,...catalogue.release,snapshotAt:catalogue.snapshotAt,publishedDatasets:catalogue.datasets.length,storage:'Git LFS',administration:'Git-backed releases; browser editing unavailable'});
if(path==='/v1/catalogue'){let datasets=catalogue.datasets;const state=url.searchParams.get('state'),family=url.searchParams.get('family'),q=url.searchParams.get('q')?.toLowerCase();if(state)datasets=datasets.filter(r=>state==='AUS'?r.shared:r.shared||r.states.includes(state));if(family)datasets=datasets.filter(r=>r.family===family);if(q)datasets=datasets.filter(r=>[r.name,r.source,...r.states].join(' ').toLowerCase().includes(q));return json({...catalogue,datasets});}
if(path.startsWith('/v1/datasets/')){let id;try{id=decodeURIComponent(path.slice('/v1/datasets/'.length));}catch{return json({error:'Invalid dataset identifier'},400);}const record=catalogue.datasets.find(r=>r.id===id);return record?json({schemaVersion:1,release:catalogue.release,dataset:record}):json({error:'Dataset not found'},404);}
if(path.startsWith('/v1/')||path==='/admin'||path.startsWith('/admin/')){h['Cache-Control']='no-store';return json({error:path.startsWith('/admin')?'Administration is not enabled on this public service.':'Not found'},404);}
const key=path==='/'?'/':path;
if(Object.hasOwn(files,key)){h['Content-Security-Policy']=csp;return respond(files[key],200,key.endsWith('.svg')?'image/svg+xml':key.endsWith('.js')?'text/javascript; charset=utf-8':key.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');}
return json({error:'Not found'},404);
}};
