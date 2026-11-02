import type { MadoDesktopBridge } from './desktop-bridge.type';

/** The one place that asks "are we in the desktop app?". It is `undefined` on the web. */
export function getDesktopBridge(): MadoDesktopBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.madoDesktop;
}
