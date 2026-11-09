import {getAuth,configured} from '../../../../lib/auth';
async function handle(request:Request,context:{params:Promise<{path:string[]}>}){if(!configured())return Response.json({error:'Authentication unavailable'},{status:503});const handlers=getAuth().handler();const handler=handlers[request.method as keyof typeof handlers];return handler?handler(request,context):new Response(null,{status:405})}
export {handle as GET,handle as POST,handle as PATCH,handle as PUT,handle as DELETE};
