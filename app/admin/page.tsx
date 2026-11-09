import {configured,administrator} from '../../lib/auth';
import {gitConfigured} from '../../lib/github';
import {redirect} from 'next/navigation';
import Editor from './editor';
export const dynamic='force-dynamic';
export default async function Admin(){if(!configured()||!gitConfigured())return <main><h1>Dataset administration</h1><p>Administration is awaiting its authentication and GitHub App configuration.</p><a href="/">Back to catalogue</a></main>;try{await administrator()}catch(e:any){if(e.status===401)redirect('/auth/sign-in');return <main><h1>Administrator access required</h1><a href="/">Back to catalogue</a></main>}return <Editor/>}
