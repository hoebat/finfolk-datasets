import {headers} from 'next/headers';
import Script from 'next/script';
export const metadata={title:'FinFolk · dataset collections',description:'Published marine datasets by Australian state and territory',icons:{icon:'/finfolk-icon.svg'}};
export default async function RootLayout({children}:{children:React.ReactNode}){const nonce=(await headers()).get('x-nonce')||undefined;return <html lang="en" data-theme="yellow" suppressHydrationWarning><head><meta name="theme-color" content="#edff35"/><link rel="stylesheet" href="/styles.css"/></head><body><Script nonce={nonce} src="/appearance.js" strategy="beforeInteractive"/>{children}</body></html>}
