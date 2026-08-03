const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { EventEmitter } = require('node:events');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const test = require('node:test');

const {
  runCli,
  runShard,
  validateShardResult
} = require('./run-validator-tests');
const {
  EXPECTED_VALIDATOR_TEST_COUNT,
  expectedTestsForShard
} = require('./validator-test-shard');

function createFakeChild(onKill) {
  const child = new EventEmitter();
  child.stderr = new PassThrough();
  child.stdout = new PassThrough();
  child.kill = onKill;
  return child;
}

function createManualTimers() {
  let nextHandle = 1;
  const callbacks = new Map();
  return {
    pendingCount: () => callbacks.size,
    runNext() {
      const entry = callbacks.entries().next().value;
      assert.ok(entry, 'expected a pending timer');
      const [handle, callback] = entry;
      callbacks.delete(handle);
      callback();
    },
    timers: {
      clearTimeout(handle) {
        callbacks.delete(handle);
      },
      setTimeout(callback) {
        const handle = nextHandle;
        nextHandle += 1;
        callbacks.set(handle, callback);
        return handle;
      }
    }
  };
}

function createShardInventoryMarker(shard = '1/4') {
  const shardIndex = Number(shard.split('/')[0]);
  const expectedTests = expectedTestsForShard(shardIndex);
  return `Validator test shard ${shard}: ${expectedTests}/` +
    `${EXPECTED_VALIDATOR_TEST_COUNT} tests`;
}

function createShardOutput(overrides = {}, shard = '1/4') {
  const shardIndex = Number(shard.split('/')[0]);
  const expectedTests = expectedTestsForShard(shardIndex);
  const summary = {
    cancelled: 0,
    fail: 0,
    pass: expectedTests,
    skipped: 0,
    tests: expectedTests,
    todo: 0,
    ...overrides
  };
  return [
    createShardInventoryMarker(shard),
    `# tests ${summary.tests}`,
    `# pass ${summary.pass}`,
    `# fail ${summary.fail}`,
    `# cancelled ${summary.cancelled}`,
    `# skipped ${summary.skipped}`,
    `# todo ${summary.todo}`
  ].join('\n');
}

function runSupportScenario(source) {
  const supportPath = path.join(
    __dirname,
    'validate-site-tests',
    'support.js'
  );
  return spawnSync(
    process.execPath,
    ['-e', `const { test } = require(${JSON.stringify(supportPath)});${source}`],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        VALIDATOR_TEST_SHARD: ''
      }
    }
  );
}

test('runShard terminates and reports a timed-out shard', async () => {
  const clock = createManualTimers();
  const killSignals = [];
  let child;
  child = createFakeChild((signal) => {
    killSignals.push(signal);
    queueMicrotask(() => child.emit('close', null, signal));
    return true;
  });

  const resultPromise = runShard(1, {
    spawnImpl: () => child,
    timeoutMs: 5,
    timers: clock.timers
  });
  clock.runNext();
  const result = await resultPromise;

  assert.equal(result.timedOut, true);
  assert.deepEqual(killSignals, ['SIGTERM']);
  assert.equal(clock.pendingCount(), 0);
  assert.ok(
    validateShardResult(result).includes('Shard 1/4 timed out after 5ms')
  );
});

test('runShard force-kills a shard that ignores graceful termination', async () => {
  const clock = createManualTimers();
  const killSignals = [];
  let child;
  child = createFakeChild((signal) => {
    killSignals.push(signal);
    if (signal === 'SIGKILL') {
      queueMicrotask(() => child.emit('close', null, signal));
    }
    return true;
  });

  const resultPromise = runShard(2, {
    killGraceMs: 5,
    spawnImpl: () => child,
    timeoutMs: 5,
    timers: clock.timers
  });
  clock.runNext();
  clock.runNext();
  const result = await resultPromise;

  assert.equal(result.timedOut, true);
  assert.deepEqual(killSignals, ['SIGTERM', 'SIGKILL']);
  assert.equal(clock.pendingCount(), 0);
});

