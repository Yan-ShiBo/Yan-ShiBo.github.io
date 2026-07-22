import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import worker from './index.mjs';

const MIGRATIONS = [
  '0001_initial.sql',
  '0002_remove_device_timestamp.sql'
].map((file) => readFileSync(
  new URL(`../migrations/${file}`, import.meta.url),
  'utf8'
));

class D1Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new D1Statement(this.database, this.sql, values);
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return {
      success: true,
      meta: { changes: Number(result.changes) },
      results: []
    };
  }

  async first(column) {
    const row = this.database.prepare(this.sql).get(...this.values);
    if (!row) return null;
    return column ? row[column] : row;
  }

  async all() {
    return {
      success: true,
      results: this.database.prepare(this.sql).all(...this.values)
    };
  }
}

class TestD1Database {
  constructor(migrations = MIGRATIONS) {
    this.database = new DatabaseSync(':memory:');
    for (const migration of migrations) this.database.exec(migration);
  }

  prepare(sql) {
    return new D1Statement(this.database, sql);
  }

  async batch(statements) {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  close() {
    this.database.close();
  }
}

function createEnv(database) {
  return {
    DB: database,
    ALLOWED_ORIGINS: [
      'https://yan-shibo.github.io',
      'http://127.0.0.1:8000',
      'http://localhost:8000'
    ].join(','),
    TRACKING_START_DATE: '2026-07-22',
    TIME_ZONE: 'Asia/Shanghai',
    VISITOR_HASH_SECRET: 'test-only-secret-with-at-least-32-bytes'
  };
}

function visitRequest(path = '/') {
  return new Request('https://stats.example/v1/visit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://yan-shibo.github.io',
      'User-Agent': 'Mozilla/5.0 test browser',
      'CF-Connecting-IP': '203.0.113.10'
    },
    body: JSON.stringify({ path })
  });
}

function statsRequest(path = '/') {
  const url = new URL('https://stats.example/v1/stats');
  url.searchParams.set('path', path);
  return new Request(url, {
    headers: { Origin: 'https://yan-shibo.github.io' }
  });
}

test('POST /v1/visit records the first public visit through the HTTP interface', async (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-07-22T03:04:05.000Z')
  });
  const database = new TestD1Database();
  t.after(() => database.close());

  const response = await worker.fetch(visitRequest(), createEnv(database));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://yan-shibo.github.io');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), {
    siteViews: '1',
    monthUniqueDevices: '1',
    pageViews: '1',
    period: '2026-07',
    trackingSince: '2026-07-22'
  });
});

test('homepage aliases and canonical paths share the same page counter', async (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-07-22T03:04:05.000Z')
  });

  for (const [alias, canonical] of [
    ['/index.html', '/'],
    ['/en/index.html', '/en/']
  ]) {
    const database = new TestD1Database();
    t.after(() => database.close());
    const env = createEnv(database);

    await worker.fetch(visitRequest(alias), env);
    await worker.fetch(visitRequest(canonical), env);
    const response = await worker.fetch(statsRequest(canonical), env);

    assert.equal(response.status, 200, alias);
    assert.deepEqual(await response.json(), {
      siteViews: '2',
      monthUniqueDevices: '1',
      pageViews: '2',
      period: '2026-07',
      trackingSince: '2026-07-22'
    }, alias);
  }
});

