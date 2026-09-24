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
        <style dangerouslySetInnerHTML={{ __html: `body { background-color: ${colors.ground}; }
#launch {
  position: fixed; inset: 0; z-index: 2000;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
  background: ${colors.ground};
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  transition: opacity 240ms cubic-bezier(.4,0,1,1);
}
#launch.gone { opacity: 0; pointer-events: none; }
#launch .mark {
  width: 64px; height: 64px; border-radius: 20px; background: ${colors.rose};
  display: flex; align-items: center; justify-content: center;
}
#launch .mark span { width: 30px; height: 8px; border-radius: 4px; background: #fff; display: block; }
#launch .name { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; color: ${colors.ink}; }
#launch .track { width: 120px; height: 4px; border-radius: 2px; background: ${colors.gap}; overflow: hidden; }
#launch .track span {
  display: block; width: 40%; height: 100%; border-radius: 2px; background: ${colors.rose};
  animation: launch-slide 1.1s cubic-bezier(.2,.8,.2,1) infinite;
}
@keyframes launch-slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
@media (prefers-reduced-motion: reduce) {
  #launch .track span { animation: none; width: 100%; opacity: .5; }
  #launch { transition: opacity 120ms linear; }
}
` }} />
      </head>
      <body>
        {/* Shown the instant the page opens, before any JavaScript — the bundle is
            1.7 MB and a phone takes a moment. Removed by the app once it's ready. */}
        <div id="launch" aria-hidden="true">
          <div className="mark">
            <span />
          </div>
          <div className="name">Betterment</div>
          <div className="track">
            <span />
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
