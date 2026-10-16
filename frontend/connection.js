// Wails integration and browser-preview transport live behind this boundary.
export function isDesktopEnvironment() {
  return Boolean(
    location.hostname.startsWith('wails.localhost') ||
    location.protocol === 'wails:' || window._wails
  );
}

export function reportDiagnostic(message) {
  if (location.hostname.startsWith('wails.localhost')) {
    fetch('/__diagnostic?stage=' + encodeURIComponent(message)).catch(() => {});
  }
}

export function loadRuntime() {
  const runtimeURL = '/wails/runtime.js';
  return import(/* @vite-ignore */ runtimeURL);
}

// Serialize writes and reject stale snapshots before they reach the view.
export class SnapshotSync {
  constructor(onSnapshot, onError, readSnapshot = null) {
    this.onSnapshot = onSnapshot;
    this.onError = onError;
    this.readSnapshot = readSnapshot;
    this.revision = 0;
    this.pending = 0;
    this.queue = Promise.resolve();
    this.latestSnapshot = null;
  }

  receive(snapshot) {
    if (snapshot.revision < this.revision) return;
    if (!this.latestSnapshot || snapshot.revision >= this.latestSnapshot.revision) {
      this.latestSnapshot = snapshot;
    }
    this.flush();
  }

  flush() {
    if (this.pending > 0 || !this.latestSnapshot) return;
    const snapshot = this.latestSnapshot;
    this.latestSnapshot = null;
    this.revision = snapshot.revision;
    this.onSnapshot(snapshot);
  }

  enqueue(operation) {
    this.pending++;
    this.queue = this.queue.then(async () => {
      let snapshot;
      let failure;
      try {
        snapshot = await operation();
      } catch (error) {
        failure = error;
        if (this.readSnapshot) {
          try {
            this.receive(await this.readSnapshot());
          } catch {
            // A failed recovery must not hide the original write error.
          }
        }
      } finally {
        this.pending--;
      }
      if (snapshot) this.receive(snapshot);
      else this.flush();
      if (failure) this.onError(failure);
    });
    return this.queue;
  }
}

export function createOverlayConnection({
  view, getPreviewSnapshot, onSnapshot, onLock, onVisibility, onAdvance, onError,
}) {
  const desktop = isDesktopEnvironment();
  const sync = new SnapshotSync(onSnapshot, onError, () => call('GetSnapshot'));
  const channel = desktop ? null : new BroadcastChannel('p4-overlay-preview');
  let runtime = null;
  let connected = false;
  const subscriptions = [];

  function call(method, ...args) {
    return runtime.Call.ByName('main.OverlayService.' + method, ...args);
  }

  async function connect() {
    if (!desktop) {
      channel.onmessage = event => {
        if (event.data.type === 'request' && view === 'editor') {
          channel.postMessage({ type: 'snapshot', ...getPreviewSnapshot() });
        } else if (event.data.type === 'snapshot') {
          // Preview tabs have no Go revision counter.
          onSnapshot({ values: event.data.values, step: event.data.step });
        }
      };
      channel.postMessage({ type: 'request' });
      return null;
    }

    runtime = await loadRuntime();
    reportDiagnostic('runtime loaded');
    subscriptions.push(
      runtime.Events.On('overlay:lock', event => onLock(event.data)),
      runtime.Events.On('overlay:visibility', event => onVisibility(event.data)),
      runtime.Events.On('overlay:state', event => sync.receive(event.data)),
      runtime.Events.On('overlay:advance', event => onAdvance(event.data)),
    );
    sync.receive(await call('GetSnapshot'));
    const status = await call('Status');
    connected = true;
    return status;
  }

  const connection = {
    desktop,
    get ready() { return connected; },
    get window() { return runtime?.Window; },
    call,
    connect,
    dispose() {
      channel?.close();
      for (const unsubscribe of subscriptions.splice(0)) {
        if (typeof unsubscribe === 'function') unsubscribe();
      }
    },
    publish(method, args, previewSnapshot) {
      if (!desktop) {
        channel.postMessage({ type: 'snapshot', ...previewSnapshot });
        return;
      }
      return sync.enqueue(() => call(method, ...args));
    },
  };
  return connection;
}
