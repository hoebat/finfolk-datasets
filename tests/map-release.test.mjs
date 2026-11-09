import test from 'node:test';
import assert from 'node:assert/strict';
import {mapResponse,resetMapArchiveCache} from '../src/map-release.mjs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const hash='a'.repeat(64),id='b'.repeat(64),commit='c'.repeat(40);
const releases=[{commit,path:`datasets/runtime/releases/${id}/manifest.json`,sha256:'d'.repeat(64),manifest:{id,regions:79,rasterCount:0,contourRegions:16,files:{'data/catalog.json':{hash,bytes:2},'data/grids/pilot/0/0.f32.gz':{hash,bytes:2}}}}];
const request=(path,init)=>new Request('https://datasets.finfolk.com.au/v1/map/'+path,init);
test('current release points to one immutable catalog base',async()=>{
 const r=await mapResponse(request('current'),releases);
 assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*');
 assert.deepEqual(await r.json(),{id,base:`https://datasets.finfolk.com.au/v1/map/releases/${id}/`,sourceCommit:commit,manifestSha256:'d'.repeat(64),regions:79,rasterCount:0,contourRegions:16});
 assert.equal((await mapResponse(request('current'),[])).status,404);
});
test('only allowlisted files can reach the pinned Git LFS origin',async()=>{
 let calls=0;
 const fetcher=async(url,options)=>{calls++;assert.equal(url,`https://media.githubusercontent.com/media/hoebat/finfolk-next/${commit}/datasets/runtime/releases/${id}/files/data/catalog.json`);assert.equal(options.method,'GET');return new Response('{}',{headers:{'Content-Length':'2'}});};
 const r=await mapResponse(request(`releases/${id}/data/catalog.json`),releases,fetcher);
 assert.equal(await r.text(),'{}');assert.equal(r.headers.get('ETag'),`"${hash}"`);assert.match(r.headers.get('Cache-Control'),/immutable/);
 for(const path of [`releases/${id}/.env`,`releases/${id}/__proto__`,`releases/${'f'.repeat(64)}/data/catalog.json`])assert.equal((await mapResponse(request(path),releases,fetcher)).status,404);
 assert.equal(calls,1);
});
test('binary chunks stay compressed, HEAD and conditional requests have no body',async()=>{
 let calls=0;
 const fetcher=async()=>{calls++;return new Response(new Uint8Array([31,139]),{headers:{'Content-Length':'2'}});};
 const path=`releases/${id}/data/grids/pilot/0/0.f32.gz`;
 const r=await mapResponse(request(path),releases,fetcher);assert.deepEqual([...new Uint8Array(await r.arrayBuffer())],[31,139]);assert.equal(r.headers.get('Content-Encoding'),null);
 const head=await mapResponse(request(path,{method:'HEAD'}),releases,fetcher);assert.equal(await head.text(),'');assert.equal(head.headers.get('Content-Length'),'2');
 const cached=await mapResponse(request(path,{headers:{'If-None-Match':`"${hash}"`}}),releases,fetcher);assert.equal(cached.status,304);assert.equal(calls,2);
});
test('missing or wrong sized upstream assets fail without caching an error',async()=>{
 const path=`releases/${id}/data/catalog.json`;
 for(const fetcher of [async()=>new Response('missing',{status:404}),async()=>new Response('bad',{headers:{'Content-Length':'3'}}),async()=>{throw Error('network');}]){
  const r=await mapResponse(request(path),releases,fetcher);assert.equal(r.status,502);assert.equal(r.headers.get('Cache-Control'),'no-store');
 }
 assert.equal((await mapResponse(request(path,{method:'POST'}),releases)).status,405);
 assert.equal((await mapResponse(request(path,{method:'OPTIONS'}),releases)).status,204);
});
test('HTTP gzip preserves the decoded catalog hash while numeric gzip is not decoded twice',async()=>{
 const gzip=await import('node:zlib'),body=gzip.gzipSync('{}');
 const release=structuredClone(releases);release[0].manifest.files['data/catalog.json'].storage={path:'data/catalog.json.gz',hash:'e'.repeat(64),bytes:body.length,encoding:'gzip'};
 const r=await mapResponse(request(`releases/${id}/data/catalog.json`),release,async url=>{assert(url.endsWith('data/catalog.json.gz'));return new Response(body,{headers:{'Content-Length':String(body.length)}});});
 assert.equal(r.headers.get('Content-Encoding'),'gzip');assert.equal(gzip.gunzipSync(new Uint8Array(await r.arrayBuffer())).toString(),'{}');assert.equal(r.headers.get('ETag'),`"${hash}"`);
});
function tileFixture(){
 const bytes=Buffer.from([26,4,18,2,0,1]),sha=b=>createHash('sha256').update(b).digest('hex');
 const body=Buffer.from(JSON.stringify({version:1,tiles:{'12/14':{data:bytes.toString('base64'),hash:sha(bytes),bytes:bytes.length}}})),packed=gzipSync(body),name='data/explore-contours/pilot/10.tiles.json';
 const list=structuredClone(releases);list[0].manifest.tileArchives={'pilot/10':name};
 list[0].manifest.files[name]={hash:sha(body),bytes:body.length,storage:{path:name+'.gz',hash:sha(packed),bytes:packed.length,encoding:'gzip'}};
 return {list,packed,bytes,path:`releases/${id}/data/explore-contours/pilot/10/12/14.pbf`};
}
test('tile archives reconstruct exact PBF bytes, deduplicate reads and reset idempotently',async()=>{
 resetMapArchiveCache();const {list,packed,bytes,path}=tileFixture();let calls=0;
 const fetcher=async()=>{calls++;return new Response(packed);};
 try{
  const results=await Promise.all([mapResponse(request(path),list,fetcher),mapResponse(request(path),list,fetcher)]);
  for(const r of results){assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes);assert.equal(r.headers.get('Content-Type'),'application/vnd.mapbox-vector-tile');}
  assert.equal(calls,1);
  assert.equal((await mapResponse(request(path.replace('14.pbf','99.pbf')),list,fetcher)).status,404);assert.equal(calls,1);
  resetMapArchiveCache();resetMapArchiveCache();assert.equal((await mapResponse(request(path),list,fetcher)).status,200);assert.equal(calls,2);
  resetMapArchiveCache();const bad=Buffer.from(packed);bad[12]^=1;assert.equal((await mapResponse(request(path),list,async()=>new Response(bad))).status,502);
  assert.equal((await mapResponse(request(path),list,fetcher)).status,200);assert.equal(calls,3);
 }finally{resetMapArchiveCache();}
});
test('reset fences an in-flight archive from repopulating the cache',async()=>{
 resetMapArchiveCache();const {list,packed,path}=tileFixture();let resolveFetch,calls=0;
 try{
  const pending=mapResponse(request(path),list,()=>{calls++;return new Promise(resolve=>resolveFetch=resolve);});
  resetMapArchiveCache();resolveFetch(new Response(packed));assert.equal((await pending).status,200);
  assert.equal((await mapResponse(request(path),list,async()=>{calls++;return new Response(packed);})).status,200);assert.equal(calls,2);
 }finally{resetMapArchiveCache();}
});
