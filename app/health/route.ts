import {catalogue} from '../../lib/catalogue';
import {publicResponse} from '../../lib/public-api';
export const dynamic='force-dynamic';
export function GET(request:Request){return publicResponse(catalogue,'/health',request)}
export const HEAD=GET;
