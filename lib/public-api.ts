export function publicResponse(snapshot:any,path:string,request:Request){
 const url=new URL(request.url),headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, HEAD, OPTIONS','Access-Control-Allow-Headers':'Accept, Content-Type','Cache-Control':'public, max-age=60, must-revalidate'};
 const json=(body:any,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!['GET','HEAD'].includes(request.method))return json({error:'Read-only service'},405);
 if(path==='/health')return json({status:'ok',schemaVersion:1,sourceCommit:snapshot.release.commit});
 if(path==='/v1/manifest')return json({schemaVersion:1,...snapshot.release,snapshotAt:snapshot.snapshotAt,publishedDatasets:snapshot.datasets.length,storage:'Git LFS',administration:'Git-backed draft, review and publish'});
 if(path==='/v1/catalogue'){let rows=snapshot.datasets;const state=url.searchParams.get('state'),family=url.searchParams.get('family'),q=url.searchParams.get('q')?.toLowerCase();if(state)rows=rows.filter((r:any)=>state==='AUS'?r.shared:r.shared||r.states.includes(state));if(family)rows=rows.filter((r:any)=>r.family===family);if(q)rows=rows.filter((r:any)=>[r.name,r.source,...r.states].join(' ').toLowerCase().includes(q));return json({...snapshot,datasets:rows});}
 if(path.startsWith('/v1/datasets/')){let id;try{id=decodeURIComponent(path.slice(13));}catch{return json({error:'Invalid dataset identifier'},400)}const row=snapshot.datasets.find((r:any)=>r.id===id);return row?json({schemaVersion:1,release:snapshot.release,dataset:row}):json({error:'Dataset not found'},404);}
 return json({error:'Not found'},404);
}
