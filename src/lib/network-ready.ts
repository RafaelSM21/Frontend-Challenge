let ready: Promise<void> = Promise.resolve();

export function holdNetworkUntil(pending: Promise<unknown>) {
  ready = pending.then(
    () => undefined,
    () => undefined,
  );
}

export function whenNetworkReady(): Promise<void> {
  return ready;
}
