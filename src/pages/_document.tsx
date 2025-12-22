import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch for faster DNS resolution */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        
        {/* Preload critical resources - using InterVariable.woff2 */}
        <link
          rel="preload"
          href="/fonts/InterVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        
        {/* Optimize font loading */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @font-face {
                font-family: 'Inter';
                font-style: normal;
                font-weight: 100 900;
                font-display: swap;
                src: url('/fonts/InterVariable.woff2') format('woff2');
              }
            `,
          }}
        />
        
        {/* Meta tags for better SEO and performance */}
        <meta name="theme-color" content="#000000" />
        <meta name="color-scheme" content="light dark" />
        
        {/* Optimize viewport for mobile */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
