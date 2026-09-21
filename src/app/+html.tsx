import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { colors } from '@/lib/colors';

/**
 * The HTML shell for the web build — the shipping target (CLAUDE.md §13). Without
 * the apple-mobile-web-app tags, "Add to Home Screen" gives a Safari chrome and a
 * blank icon instead of something that looks like an app.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/* viewport-fit=cover so the blush ground runs under the notch and home indicator. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* The page title is set with <Head> in _layout.tsx — react-helmet renders its
            own <title> here first, and the first one in the document wins. */}
        <meta name="description" content="An honest record of where your hours and money actually went." />
        <meta name="theme-color" content={colors.ground} />
        {/* Without the manifest and its display:standalone, iOS treats the home-screen
            entry as a plain bookmark and opens it in the default browser — Chrome, if
            that's what's set. The apple- meta tags alone are no longer enough. */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Betterment" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `body { background-color: ${colors.ground}; }` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