test('monthly device estimates deduplicate the same fingerprint without storing raw identity', async (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-07-22T03:04:05.000Z')
  });
  const database = new TestD1Database();
  t.after(() => database.close());
  const env = createEnv(database);

  const firstResponse = await worker.fetch(visitRequest(), env);
  const repeatResponse = await worker.fetch(visitRequest(), env);
  const differentDevice = visitRequest();
  differentDevice.headers.set('User-Agent', 'Mozilla/5.0 another device');
  const differentResponse = await worker.fetch(differentDevice, env);
  const storedRows = database.database
    .prepare('SELECT device_hash FROM monthly_devices ORDER BY device_hash')
    .all();

  assert.equal((await firstResponse.json()).monthUniqueDevices, '1');
  assert.equal((await repeatResponse.json()).monthUniqueDevices, '1');
  assert.deepEqual(await differentResponse.json(), {
    siteViews: '3',
    monthUniqueDevices: '2',
    pageViews: '3',
    period: '2026-07',
    trackingSince: '2026-07-22'
  });
  assert.equal(storedRows.length, 2);
  for (const row of storedRows) {
    assert.match(row.device_hash, /^[0-9a-f]{64}$/);
    assert.ok(!row.device_hash.includes('203.0.113.10'));
    assert.ok(!row.device_hash.includes('Mozilla'));
  }
});

test('the monthly device table persists only the period and HMAC digest', (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());

  const columns = database.database
    .prepare('PRAGMA table_info(monthly_devices)')
    .all()
    .map((column) => column.name);

  assert.deepEqual(columns, ['period', 'device_hash']);
});

test('POST /v1/visit rejects an unapproved origin without writing', async (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());
  const request = visitRequest();
  request.headers.set('Origin', 'https://example.invalid');

  const response = await worker.fetch(request, createEnv(database));
  const stored = database.database.prepare(
    "SELECT " +
      "(SELECT value FROM counter_totals WHERE key = 'site_views') AS site_views, " +
      '(SELECT COUNT(*) FROM page_views) AS page_rows, ' +
      '(SELECT COUNT(*) FROM monthly_devices) AS device_rows'
  ).get();

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.deepEqual(await response.json(), { error: 'origin_not_allowed' });
  assert.deepEqual({ ...stored }, { site_views: 0, page_rows: 0, device_rows: 0 });
});

test('POST /v1/visit rejects paths outside the four stats-enabled pages', async (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());

  const response = await worker.fetch(
    visitRequest('/research.html'),
    createEnv(database)
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_path' });
});

test('POST /v1/visit returns a stable error for malformed JSON', async (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());
  const request = visitRequest();
  const malformedRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: '{'
  });

  const response = await worker.fetch(malformedRequest, createEnv(database));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_request' });
});

test('POST /v1/visit treats a JSON null body as an invalid request', async (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());
  const request = visitRequest();
  const nullRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body: 'null'
  });

  const response = await worker.fetch(nullRequest, createEnv(database));

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_request' });
});

test('GET /v1/stats reads the current aggregate without incrementing it', async (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-07-22T03:04:05.000Z')
  });
  const database = new TestD1Database();
  t.after(() => database.close());
  const env = createEnv(database);
  await worker.fetch(visitRequest(), env);

  const firstResponse = await worker.fetch(statsRequest(), env);
  const secondResponse = await worker.fetch(statsRequest(), env);

  assert.equal(firstResponse.status, 200);
  assert.deepEqual(await firstResponse.json(), {
    siteViews: '1',
    monthUniqueDevices: '1',
    pageViews: '1',
    period: '2026-07',
    trackingSince: '2026-07-22'
  });
  assert.deepEqual(await secondResponse.json(), {
    siteViews: '1',
    monthUniqueDevices: '1',
    pageViews: '1',
    period: '2026-07',
    trackingSince: '2026-07-22'
  });
});

test('monthly device digests reset at the Shanghai month boundary and old digests are purged', async (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-07-31T15:59:59.000Z')
  });
  const database = new TestD1Database();
  t.after(() => database.close());
  const env = createEnv(database);

  const julyResponse = await worker.fetch(visitRequest(), env);
  t.mock.timers.setTime(new Date('2026-07-31T16:00:01.000Z').getTime());
  const augustResponse = await worker.fetch(visitRequest(), env);
  const retainedPeriods = database.database
    .prepare('SELECT period FROM monthly_devices ORDER BY period')
    .all()
    .map((row) => row.period);

  assert.equal((await julyResponse.json()).period, '2026-07');
  assert.deepEqual(await augustResponse.json(), {
    siteViews: '2',
    monthUniqueDevices: '1',
    pageViews: '2',
    period: '2026-08',
    trackingSince: '2026-07-22'
  });
  assert.deepEqual(retainedPeriods, ['2026-08']);
});

