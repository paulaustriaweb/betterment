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
  position: fixed; inset: 0; z-index: 2000; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: ${colors.ground};
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 420ms cubic-bezier(.4,0,1,1);
}
#launch.gone { opacity: 0; pointer-events: none; }
#launch.gone .mark { transform: scale(1.12); transition: transform 420ms cubic-bezier(.4,0,1,1); }

/* The sequence plays once, about two seconds: the mark pops in, its day bar fills one
   stretch at a time (the app's idea in miniature), the name rises. If loading takes
   longer, a shimmer runs over the full bar until it's done. */
#launch .mark {
  width: 84px; height: 84px; border-radius: 26px; background: ${colors.rose};
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 14px 30px rgba(196,60,110,.30);
  animation: launch-pop 560ms cubic-bezier(.2,.8,.2,1) both, launch-breathe 2.6s ease-in-out 1.7s infinite;
}
#launch .day {
  position: relative; width: 52px; height: 13px; border-radius: 7px; background: rgba(255,255,255,.26);
  display: flex; gap: 2px; overflow: hidden;
}
#launch .day i { display: block; height: 100%; transform: scaleX(0); transform-origin: left;
  animation: launch-fill 320ms cubic-bezier(.2,.8,.2,1) forwards; }
#launch .day i:nth-child(1) { flex: 3; background: #5E6BA8; animation-delay: .45s; }
#launch .day i:nth-child(2) { flex: 3; background: #5271C4; animation-delay: .72s; }
#launch .day i:nth-child(3) { flex: 2; background: #4E9B77; animation-delay: .99s; }
#launch .day i:nth-child(4) { flex: 2; background: #CE9440; animation-delay: 1.26s; }
#launch .day::after {
  content: ''; position: absolute; top: 0; bottom: 0; width: 40%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent);
  transform: translateX(-120%); animation: launch-shimmer 1.4s ease-in-out 1.7s infinite;
}
#launch .name { margin-top: 20px; font-size: 23px; font-weight: 700; letter-spacing: -0.6px; color: ${colors.ink};
  animation: launch-rise 560ms cubic-bezier(.2,.8,.2,1) .35s both; }
#launch .tag { margin-top: 4px; font-size: 13px; color: ${colors.inkSoft};
  animation: launch-rise 560ms cubic-bezier(.2,.8,.2,1) .5s both; }
#launch .status { position: absolute; bottom: calc(56px + env(safe-area-inset-bottom)); font-size: 12px;
  color: ${colors.inkFaint}; letter-spacing: .2px; transition: opacity 140ms linear;
  animation: launch-fade 400ms linear .8s both; }
@keyframes launch-pop { from { transform: scale(.5) rotate(-8deg); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes launch-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.035); } }
@keyframes launch-fill { to { transform: scaleX(1); } }
@keyframes launch-shimmer { to { transform: translateX(300%); } }
@keyframes launch-rise { from { transform: translateY(10px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes launch-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  #launch .mark, #launch .name, #launch .tag, #launch .status, #launch .day i { animation: none; transform: none; opacity: 1; }
  #launch .day::after { display: none; }
  #launch, #launch.gone .mark { transition: opacity 120ms linear; transform: none; }
}
` }} />
      </head>
      <body>
        {/* Shown the instant the page opens, before any JavaScript — the bundle is
            1.7 MB and a phone takes a moment. The app narrates its real loading steps
            into #launch-status and removes the screen once it's ready. Tap to skip. */}
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
          <div className="status" id="launch-status">
            Starting up…
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
