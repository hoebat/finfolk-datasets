import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {loadMapReleases} from './map-releases.mjs';
const release=JSON.parse(readFileSync('data-release.json','utf8'));
const checkout=resolve(process.argv[2]||(existsSync('.cache/catalogue-source/.git')?'.cache/catalogue-source':'../finfolk-atelier'));
const pointer=execFileSync('git',['-C',checkout,'show',release.commit+':'+release.path],{encoding:'utf8'});
if(!pointer.startsWith('version https://git-lfs.github.com/spec/v1\n')||!pointer.includes('oid sha256:'+release.sha256+'\n'))throw Error('Pinned source is not the expected Git LFS object');
const raw=readFileSync(resolve(checkout,release.path));
if(createHash('sha256').update(raw).digest('hex')!==release.sha256)throw Error('Materialized source does not match release hash. Run git lfs pull at the pinned revision.');
const source=JSON.parse(raw);
const datasets=source.datasets.filter(r=>r.publication==='published').map(r=>({...r,assets:r.assets.filter(a=>a.status==='published'),pending:[]}));
const catalogue={schemaVersion:1,snapshotAt:source.snapshotAt,states:source.states,regions:source.regions,datasets,release,notes:'Versioned catalogue snapshot. Product files retain their published delivery URLs. Contours are display layers, not numeric depth grids.'};
const files=Object.fromEntries(['index.html','styles.css','app.js','appearance.js','finfolk-wordmark.svg','finfolk-mark.svg','finfolk-icon.svg'].map(n=>['/'+(n==='index.html'?'':n),readFileSync('src/'+n,'utf8')]));
const maps=loadMapReleases();
// Native source downloads are acquisition products, not verified depth samples.
const latest=maps.at(-1);
for(const s of latest?.manifest.coastalSources||[]){
 const base='https://datasets.finfolk.com.au/v1/coastal/'+latest.manifest.coastalRelease+'/';
 catalogue.datasets.push({id:s.id,name:s.title,family:'bathymetry',source:s.attribution,states:s.states,regions:[],shared:false,
  surveyDate:s.survey_date,resolution:s.resolution_m,datum:s.source_vertical_reference||s.datum,licence:s.licence,
  quality:s.limitation,validation:'Acquisition verified; vertical review pending',publication:'published',url:s.upstream_url,
  blocker:s.limitation,evidence:'Native coastal COGs retain original signed values, source references and SHA-256 hashes.',
  assets:[{name:'Native COG downloads and provenance',status:'published',url:base+'sources/'+s.id+'.html'},
          {name:'Coastal coverage and source catalogue',status:'published',url:base+'catalog.json'}],pending:[]});
}
const mapRuntime=readFileSync('src/map-release.mjs','utf8').replace(/^export /gm,'');
const server=readFileSync('src/worker.mjs','utf8').replace('/* RELEASE_DATA */',`${mapRuntime}\nconst mapReleases=${JSON.stringify(maps)};\nconst catalogue=${JSON.stringify(catalogue)};\nconst files=${JSON.stringify(files)};`);
mkdirSync('dist/server',{recursive:true});writeFileSync('dist/server/index.js',server);
console.log(JSON.stringify({datasets:datasets.length,sourceCommit:release.commit,lfsSha256:release.sha256,workerBytes:Buffer.byteLength(server)}));
