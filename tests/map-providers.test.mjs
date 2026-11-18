import test from 'node:test';
import assert from 'node:assert/strict';
import {mapProviderResponse} from '../src/map-providers.mjs';
const origin='https://datasets.finfolk.com.au',base=origin+'/v1/map/providers/';
const request=(path,options={})=>new Request(base+path,{headers:{Referer:'https://finfolk.com.au/map'},...options});
test('basemap metadata rewrites nested tiles, sprites, glyphs and source descriptors to the dataset service',async()=>{
 const style={version:8,sprite:'https://tiles.openfreemap.org/sprites/ofm_v1/ofm',glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sources:{vector:{url:'https://tiles.openfreemap.org/planet'},image:{tiles:['https://tiles.openfreemap.org/natural_earth/ne2sr/{z}/{x}/{y}.png'],attribution:'OpenStreetMap contributors'}}};
 const r=await mapProviderResponse(request('openfreemap/styles/liberty'),async()=>Response.json(style,{headers:{ETag:'upstream','Cache-Control':'public, max-age=3600'}}));
 assert.equal(r.status,200);const data=await r.json();
 assert.equal(data.sprite,base+'openfreemap/sprites/ofm_v1/ofm');assert.equal(data.glyphs,base+'openfreemap/fonts/{fontstack}/{range}.pbf');assert.equal(data.sources.vector.url,base+'openfreemap/planet');assert.equal(data.sources.image.tiles[0],base+'openfreemap/natural_earth/ne2sr/{z}/{x}/{y}.png');assert.equal(data.sources.image.attribution,style.sources.image.attribution);assert.equal(r.headers.get('ETag'),null);assert.equal(r.headers.get('Access-Control-Allow-Origin'),'*');
 const tilejson=await mapProviderResponse(request('openfreemap/planet'),async()=>Response.json({tiles:['https://tiles.openfreemap.org/planet/20261101/{z}/{x}/{y}.pbf']}));
 assert.equal((await tilejson.json()).tiles[0],base+'openfreemap/planet/20261101/{z}/{x}/{y}.pbf');
 const invalid=await mapProviderResponse(request('openfreemap/styles/liberty'),async()=>Response.json({glyphs:'https://other.invalid/fonts'}));assert.equal(invalid.status,502);
});
test('binary tiles preserve bytes, caching, identity and referer without forwarding credentials',async()=>{
 const bytes=new Uint8Array([137,80,78,71]);
 for(const [path,upstream]of [['osm/4/8/9.png','https://tile.openstreetmap.org/4/8/9.png'],['terrain/4/8/9.png','https://s3.amazonaws.com/elevation-tiles-prod/terrarium/4/8/9.png'],['openfreemap/fonts/Noto%20Sans/0-255.pbf','https://tiles.openfreemap.org/fonts/Noto%20Sans/0-255.pbf'],['openfreemap/sprites/ofm_v1/ofm@2x.png','https://tiles.openfreemap.org/sprites/ofm_v1/ofm@2x.png']]){
  const response=await mapProviderResponse(request(path),async(url,init)=>{assert.equal(url,upstream);assert.match(init.headers['User-Agent'],/FinFolkDatasets/);assert.equal(init.headers.Referer,'https://finfolk.com.au/map');assert.equal(init.headers.Cookie,undefined);assert.equal(init.redirect,'manual');return new Response(bytes,{headers:{'Content-Type':'image/png','ETag':'"tile"','Cache-Control':'public, max-age=604800'}});});
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);assert.equal(response.headers.get('Cache-Control'),'public, max-age=604800');assert.equal(response.headers.get('ETag'),'"tile"');
 }
});
test('invalid resources, coordinates and writes never reach an upstream server',async()=>{
 for(const path of ['osm/0/1/0.png','osm/20/0/0.png','terrain/9/0/0.png','other/file','openfreemap/private','openfreemap/styles/https://evil.invalid','vic/export?url=https://evil.invalid','nsw/export?bbox=0,0,1,1'])assert.equal((await mapProviderResponse(request(path),()=>assert.fail('Unexpected upstream'))).status,404,path);
 assert.equal((await mapProviderResponse(request('osm/1/0/0.png',{method:'POST'}))).status,405);
 assert.equal((await mapProviderResponse(request('osm/1/0/0.png',{method:'OPTIONS'}))).status,204);
 const head=await mapProviderResponse(request('osm/1/0/0.png',{method:'HEAD'}),async(url,init)=>{assert.equal(init.method,'HEAD');return new Response(null,{headers:{'Content-Type':'image/png'}});});assert.equal(await head.text(),'');
 assert.equal((await mapProviderResponse(request('osm/1/0/0.png'),async()=>new Response(null,{status:302,headers:{Location:'https://elsewhere.invalid'}}))).status,502);
 assert.equal((await mapProviderResponse(request('osm/1/0/0.png'),async()=>{throw Error('Down');})).headers.get('Cache-Control'),'no-store');
});
test('publisher imagery accepts bounded export parameters and preserves legend values',async()=>{
 const query=new URLSearchParams({f:'image',bbox:'0,0,1000,1000',bboxSR:'3857',imageSR:'3857',size:'800,600',format:'png32',transparent:'true',layers:'show:13',interpolation:'RSP_NearestNeighbor'});
 const r=await mapProviderResponse(request('vic/export?'+query),async url=>{assert.ok(url.startsWith('https://biod-gis.mapshare.vic.gov.au/arcgis/'));assert.equal(new URL(url).searchParams.get('layers'),'show:13');return new Response('image',{headers:{'Content-Type':'image/png'}});});assert.equal(await r.text(),'image');
 query.set('size','100000,600');assert.equal((await mapProviderResponse(request('vic/export?'+query))).status,404);
 const legend={layers:[{layerId:13,legend:[{imageData:'aGVsbG8=',label:'2 m'}]}]};const result=await mapProviderResponse(request('vic/legend?f=json'),async()=>Response.json(legend));assert.deepEqual(await result.json(),legend);
});
