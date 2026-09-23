import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { View } from 'react-native';

/**
 * Not a Modal. On web a Modal is a fixed full-screen layer, so while a toast was up
 * it swallowed every tap on the page — the button that just saved something went
 * dead for six seconds. This strip is only as tall as the toast, and box-none lets
 * taps through everywhere the toast isn't.
 *
 * Portalled to <body> with a z-index so it still floats above open sheets, which
 * react-native-web also portals there.
 *
 * An open sheet traps focus: a press that moves focus outside it gets focus yanked
 * back and the press cancelled — so Undo after deleting from a sheet did nothing.
 * Stopping the mousedown default keeps focus where it is; the press still lands.
 */
export function ToastLayer({ children }: { children: ReactNode }) {
  return createPortal(
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, pointerEvents: 'none' }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <View pointerEvents="box-none">{children}</View>
    </div>,
    document.body
  );
}
