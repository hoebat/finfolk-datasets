import 'server-only';
import {createNeonAuth} from '@neondatabase/auth/next/server';
export function configured(){return !!(process.env.NEON_AUTH_BASE_URL&&process.env.NEON_AUTH_COOKIE_SECRET)}
export function getAuth(){if(!configured())throw Error('Authentication is not configured');return createNeonAuth({baseUrl:process.env.NEON_AUTH_BASE_URL!,cookies:{secret:process.env.NEON_AUTH_COOKIE_SECRET!}})}
export async function administrator(){const {data,error}=await getAuth().getSession();if(error||!data?.user)throw Object.assign(Error('Sign in required'),{status:401});if(!(process.env.DATASET_ADMIN_IDS||'').split(',').map(s=>s.trim()).includes(data.user.id))throw Object.assign(Error('Administrator access required'),{status:403});return data.user.id}
