import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const root='.netlify/';
const manifest=JSON.parse(await readFile(root+'functions/manifest.json','utf8'));
assert(manifest.functions.some(fn=>fn.name==='___netlify-server-handler'),'SSR handler missing');
assert((await stat(root+'functions/___netlify-server-handler.zip')).size>0);
for(const path of ['appearance.js','catalogue.js','styles.css','finfolk-icon.svg'])assert((await stat(root+'static/'+path)).size>0,path);
const routing=await readFile(root+'netlify.toml','utf8');assert(!routing.includes('to = "/index.html"'),'SPA fallback must not replace SSR/API routes');
console.log('Netlify output verified: SSR bundle, static assets and routing.');
