import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SnapshotSync } from './connection.js';

test('older cross-window snapshots cannot overwrite a newer revision', () => {
  const received = [];
  const sync = new SnapshotSync(snapshot => received.push(snapshot.revision), assert.fail);
  sync.receive({ revision: 2 });
  sync.receive({ revision: 1 });
  sync.receive({ revision: 3 });
  assert.deepEqual(received, [2, 3]);
});

test('rapid writes keep click order and render only the final response', async () => {
  const received = [];
  const order = [];
  const sync = new SnapshotSync(snapshot => received.push(snapshot.revision), assert.fail);
  let finishFirst;
  const first = sync.enqueue(() => {
    order.push('first');
    return new Promise(resolve => { finishFirst = resolve; });
  });
  const second = sync.enqueue(async () => {
    order.push('second');
    return { revision: 2 };
  });

  await Promise.resolve();
  assert.deepEqual(order, ['first']);
  sync.receive({ revision: 1 });
  assert.deepEqual(received, []);
  finishFirst({ revision: 1 });
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first', 'second']);
  assert.deepEqual(received, [2]);
  assert.equal(sync.pending, 0);
});

test('a rejected write reports an error without blocking later updates', async () => {
  const received = [];
  const errors = [];
  const sync = new SnapshotSync(snapshot => received.push(snapshot.revision), error => errors.push(error.message));
  const failed = sync.enqueue(async () => { throw new Error('write failed'); });
  const succeeded = sync.enqueue(async () => ({ revision: 2 }));
  await Promise.all([failed, succeeded]);
  assert.deepEqual(errors, ['write failed']);
  assert.deepEqual(received, [2]);
  assert.equal(sync.pending, 0);
  sync.receive({ revision: 3 });
  assert.deepEqual(received, [2, 3]);
});

test('a newer remote snapshot arriving during a write wins over its older response', async () => {
  const received = [];
  const sync = new SnapshotSync(snapshot => received.push(snapshot.revision), assert.fail);
  let finish;
  const writing = sync.enqueue(() => new Promise(resolve => { finish = resolve; }));
  await Promise.resolve();
  sync.receive({ revision: 3 });
  sync.receive({ revision: 2 });
  finish({ revision: 1 });
  await writing;
  assert.deepEqual(received, [3]);
});

test('a rejected last write still applies a remote update received while waiting', async () => {
  const received = [];
  const errors = [];
  const sync = new SnapshotSync(snapshot => received.push(snapshot.revision), error => errors.push(error.message));
  let reject;
  const writing = sync.enqueue(() => new Promise((resolve, fail) => { reject = fail; }));
  await Promise.resolve();
  sync.receive({ revision: 4 });
  reject(new Error('write failed'));
  await writing;
  assert.deepEqual(received, [4]);
  assert.deepEqual(errors, ['write failed']);
});

test('failed optimistic edits recover the authoritative snapshot before showing the error', async () => {
  const events = [];
  const sync = new SnapshotSync(
    snapshot => events.push(snapshot.values.cross1),
    error => events.push(error.message),
    async () => ({ revision: 0, values: { cross1: null } }),
  );
  await sync.enqueue(async () => { throw new Error('not saved'); });
  assert.deepEqual(events, [null, 'not saved']);
});

test('a failed recovery preserves the original error and does not block the next write', async () => {
  const errors = [];
  const received = [];
  const sync = new SnapshotSync(
    snapshot => received.push(snapshot.revision),
    error => errors.push(error.message),
    async () => { throw new Error('read failed'); },
  );
  await sync.enqueue(async () => { throw new Error('write failed'); });
  await sync.enqueue(async () => ({ revision: 1 }));
  assert.deepEqual(errors, ['write failed']);
  assert.deepEqual(received, [1]);
  assert.equal(sync.pending, 0);
});