test('runShard settles if a force-killed shard never closes', async () => {
  const clock = createManualTimers();
  const killSignals = [];
  let unrefCalls = 0;
  const child = createFakeChild((signal) => {
    killSignals.push(signal);
    return false;
  });
  child.unref = () => {
    unrefCalls += 1;
  };

  const resultPromise = runShard(3, {
    forceKillSettleMs: 5,
    killGraceMs: 5,
    spawnImpl: () => child,
    timeoutMs: 5,
    timers: clock.timers
  });
  clock.runNext();
  clock.runNext();
  clock.runNext();
  const result = await resultPromise;

  assert.equal(result.forceKillTimedOut, true);
  assert.deepEqual(killSignals, ['SIGTERM', 'SIGKILL']);
  assert.equal(unrefCalls, 1);
  assert.equal(child.stdout.destroyed, true);
  assert.equal(child.stderr.destroyed, true);
  assert.equal(clock.pendingCount(), 0);
});

for (const field of ['fail', 'cancelled', 'skipped', 'todo']) {
  test(`validateShardResult rejects a shard with ${field} tests`, () => {
    const reasons = validateShardResult({
      code: 0,
      index: 1,
      shard: '1/4',
      stderr: '',
      stdout: createShardOutput({ [field]: 1, pass: 69 })
    });

    assert.ok(reasons.includes(`Shard 1/4 reported 1 ${field} test(s)`));
  });
}

test('validateShardResult accepts one exact TAP summary', () => {
  const reasons = validateShardResult({
    code: 0,
    index: 1,
    shard: '1/4',
    stderr: '',
    stdout: createShardOutput()
  });

  assert.deepEqual(reasons, []);
});

test('validateShardResult rejects an incomplete TAP summary', () => {
  const expectedTests = expectedTestsForShard(1);
  const reasons = validateShardResult({
    code: 0,
    index: 1,
    shard: '1/4',
    stderr: '',
    stdout: [
      createShardInventoryMarker(),
      `# tests ${expectedTests}`
    ].join('\n')
  });

  assert.ok(
    reasons.includes('Shard 1/4 did not report a complete TAP summary')
  );
});

test('validateShardResult requires the shard inventory marker', () => {
  const reasons = validateShardResult({
    code: 0,
    index: 1,
    shard: '1/4',
    stderr: '',
    stdout: createShardOutput().replace(
      createShardInventoryMarker(),
      'Validator tests started'
    )
  });

  assert.ok(
    reasons.includes('Shard 1/4 did not report its expected inventory')
  );
});

test('validateShardResult requires the inventory marker on its own line', () => {
  const marker = createShardInventoryMarker();
  const reasons = validateShardResult({
    code: 0,
    index: 1,
    shard: '1/4',
    stderr: '',
    stdout: createShardOutput().replace(marker, `prefix ${marker} suffix`)
  });

  assert.ok(
    reasons.includes('Shard 1/4 did not report its expected inventory')
  );
});

test('validateShardResult rejects duplicate TAP summary fields', () => {
  const expectedTests = expectedTestsForShard(1);
  const reasons = validateShardResult({
    code: 0,
    index: 1,
    shard: '1/4',
    stderr: '',
    stdout: `${createShardOutput()}\n# tests ${expectedTests}`
  });

  assert.ok(
    reasons.includes('Shard 1/4 did not report a complete TAP summary')
  );
});

test('runShard reports a synchronous spawn failure as a result', async () => {
  const error = new Error('simulated spawn failure');
  const result = await runShard(1, {
    spawnImpl() {
      throw error;
    }
  });

  assert.equal(result.code, 1);
  assert.equal(result.error, error);
});

for (const [parentSignal, expectedStatus] of [
  ['SIGINT', 130],
  ['SIGTERM', 143]
]) {
  test(
    `runCli forwards ${parentSignal} to live shards and returns ` +
      expectedStatus,
    async () => {
      const children = [];
      const signalSource = new EventEmitter();
      const spawnImpl = (_nodePath, _args, options) => {
        const killSignals = [];
        let closeTimer;
        let child;
        child = createFakeChild((signal) => {
          killSignals.push(signal);
          clearTimeout(closeTimer);
          queueMicrotask(() => child.emit('close', null, signal));
          return true;
        });
        const shard = options.env.VALIDATOR_TEST_SHARD;
        child.stdout.write(createShardOutput({}, shard));
        closeTimer = setTimeout(() => child.emit('close', 0, null), 30);
        children.push({ child, killSignals });
        return child;
      };

      const statusPromise = runCli(
        { error() {}, log() {} },
        {
          signalSource,
          spawnImpl,
          timeoutMs: 1_000,
          validatorTestShard: ''
        }
      );
      await new Promise((resolve) => setImmediate(resolve));
      signalSource.emit(parentSignal);

      const status = await statusPromise;

      assert.equal(status, expectedStatus);
      assert.equal(children.length, 4);
      for (const { killSignals } of children) {
        assert.deepEqual(killSignals, [parentSignal]);
      }
      assert.equal(signalSource.listenerCount('SIGINT'), 0);
      assert.equal(signalSource.listenerCount('SIGTERM'), 0);
    }
  );
}

