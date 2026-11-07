import http from 'node:http';
import worker from '../dist/server/index.js';
const server=http.createServer(async(req,res)=>{try{const response=await worker.fetch(new Request('http://127.0.0.1:8786'+req.url,{method:req.method}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){res.writeHead(500);res.end('Preview error');}});server.listen(8786,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:8786'));
