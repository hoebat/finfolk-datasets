import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL(process.argv[2]),expected=process.argv[3];
if(base.protocol!=='https:'&&base.hostname!=='127.0.0.1')throw Error('Expected HTTPS deployment URL');
const release=JSON.parse(readFileSync('data-release.json','utf8'));
async function request(path,method='GET'){return fetch(new URL(path,base),{method,signal:AbortSignal.timeout(20000),redirect:'follow'})}
const root=await request('/');assert.equal(root.status,200);const html=await root.text();assert(html.includes('Dataset navigation'));assert(html.includes('id="theme"'));assert(!html.includes('aria-label="Main navigation"'));
const catalogueResponse=await request('/v1/catalogue');assert.equal(catalogueResponse.status,200);assert.equal(catalogueResponse.headers.get('access-control-allow-origin'),'*');const catalogue=await catalogueResponse.json();assert.equal(catalogue.datasets.length,JSON.parse(readFileSync('data/catalogue.json','utf8')).datasets.filter(r=>r.publication==='published'&&!r.archived).length);assert(catalogue.datasets.every(r=>r.publication==='published'&&!('reviewNotes' in r)));assert.equal(catalogue.release.sha256,release.sha256);if(expected)assert.equal(catalogue.release.commit,expected);
const manifest=await(await request('/v1/manifest')).json();assert.equal(manifest.sha256,release.sha256);if(expected)assert.equal(manifest.commit,expected);
assert.equal((await request('/v1/catalogue','HEAD')).status,200);assert.equal((await request('/v1/catalogue','POST')).status,405);assert.equal((await request('/v1/catalogue','OPTIONS')).status,204);
const privateResponse=await request('/v1/admin/catalogue');assert([401,403,503].includes(privateResponse.status));
for(const path of ['/styles.css','/appearance.js','/catalogue.js','/finfolk-icon.svg'])assert.equal((await request(path)).status,200,path);
const appearance=await(await request('/appearance.js')).text();for(const name of ['Acid Club','Blue Hour','Salt Paper','Night Swim'])assert(appearance.includes(name));
console.log(JSON.stringify({verified:base.origin,commit:manifest.commit,checksum:manifest.sha256,publishedDatasets:catalogue.datasets.length}));
