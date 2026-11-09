import {headers} from 'next/headers';
import Script from 'next/script';
import DatasetShell from './catalogue-shell';
export default async function CataloguePage(){const nonce=(await headers()).get('x-nonce')||undefined;return <><DatasetShell/><Script nonce={nonce} src="/catalogue.js" type="module" strategy="afterInteractive"/></>}
