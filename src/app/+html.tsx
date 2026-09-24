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
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
  background: ${colors.ground};
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  transition: opacity 320ms cubic-bezier(.4,0,1,1), transform 320ms cubic-bezier(.4,0,1,1);
}
#launch.gone { opacity: 0; transform: scale(1.04); pointer-events: none; }
#launch .mark {
  width: 76px; height: 76px; border-radius: 24px; background: ${colors.rose};
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 24px rgba(196,60,110,.28);
  animation: launch-pop 520ms cubic-bezier(.2,.8,.2,1) both, launch-breathe 2.4s ease-in-out 520ms infinite;
}
/* A day bar inside the mark, filled one stretch at a time — the app's idea in miniature. */
#launch .day {
  width: 46px; height: 12px; border-radius: 6px; background: rgba(255,255,255,.28);
  display: flex; gap: 2px; overflow: hidden;
}
#launch .day i { display: block; height: 100%; transform: scaleX(0); transform-origin: left;
  animation: launch-fill 2.4s cubic-bezier(.2,.8,.2,1) infinite; }
#launch .day i:nth-child(1) { flex: 3; background: #5E6BA8; animation-delay: 0s; }
#launch .day i:nth-child(2) { flex: 3; background: #5271C4; animation-delay: .25s; }
#launch .day i:nth-child(3) { flex: 2; background: #4E9B77; animation-delay: .5s; }
#launch .day i:nth-child(4) { flex: 2; background: #fff; animation-delay: .75s; }
#launch .name { font-size: 21px; font-weight: 700; letter-spacing: -0.5px; color: ${colors.ink};
  animation: launch-rise 520ms cubic-bezier(.2,.8,.2,1) 120ms both; }
#launch .tag { font-size: 12.5px; color: ${colors.inkSoft}; margin-top: -8px;
  animation: launch-rise 520ms cubic-bezier(.2,.8,.2,1) 220ms both; }
@keyframes launch-pop { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes launch-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.04); } }
@keyframes launch-rise { from { transform: translateY(8px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes launch-fill { 0% { transform: scaleX(0); } 30%, 80% { transform: scaleX(1); } 100% { transform: scaleX(0); } }
@media (prefers-reduced-motion: reduce) {
  #launch .mark, #launch .name, #launch .tag, #launch .day i { animation: none; transform: none; opacity: 1; }
  #launch { transition: opacity 120ms linear; }
  #launch.gone { transform: none; }
}
` }} />
      </head>
      <body>
        {/* Shown the instant the page opens, before any JavaScript — the bundle is
            1.7 MB and a phone takes a moment. Removed by the app once it's ready. */}
        <div id="launch" aria-hidden="true">
          <div className="mark">
            <div className="day">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="name">Betterment</div>
          <div className="tag">Where the day actually went</div>
        </div>
        {children}
      </body>
    </html>
  );
}
