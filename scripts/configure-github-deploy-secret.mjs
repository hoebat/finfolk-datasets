import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const repository='hoebat/finfolk-datasets',environment='production',site='2994a09f-11bc-40e1-8a3a-d3e3a91455ff';
const run=(args,input)=>spawnSync('gh',args,{input,encoding:'utf8',env:{...process.env,GH_DEBUG:''},stdio:['pipe','pipe','pipe']});
if(run(['auth','status','--hostname','github.com']).status!==0){console.error('Authenticate GitHub CLI first: gh auth login --hostname github.com');process.exit(1)}
const configPath=process.env.NETLIFY_CONFIG_PATH||join(homedir(),'Library/Preferences/netlify/config.json');
let token=process.env.NETLIFY_AUTH_TOKEN;
if(!token){const c=JSON.parse(readFileSync(configPath,'utf8'));token=(c.users[c.userId]||Object.values(c.users)[0])?.auth?.token}
if(!token)throw Error('Existing Netlify CLI credential not found');
const response=await fetch('https://api.netlify.com/api/v1/sites/'+site,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
if(!response.ok)throw Error('Stored Netlify credential could not access datasets site: HTTP '+response.status);
if((await response.json()).id!==site)throw Error('Unexpected Netlify site');
const path='repos/'+repository+'/environments/'+environment;
const existing=run(['api',path]);
if(existing.status!==0){if(!existing.stderr.includes('HTTP 404'))throw Error('Unable to inspect GitHub production environment');if(run(['api','--method','PUT',path,'--input','-'],'{}').status!==0)throw Error('Unable to create GitHub production environment')}
const result=run(['secret','set','NETLIFY_AUTH_TOKEN','--env',environment,'--repo',repository],token);
token=undefined;
if(result.status!==0)throw Error('GitHub secret write failed; check repository/environment permissions');
const list=run(['secret','list','--env',environment,'--repo',repository,'--json','name,updatedAt']);
if(list.status!==0)throw Error('Unable to verify GitHub secret metadata');
const secret=JSON.parse(list.stdout).find(item=>item.name==='NETLIFY_AUTH_TOKEN');
if(!secret)throw Error('Deployment secret not present after configuration');
console.log(JSON.stringify({repository,environment,secret:secret.name,updatedAt:secret.updatedAt,verified:true}));
