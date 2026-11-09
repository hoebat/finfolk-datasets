import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

export function loadMapReleases({prepare=false}={}) {
 const descriptors=JSON.parse(readFileSync('map-releases.json','utf8'));
 const checkout=resolve('.cache/map-source');
 const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GIT_LFS_SKIP_SMUDGE:'1'}});
 if(descriptors.length&&prepare){
  mkdirSync(checkout,{recursive:true});
  if(!existsSync(resolve(checkout,'.git'))){git(['init',checkout]);git(['-C',checkout,'remote','add','origin','https://github.com/hoebat/finfolk-next.git']);}
  if(git(['-C',checkout,'remote','get-url','origin']).trim()!=='https://github.com/hoebat/finfolk-next.git')throw Error('Unexpected map source origin');
 }
 return descriptors.map(release=>{
  if(release.repository!=='https://github.com/hoebat/finfolk-next'||!/^[a-f0-9]{40}$/.test(release.commit)||!/^[a-f0-9]{64}$/.test(release.sha256)||!/^datasets\/runtime\/releases\/[a-f0-9]{64}\/manifest\.json$/.test(release.path))throw Error('Invalid pinned map release');
  // Refetch bounded metadata in one pass, rather than triggering one lazy
  // network request per pointer in an existing partial clone.
  if(prepare)git(['-C',checkout,'fetch','--refetch','--filter=blob:limit=1024','--depth=1','origin',release.commit]);
  const raw=git(['-C',checkout,'show',release.commit+':'+release.path]);
  if(createHash('sha256').update(raw).digest('hex')!==release.sha256)throw Error('Map manifest checksum mismatch');
  const manifest=JSON.parse(raw);
  if(manifest.schemaVersion!==1||!release.path.includes('/'+manifest.id+'/'))throw Error('Map manifest identity mismatch');
  const entries=Object.entries(manifest.files);
  for(const [name,file]of entries)if(!/^(data\/[a-zA-Z0-9_./-]+|beaches\.json|guides\.json|social\.json)$/.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..')||!/^[a-f0-9]{64}$/.test(file.hash)||!Number.isSafeInteger(file.bytes)||file.bytes<0)throw Error('Invalid map file descriptor');
  for(const [name,file]of entries){const s=file.storage;if(!s||s.path!==(s.encoding==='gzip'?name+'.gz':name)||!['gzip',null].includes(s.encoding)||!/^[a-f0-9]{64}$/.test(s.hash)||!Number.isSafeInteger(s.bytes)||s.bytes<0)throw Error('Invalid map storage descriptor');}
  for(const [key,name]of Object.entries(manifest.tileArchives||{}))if(!/^[-a-zA-Z0-9_]+\/\d+$/.test(key)||!Object.hasOwn(manifest.files,name)||manifest.files[name].bytes>24*1024**2)throw Error('Invalid tile archive descriptor');
  const input=entries.map(([,file])=>release.commit+':'+release.path.replace(/manifest\.json$/,'files/')+file.storage.path).join('\n')+'\n';
  const output=execFileSync('git',['-C',checkout,'cat-file','--batch'],{input,maxBuffer:32*1024*1024});
  let offset=0;
  for(const [name,file]of entries){
   const end=output.indexOf(10,offset),header=output.subarray(offset,end).toString(),size=Number(header.split(' ')[2]);
   if(!Number.isSafeInteger(size)||size>1024)throw Error('Map asset is not an LFS pointer: '+name);
   const pointer=output.subarray(end+1,end+1+size).toString();offset=end+size+2;
   if(!pointer.startsWith('version https://git-lfs.github.com/spec/v1\n')||!pointer.includes('oid sha256:'+file.storage.hash+'\n')||!pointer.includes('size '+file.storage.bytes+'\n'))throw Error('Map LFS identity mismatch: '+name);
  }
  return {...release,manifest};
 });
}
