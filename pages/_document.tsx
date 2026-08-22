import { Head, Html, Main, NextScript } from 'next/document';

const enableReactDevTools =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DISABLE_REACT_DEVTOOLS !== '1';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {enableReactDevTools && (
          <>
            <script
              src="https://unpkg.com/react-grab/dist/index.global.js"
            />
            <script
              src="https://unpkg.com/react-scan/dist/auto.global.js"
            />
          </>
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
