// Verify the actual hosting compression boundary, not only Node Response mocks.
import {createHash} from 'node:crypto';
const origin=process.argv[2]||'https://datasets.finfolk.com.au';
const current=await fetch(new URL('/v1/map/current',origin),{cache:'no-store'});
if(!current.ok)throw Error('Map release unavailable: '+current.status);
const release=await current.json(),manifestResponse=await fetch(new URL('manifest.json',release.base));
if(!manifestResponse.ok)throw Error('Map manifest unavailable');
const manifest=await manifestResponse.json();
if(manifest.id!==release.id)throw Error('Map release identity mismatch');
for(const path of ['data/catalog.json','data/downloads.json','data/contours/port-phillip.geojson',...(Object.keys(manifest.tileArchives||{}).length?['data/explore-contours/manifest.json']:[])]){
 const meta=manifest.files[path],url=new URL(path,release.base);url.searchParams.set('v',meta.hash);
 const response=await fetch(url,{headers:{Origin:'https://finfolk.com.au'}});
 if(!response.ok)throw Error('Map file unavailable: '+path+' '+response.status);
 if(response.headers.get('Access-Control-Allow-Origin')!=='*')throw Error('Cross-origin map access unavailable');
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length!==meta.bytes||createHash('sha256').update(bytes).digest('hex')!==meta.hash)throw Error('Decoded map checksum mismatch: '+path);
 JSON.parse(bytes.toString());
 console.log('Verified',path,bytes.length,'decoded bytes');
}
if(Object.keys(manifest.tileArchives||{}).length){
 const [key,name]=Object.entries(manifest.tileArchives)[0],archive=await(await fetch(new URL(name,release.base))).json();
 const [position,tile]=Object.entries(archive.tiles)[0],response=await fetch(new URL('data/explore-contours/'+key+'/'+position+'.pbf',release.base));
 if(!response.ok)throw Error('Vector tile unavailable');
 const bytes=Buffer.from(await response.arrayBuffer());
 if(createHash('sha256').update(bytes).digest('hex')!==tile.hash||bytes.length!==tile.bytes)throw Error('Vector tile checksum mismatch');
 console.log('Verified vector tile',bytes.length,'bytes');
}
console.log('MAP_RELEASE_VERIFIED',release.id);
