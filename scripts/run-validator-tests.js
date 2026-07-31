const { spawn } = require('node:child_process');
const path = require('node:path');
const {
  EXPECTED_VALIDATOR_TEST_COUNT,
  VALIDATOR_TEST_SHARD_COUNT,
  expectedTestsForShard,
  parseValidatorTestShard
} = require('./validator-test-shard');

const DEFAULT_SHARD_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_SHARD_KILL_GRACE_MS = 5 * 1000;
const DEFAULT_FORCE_KILL_SETTLE_MS = 1 * 1000;

function runShard(index, options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..');
  const nodePath = options.nodePath || process.execPath;
  const spawnImpl = options.spawnImpl || spawn;
  const testFile = path.join(__dirname, 'validate-site.test.js');
  const shard = `${index}/${VALIDATOR_TEST_SHARD_COUNT}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SHARD_TIMEOUT_MS;
  const killGraceMs = options.killGraceMs ?? DEFAULT_SHARD_KILL_GRACE_MS;
  const forceKillSettleMs =
    options.forceKillSettleMs ?? DEFAULT_FORCE_KILL_SETTLE_MS;
  const timers = options.timers || {
    clearTimeout,
    setTimeout
  };

  return new Promise((resolve) => {
    let child;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    let terminationStarted = false;
    let forceKillSent = false;
    let forceKillSettleTimeout;
    let forceKillTimeout;
    let timeout;

    function detachChild() {
      if (child.stdout && child.stdout.destroy) child.stdout.destroy();
      if (child.stderr && child.stderr.destroy) child.stderr.destroy();
      if (child.unref) child.unref();
    }

    function finish(result) {
      if (settled) return;
      settled = true;
      timers.clearTimeout(timeout);
      timers.clearTimeout(forceKillTimeout);
      timers.clearTimeout(forceKillSettleTimeout);
      if (child && options.onChildEnd) options.onChildEnd(child);
      resolve({
        forceKillSettleMs,
        index,
        shard,
        stderr,
        stdout,
        timedOut,
        timeoutMs,
        ...result
      });
    }

    function sendSignal(signal) {
      try {
        child.kill(signal);
        return true;
      } catch (terminationError) {
        detachChild();
        finish({ code: 1, terminationError });
        return false;
      }
    }

    function forceKill() {
      if (settled || forceKillSent) return;
      forceKillSent = true;
      timers.clearTimeout(forceKillTimeout);
      if (!sendSignal('SIGKILL') || settled) return;
      forceKillSettleTimeout = timers.setTimeout(() => {
        if (settled) return;
        detachChild();
        finish({ code: 1, forceKillTimedOut: true });
      }, forceKillSettleMs);
    }

    function terminate(signal) {
      if (settled || terminationStarted) return;
      terminationStarted = true;
      timers.clearTimeout(timeout);
      if (!sendSignal(signal) || settled) return;
      forceKillTimeout = timers.setTimeout(forceKill, killGraceMs);
    }

    try {
      child = spawnImpl(
        nodePath,
        ['--test', '--test-isolation=none', '--test-reporter=tap', testFile],
        {
          cwd: rootDir,
          env: {
            ...process.env,
            VALIDATOR_TEST_SHARD: shard
          },
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true
        }
      );
    } catch (error) {
      finish({ code: 1, error });
      return;
    }

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      finish({ code: 1, error });
    });
    child.on('close', (code, signal) => {
      finish({ code, signal });
    });
    timeout = timers.setTimeout(() => {
      if (settled) return;
      timedOut = true;
      terminate('SIGTERM');
    }, timeoutMs);
    if (options.onChildStart) {
      options.onChildStart(child, { forceKill, terminate });
    }
  });
}

function parseTestSummary(stdout) {
  const summary = {};
  const summaryPattern =
    /^# (tests|pass|fail|cancelled|skipped|todo) ([0-9]+)$/;

  for (const line of stdout.split(/\r?\n/)) {
    const match = summaryPattern.exec(line.trim());
    if (!match) continue;
    if (Object.hasOwn(summary, match[1])) return null;
    summary[match[1]] = Number(match[2]);
  }

  const fields = ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'];
  return fields.every((field) => Number.isSafeInteger(summary[field]))
    ? summary
    : null;
}

function validateShardResult(result) {
  const reasons = [];
  const expectedTests = expectedTestsForShard(result.index);
  const expectedMarker =
    `Validator test shard ${result.shard}: ${expectedTests}/` +
    `${EXPECTED_VALIDATOR_TEST_COUNT} tests`;

  if (result.timedOut) {
    reasons.push(
      `Shard ${result.shard} timed out after ${result.timeoutMs}ms`
    );
  }
  if (result.code != null && result.code !== 0) {
    reasons.push(`Shard ${result.shard} exited with code ${result.code}`);
  }
  if (result.signal) {
    reasons.push(`Shard ${result.shard} ended with ${result.signal}`);
  }
  if (result.error) {
    reasons.push(
      `Shard ${result.shard} failed to start: ` +
        `${result.error.message || result.error}`
    );
  }
  if (result.terminationError) {
    reasons.push(
      `Shard ${result.shard} could not be terminated: ` +
        `${result.terminationError.message || result.terminationError}`
    );
  }
  if (result.forceKillTimedOut) {
    reasons.push(
      `Shard ${result.shard} did not close within ` +
        `${result.forceKillSettleMs}ms after SIGKILL`
    );
  }
  const reportedInventory = result.stdout
    .split(/\r?\n/)
    .some((line) => line.trim() === expectedMarker);
  if (!reportedInventory) {
    reasons.push(`Shard ${result.shard} did not report its expected inventory`);
  }

  const summary = parseTestSummary(result.stdout);
  if (!summary) {
    reasons.push(`Shard ${result.shard} did not report a complete TAP summary`);
    return reasons;
  }
  if (summary.tests !== expectedTests) {
    reasons.push(
      `Shard ${result.shard} reported ${summary.tests} test(s); ` +
        `expected ${expectedTests}`
    );
  }
  if (summary.pass !== expectedTests) {
    reasons.push(
      `Shard ${result.shard} reported ${summary.pass} passing test(s); ` +
        `expected ${expectedTests}`
    );
  }
  for (const field of ['fail', 'cancelled', 'skipped', 'todo']) {
    if (summary[field] !== 0) {
      reasons.push(
        `Shard ${result.shard} reported ${summary[field]} ${field} test(s)`
      );
    }
  }

  return reasons;
}

function writeCapturedOutput(output, value) {
  const normalized = value.trimEnd();
  if (normalized) output(normalized);
}

async function runCli(
  output = { error: console.error, log: console.log },
  options = {}
) {
  const configuredShard = Object.hasOwn(options, 'validatorTestShard')
    ? options.validatorTestShard
    : process.env.VALIDATOR_TEST_SHARD;
  const shardIndexes = configuredShard == null || configuredShard === ''
    ? Array.from(
      { length: VALIDATOR_TEST_SHARD_COUNT },
      (_value, index) => index + 1
    )
    : [parseValidatorTestShard(configuredShard).index + 1];
  const activeChildren = new Map();
  const signalSource = options.signalSource || process;
  let parentSignal;
  let parentSignalCount = 0;

  function handleParentSignal(signal) {
    parentSignalCount += 1;
    if (!parentSignal) {
      parentSignal = signal;
      output.error(
        `Validator test runner received ${signal}; ` +
          'forwarding to active shards.'
      );
    }

    const forwardedSignal = parentSignalCount === 1 ? signal : 'SIGKILL';
    for (const controller of activeChildren.values()) {
      try {
        if (parentSignalCount === 1) {
          controller.terminate(signal);
        } else {
          controller.forceKill();
        }
      } catch (error) {
        output.error(
          `Failed to forward ${forwardedSignal} to a validator shard: ` +
            `${error.message || error}`
        );
      }
    }
  }

  const onSigint = () => handleParentSignal('SIGINT');
  const onSigterm = () => handleParentSignal('SIGTERM');
  signalSource.on('SIGINT', onSigint);
  signalSource.on('SIGTERM', onSigterm);

  let results;
  try {
    const shardOptions = {
      ...options,
      onChildEnd(child) {
        activeChildren.delete(child);
        if (options.onChildEnd) options.onChildEnd(child);
      },
      onChildStart(child, controller) {
        activeChildren.set(child, controller);
        if (options.onChildStart) options.onChildStart(child, controller);
      }
    };
    results = await Promise.all(
      shardIndexes.map((index) => runShard(index, shardOptions))
    );
  } finally {
    signalSource.removeListener('SIGINT', onSigint);
    signalSource.removeListener('SIGTERM', onSigterm);
  }

  if (parentSignal) return parentSignal === 'SIGINT' ? 130 : 143;

  let failed = false;

  for (const result of results) {
    const reasons = validateShardResult(result);
    if (reasons.length > 0) {
      failed = true;
      output.log(`=== Validator test shard ${result.shard} ===`);
      writeCapturedOutput(output.log, result.stdout);
      writeCapturedOutput(output.error, result.stderr);
      for (const reason of reasons) output.error(reason);
    } else {
      output.log(
        `Validator test shard ${result.shard} passed: ` +
          `${expectedTestsForShard(result.index)} tests.`
      );
      writeCapturedOutput(output.error, result.stderr);
    }
  }

  if (failed) return 1;
  if (results.length === 1) return 0;
  output.log(
    `Validator test shards passed: ${EXPECTED_VALIDATOR_TEST_COUNT} tests ` +
      `across ${VALIDATOR_TEST_SHARD_COUNT} shards.`
  );
  return 0;
}

if (require.main === module) {
  runCli().then(
    (status) => {
      process.exitCode = status;
    },
    (error) => {
      console.error(error);
      process.exitCode = 1;
    }
  );
}

module.exports = {
  expectedTestsForShard,
  runCli,
  runShard,
  validateShardResult
};
