const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const STATS_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '..', 'assets/js/stats.js'),
  'utf8'
);

function settled(state, value) {
  return {
    then(onFulfilled, onRejected) {
      const callback = state === 'fulfilled' ? onFulfilled : onRejected;
      if (typeof callback !== 'function') return settled(state, value);
      try {
        const result = callback(value);
        return result && typeof result.then === 'function'
          ? result
          : settled('fulfilled', result);
      } catch (error) {
        return settled('rejected', error);
      }
    },
    catch(onRejected) {
      return this.then(undefined, onRejected);
    },
    finally(callback) {
      callback();
      return this;
    }
  };
}

function runClient(payload, scenarioOptions = {}) {
  const ids = [
    'site-pv',
    'month-unique-devices',
    'page-pv',
    'stats-status'
  ];
  const elements = new Map(ids.map((id) => {
    const element = {
      attributes: {},
      textContent: '',
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      }
    };
    return [id, element];
  }));
  const documentEvents = {};
  const windowEvents = {};
  const fetchCalls = [];
  const timers = [];
  let abortCalls = 0;
  const document = {
    documentElement: { lang: 'en' },
    head: { appendChild() {} },
    addEventListener(type, callback) {
      documentEvents[type] = callback;
    },
    createElement() {
      return {};
    },
    querySelector(selector) {
      if (selector !== 'meta[name="stats-api-endpoint"]') return null;
      if (scenarioOptions.endpoint === null) return null;
      return {
        getAttribute(name) {
          return name === 'content'
            ? (scenarioOptions.endpoint || 'https://stats.example.test/v1/visit')
            : null;
        }
      };
    },
    getElementById(id) {
      return elements.get(id) || null;
    }
  };
  const window = {
    document,
    localStorage: null,
    location: { pathname: '/en/analytics.html' },
    addEventListener(type, callback) {
      windowEvents[type] = callback;
    },
    setInterval() {
      return 1;
    },
    clearInterval() {},
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimeout() {}
  };
  const TestAbortController = class {
    constructor() {
      const listeners = [];
      this.signal = {
        aborted: false,
        addEventListener(type, callback) {
          if (type === 'abort') listeners.push(callback);
        }
      };
      this.abortListeners = listeners;
    }

    abort() {
      abortCalls += 1;
      this.signal.aborted = true;
      for (const listener of this.abortListeners) listener();
    }
  };
  const fetchImpl = function (url, requestOptions) {
    fetchCalls.push({ url, options: requestOptions });
    if (scenarioOptions.pending) {
      return new Promise((resolve, reject) => {
        requestOptions.signal.addEventListener('abort', () => {
          reject(new Error('simulated abort'));
        });
      });
    }
    if (scenarioOptions.fetchError) {
      return settled('rejected', new Error('simulated network failure'));
    }
    return settled('fulfilled', {
      ok: scenarioOptions.responseOk !== false,
      json() {
        return settled('fulfilled', payload);
      }
    });
  };
  const context = vm.createContext({
    AbortController: scenarioOptions.noAbortController
      ? undefined
      : TestAbortController,
    document,
    fetch: scenarioOptions.noFetch ? undefined : fetchImpl,
    window
  });

  new vm.Script(STATS_SOURCE, { filename: 'assets/js/stats.js' })
    .runInContext(context, { timeout: 1000 });
  windowEvents.load();

  return {
    elements,
    fetchCalls,
    timers,
    get abortCalls() {
      return abortCalls;
    }
  };
}

test('public stats posts the canonical page once and renders the Worker response', () => {
  const result = runClient({
    siteViews: '100',
    monthUniqueDevices: '23',
    pageViews: '7',
    period: '2026-07',
    trackingSince: '2026-07-22'
  });

  assert.equal(result.fetchCalls.length, 1);
  const call = result.fetchCalls[0];
  assert.equal(call.url, 'https://stats.example.test/v1/visit');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers['Content-Type'], 'application/json');
  assert.equal(call.options.cache, 'no-store');
  assert.equal(call.options.credentials, 'omit');
  assert.deepEqual(JSON.parse(call.options.body), { path: '/en/analytics.html' });
  assert.equal(result.elements.get('site-pv').textContent, '100');
  assert.equal(result.elements.get('month-unique-devices').textContent, '23');
  assert.equal(result.elements.get('page-pv').textContent, '7');
  assert.equal(result.elements.get('stats-status').attributes['data-state'], 'ok');
  assert.match(result.elements.get('stats-status').textContent, /July 22, 2026/);
});

test('zero remains valid for every public statistic', () => {
  const result = runClient({
    siteViews: '0',
    monthUniqueDevices: '0',
    pageViews: '0',
    period: '2026-07',
    trackingSince: '2026-07-22'
  });

  assert.equal(result.elements.get('site-pv').textContent, '0');
  assert.equal(result.elements.get('month-unique-devices').textContent, '0');
  assert.equal(result.elements.get('page-pv').textContent, '0');
  assert.equal(result.elements.get('stats-status').attributes['data-state'], 'ok');
});

test('invalid or unavailable responses fail closed without stale public values', () => {
  const invalidResult = runClient({
    siteViews: 1,
    monthUniqueDevices: '2',
    pageViews: '3',
    period: '2026-07',
    trackingSince: '2026-07-22'
  });
  const failedResult = runClient(null, { fetchError: true });

  for (const result of [invalidResult, failedResult]) {
    assert.equal(result.elements.get('site-pv').textContent, '--');
    assert.equal(result.elements.get('month-unique-devices').textContent, '--');
    assert.equal(result.elements.get('page-pv').textContent, '--');
    assert.equal(result.elements.get('stats-status').attributes['data-state'], 'warn');
    assert.match(result.elements.get('stats-status').textContent, /local records remain available/i);
  }
});

test('a pending public request aborts after five seconds and fails closed', async () => {
  const result = runClient(null, { pending: true });

  assert.equal(result.timers.length, 1);
  assert.equal(result.timers[0].delay, 5000);
  result.timers[0].callback();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(result.abortCalls, 1);
  assert.equal(result.elements.get('site-pv').textContent, '--');
  assert.equal(result.elements.get('month-unique-devices').textContent, '--');
  assert.equal(result.elements.get('page-pv').textContent, '--');
  assert.equal(result.elements.get('stats-status').attributes['data-state'], 'warn');
});

test('a missing endpoint fails without making a network request', () => {
  const result = runClient(null, { endpoint: null });

  assert.equal(result.fetchCalls.length, 0);
  assert.equal(result.elements.get('stats-status').attributes['data-state'], 'warn');
  assert.equal(result.elements.get('site-pv').textContent, '--');
});

test('missing request or abort capabilities fail closed before fetching', () => {
  const payload = {
    siteViews: '1',
    monthUniqueDevices: '1',
    pageViews: '1',
    period: '2026-07',
    trackingSince: '2026-07-22'
  };

  for (const options of [{ noAbortController: true }, { noFetch: true }]) {
    const result = runClient(payload, options);

    assert.equal(result.fetchCalls.length, 0);
    assert.equal(result.elements.get('site-pv').textContent, '--');
    assert.equal(result.elements.get('month-unique-devices').textContent, '--');
    assert.equal(result.elements.get('page-pv').textContent, '--');
    assert.equal(result.elements.get('stats-status').attributes['data-state'], 'warn');
  }
});
