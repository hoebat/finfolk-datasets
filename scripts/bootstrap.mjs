import {execFileSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadMapReleases} from './map-releases.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
if(Number(process.versions.node.split('.')[0])<22)throw Error('Node 22 or later is required.');
const release=JSON.parse(readFileSync('data-release.json','utf8'));
const repository=new URL(release.repository);
if(repository.protocol!=='https:'||repository.hostname!=='github.com'||repository.username||repository.password||repository.search||repository.hash)throw Error('Expected a credential-free GitHub source URL.');
if(!/^[a-f0-9]{40}$/.test(release.commit)||!/^[a-f0-9]{64}$/.test(release.sha256)||!release.path.startsWith('design-board/assets/datasets/')||release.path.split('/').some(p=>p==='..'||p===''))throw Error('Invalid pinned catalogue release.');
const checkout=resolve('.cache/catalogue-source');
const remote=release.repository.replace(/\/$/,'').replace(/\.git$/,'')+'.git';
const run=(args,options={})=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,GIT_TERMINAL_PROMPT:'0'},...options});
run(['--version']);run(['lfs','version']);
mkdirSync(checkout,{recursive:true});
if(!existsSync(resolve(checkout,'.git'))){run(['init',checkout]);run(['-C',checkout,'remote','add','origin',remote]);}
if(run(['-C',checkout,'remote','get-url','origin']).trim()!==remote)throw Error('The catalogue cache has an unexpected origin; use a separate cache instead of overwriting it.');
run(['-C',checkout,'lfs','install','--local']);
let fetched=true;try{run(['-C',checkout,'cat-file','-e',release.commit+'^{commit}'],{stdio:'ignore'});}catch{fetched=false;}
if(!fetched){console.log('Fetching pinned catalogue metadata (no full working tree).');run(['-C',checkout,'fetch','--filter=blob:none','--depth=1','origin',release.commit]);}
const pointer=run(['-C',checkout,'show',release.commit+':'+release.path]);
if(!pointer.startsWith('version https://git-lfs.github.com/spec/v1\n')||!pointer.includes('oid sha256:'+release.sha256+'\n'))throw Error('Pinned catalogue is not the expected Git LFS object.');
const size=Number(pointer.match(/^size (\d+)$/m)?.[1]);
if(!Number.isSafeInteger(size)||size<=0||size>16*1024*1024)throw Error('Catalogue size is invalid or exceeds the bounded setup limit (16 MiB).');
console.log('Materializing one catalogue LFS object: '+size+' bytes.');
const raw=run(['-C',checkout,'lfs','smudge'],{input:pointer,encoding:null,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GIT_LFS_SKIP_SMUDGE:'0'}});
if(raw.length!==size||createHash('sha256').update(raw).digest('hex')!==release.sha256)throw Error('Downloaded catalogue does not match the pinned size/checksum.');
JSON.parse(raw.toString('utf8'));
const target=resolve(checkout,release.path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,raw);
loadMapReleases({prepare:true});
execFileSync(process.execPath,['scripts/build.mjs',checkout],{stdio:'inherit'});
execFileSync(process.execPath,['--test','tests/service.test.mjs'],{stdio:'inherit'});
console.log('Setup complete. Run npm run dev to preview at http://127.0.0.1:8786.');
