import {catalogue} from '../../../lib/catalogue';
import {publicResponse} from '../../../lib/public-api';
import {adminRequest} from '../../../lib/admin-api';
export const dynamic='force-dynamic';
async function handle(request:Request){const path=new URL(request.url).pathname;return path.startsWith('/v1/admin/')?adminRequest(request):publicResponse(catalogue,path,request);}
export {handle as GET,handle as HEAD,handle as POST,handle as PATCH,handle as PUT,handle as DELETE,handle as OPTIONS};