test('runCli escalates one ignored SIGINT without a second interrupt', async () => {
  const clock = createManualTimers();
  const killSignals = [];
  const signalSource = new EventEmitter();
  let ignoredChild;
  ignoredChild = createFakeChild((signal) => {
    killSignals.push(signal);
    return false;
  });
  ignoredChild.unref = () => {};
  const statusPromise = runCli(
    { error() {}, log() {} },
    {
      forceKillSettleMs: 5,
      killGraceMs: 5,
      signalSource,
      spawnImpl: () => ignoredChild,
      timeoutMs: 1_000,
      timers: clock.timers,
      validatorTestShard: '1/4'
    }
  );
  await new Promise((resolve) => setImmediate(resolve));
  signalSource.emit('SIGINT');
  clock.runNext();
  clock.runNext();
  if (clock.pendingCount() > 0) clock.runNext();

  const status = await statusPromise;

  assert.equal(status, 130);
  assert.deepEqual(killSignals, ['SIGINT', 'SIGKILL']);
});

test('runCli validates one requested CI shard through the same runner', async () => {
  const logLines = [];
  const spawnedShards = [];
  const spawnImpl = (_nodePath, _args, options) => {
    let child;
    child = createFakeChild(() => true);
    const shard = options.env.VALIDATOR_TEST_SHARD;
    spawnedShards.push(shard);
    child.stdout.write(createShardOutput({}, shard));
    setImmediate(() => child.emit('close', 0, null));
    return child;
  };

  const status = await runCli(
    { error() {}, log: (line) => logLines.push(line) },
    {
      spawnImpl,
      timeoutMs: 1_000,
      validatorTestShard: '3/4'
    }
  );

  assert.equal(status, 0);
  assert.deepEqual(spawnedShards, ['3/4']);
  assert.ok(logLines.includes('Validator test shard 3/4 passed: 80 tests.'));
});

test('runCli keeps successful four-shard output compact', async () => {
  const logLines = [];
  const spawnImpl = (_nodePath, _args, options) => {
    let child;
    child = createFakeChild(() => true);
    const shard = options.env.VALIDATOR_TEST_SHARD;
    child.stdout.write(createShardOutput({}, shard));
    setImmediate(() => child.emit('close', 0, null));
    return child;
  };

  const status = await runCli(
    { error() {}, log: (line) => logLines.push(line) },
    {
      spawnImpl,
      timeoutMs: 1_000,
      validatorTestShard: ''
    }
  );

  assert.equal(status, 0);
  assert.deepEqual(logLines, [
    'Validator test shard 1/4 passed: 80 tests.',
    'Validator test shard 2/4 passed: 80 tests.',
    'Validator test shard 3/4 passed: 80 tests.',
    'Validator test shard 4/4 passed: 80 tests.',
    'Validator test shards passed: 320 tests across 4 shards.'
  ]);
});

for (const [directive, value] of [
  ['skip', true],
  ['todo', 'later'],
  ['only', false]
]) {
  test(`validator tests reject the ${directive} registration directive`, () => {
    const result = runSupportScenario(
      `test("directive", { ${directive}: ${JSON.stringify(value)} }, () => {});`
    );

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      new RegExp(`validator test "directive" must not declare ${directive}`)
    );
  });
}

test('validator test names must be unique across the inventory', () => {
  const result = runSupportScenario(
    'test("duplicate", () => {});test("duplicate", () => {});'
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate validator test name: "duplicate"/);
});