test('a stale old-month request cannot replace a newer monthly digest set', async (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-07-31T15:59:59.000Z')
  });
  const database = new TestD1Database();
  t.after(() => database.close());
  database.database.prepare(
    'INSERT INTO monthly_devices (period, device_hash) VALUES (?, ?)'
  ).run('2026-08', 'a'.repeat(64));

  const response = await worker.fetch(visitRequest(), createEnv(database));
  const retainedPeriods = database.database
    .prepare('SELECT period FROM monthly_devices ORDER BY period')
    .all()
    .map((row) => row.period);

  assert.equal(response.status, 200);
  assert.equal((await response.json()).monthUniqueDevices, '0');
  assert.deepEqual(retainedPeriods, ['2026-08']);
});

test('GET /v1/stats reports zeroes before the first visit', async (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-07-22T03:04:05.000Z')
  });
  const database = new TestD1Database();
  t.after(() => database.close());

  const response = await worker.fetch(statsRequest(), createEnv(database));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    siteViews: '0',
    monthUniqueDevices: '0',
    pageViews: '0',
    period: '2026-07',
    trackingSince: '2026-07-22'
  });
});

test('GET /v1/stats fails closed when the statistics configuration drifts', async (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());
  const cases = [
    ['VISITOR_HASH_SECRET', 'short'],
    ['TRACKING_START_DATE', '2026-07-21'],
    ['TIME_ZONE', 'UTC'],
    ['ALLOWED_ORIGINS', '']
  ];

  for (const [key, value] of cases) {
    const env = createEnv(database);
    env[key] = value;
    const response = await worker.fetch(
      new Request('https://stats.example/v1/stats?path=/'),
      env
    );

    assert.equal(response.status, 503, key);
    assert.deepEqual(await response.json(), { error: 'stats_unavailable' }, key);
  }
});

test('GET /v1/stats rejects an unapproved browser origin', async (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());
  const request = statsRequest();
  request.headers.set('Origin', 'https://example.invalid');

  const response = await worker.fetch(request, createEnv(database));

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.deepEqual(await response.json(), { error: 'origin_not_allowed' });
});

test('GET /v1/stats returns a stable unavailable response when D1 fails', async () => {
  const env = createEnv({
    prepare() {
      throw new Error('internal D1 details');
    }
  });

  const response = await worker.fetch(statsRequest(), env);

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://yan-shibo.github.io');
  assert.deepEqual(await response.json(), { error: 'stats_unavailable' });
});

test('OPTIONS exposes the approved cross-origin contract', async (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());
  const request = new Request('https://stats.example/v1/visit', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://yan-shibo.github.io',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type'
    }
  });

  const response = await worker.fetch(request, createEnv(database));

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://yan-shibo.github.io');
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'GET, POST, OPTIONS');
  assert.equal(response.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
  assert.equal(response.headers.get('Access-Control-Max-Age'), '86400');
});

test('OPTIONS rejects an unapproved origin without reflecting it', async () => {
  const response = await worker.fetch(
    new Request('https://stats.example/v1/visit', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.invalid' }
    }),
    createEnv({})
  );

  assert.equal(response.status, 403);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(response.headers.get('Vary'), 'Origin');
});

test('GET /health verifies that the D1 binding is reachable', async (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());

  const response = await worker.fetch(
    new Request('https://stats.example/health'),
    createEnv(database)
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), {
    status: 'ok',
    trackingSince: '2026-07-22'
  });
});

