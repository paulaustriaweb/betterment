/** Native builds use expo-splash-screen and app storage; see webShell.web.ts. */
export function hideLaunchScreen(): void {}

export function setLaunchStatus(_text: string): void {}

export function requestPersistentStorage(): void {}

/** Native reopens in place; nothing to reload. */
export function retryWithFreshPage(): boolean {
  return false;
}

export function markStarted(): void {}

export function restartApp(): boolean {
  return false;
}