test('GET /health returns a non-sensitive failure when D1 is unavailable', async () => {
  const env = createEnv({
    prepare() {
      throw new Error('database credentials and internal details');
    }
  });

  const response = await worker.fetch(
    new Request('https://stats.example/health'),
    env
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'error' });
});

test('GET /health fails when D1 is reachable but the statistics schema is missing', async () => {
  const env = createEnv({
    prepare(sql) {
      if (sql === 'SELECT 1 AS ok') {
        return { async first() { return 1; } };
      }
      throw new Error('missing table');
    }
  });

  const response = await worker.fetch(
    new Request('https://stats.example/health'),
    env
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'error' });
});

test('GET /health rejects the pre-privacy monthly device schema', async (t) => {
  const database = new TestD1Database([MIGRATIONS[0]]);
  t.after(() => database.close());

  const response = await worker.fetch(
    new Request('https://stats.example/health'),
    createEnv(database)
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'error' });
});

test('POST /v1/visit returns a stable unavailable response when D1 fails', async () => {
  const database = new TestD1Database();
  const env = createEnv(database);
  env.DB = {
    prepare: database.prepare.bind(database),
    async batch() {
      throw new Error('internal D1 failure');
    }
  };

  try {
    const response = await worker.fetch(visitRequest(), env);

    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://yan-shibo.github.io');
    assert.deepEqual(await response.json(), { error: 'stats_unavailable' });
  } finally {
    database.close();
  }
});

test('GET /health fails closed when the visitor hash secret is missing', async (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());
  const env = createEnv(database);
  delete env.VISITOR_HASH_SECRET;

  const response = await worker.fetch(
    new Request('https://stats.example/health'),
    env
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'error' });
});

test('POST /v1/visit fails closed before writing when the hash secret is weak', async (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-07-22T03:04:05.000Z')
  });
  const database = new TestD1Database();
  t.after(() => database.close());
  const env = createEnv(database);
  env.VISITOR_HASH_SECRET = 'short';

  const response = await worker.fetch(visitRequest(), env);
  const statsResponse = await worker.fetch(statsRequest(), createEnv(database));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'stats_unavailable' });
  assert.deepEqual(await statsResponse.json(), {
    siteViews: '0',
    monthUniqueDevices: '0',
    pageViews: '0',
    period: '2026-07',
    trackingSince: '2026-07-22'
  });
});

test('POST /v1/visit does not collapse missing client identity into one device', async (t) => {
  t.mock.timers.enable({
    apis: ['Date'],
    now: new Date('2026-07-22T03:04:05.000Z')
  });
  const database = new TestD1Database();
  t.after(() => database.close());
  const env = createEnv(database);
  const request = visitRequest();
  request.headers.delete('CF-Connecting-IP');

  const response = await worker.fetch(request, env);
  const statsResponse = await worker.fetch(statsRequest(), env);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'stats_unavailable' });
  assert.deepEqual(await statsResponse.json(), {
    siteViews: '0',
    monthUniqueDevices: '0',
    pageViews: '0',
    period: '2026-07',
    trackingSince: '2026-07-22'
  });
});

test('GET /health requires the exact approved origin set', async (t) => {
  const database = new TestD1Database();
  t.after(() => database.close());
  const invalidValues = [
    undefined,
    'https://example.invalid',
    'https://yan-shibo.github.io,http://127.0.0.1:8000',
    'https://yan-shibo.github.io,http://127.0.0.1:8000,http://localhost:8000,http://localhost:8000'
  ];

  for (const value of invalidValues) {
    const env = createEnv(database);
    if (value === undefined) delete env.ALLOWED_ORIGINS;
    else env.ALLOWED_ORIGINS = value;
    const response = await worker.fetch(
      new Request('https://stats.example/health'),
      env
    );

    assert.equal(response.status, 503, String(value));
    assert.deepEqual(await response.json(), { status: 'error' }, String(value));
  }
});
