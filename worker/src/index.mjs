const TRACKED_PATHS = new Map([
  ['/', '/'],
  ['/index.html', '/'],
  ['/en/', '/en/'],
  ['/en/index.html', '/en/'],
  ['/analytics.html', '/analytics.html'],
  ['/en/analytics.html', '/en/analytics.html']
]);
const TRACKING_START_DATE = '2026-07-22';
const STATS_TIME_ZONE = 'Asia/Shanghai';
const APPROVED_ORIGINS = new Set([
  'https://yan-shibo.github.io',
  'http://127.0.0.1:8000',
  'http://localhost:8000'
]);

function responseHeaders(origin) {
  const headers = {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin'
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function allowedOrigins(env) {
  if (typeof env.ALLOWED_ORIGINS !== 'string') return [];
  return env.ALLOWED_ORIGINS
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function originAllowed(env, origin) {
  return Boolean(origin) && allowedOrigins(env).includes(origin);
}

function validConfiguration(env) {
  const origins = allowedOrigins(env);
  const uniqueOrigins = new Set(origins);
  return typeof env.VISITOR_HASH_SECRET === 'string' &&
    env.VISITOR_HASH_SECRET.length >= 32 &&
    env.TRACKING_START_DATE === TRACKING_START_DATE &&
    env.TIME_ZONE === STATS_TIME_ZONE &&
    origins.length === APPROVED_ORIGINS.size &&
    uniqueOrigins.size === APPROVED_ORIGINS.size &&
    origins.every((origin) => APPROVED_ORIGINS.has(origin));
}

function originNotAllowed() {
  return new Response(JSON.stringify({ error: 'origin_not_allowed' }), {
    status: 403,
    headers: responseHeaders('')
  });
}

function currentPeriod(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year').value;
  const month = parts.find((part) => part.type === 'month').value;
  return `${year}-${month}`;
}

async function deviceHash(secret, period, ipAddress, userAgent) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${period}\n${ipAddress}\n${userAgent}`)
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

async function recordVisit(request, env) {
  if (!validConfiguration(env)) throw new Error('invalid worker configuration');
  const origin = request.headers.get('Origin') || '';
  if (!originAllowed(env, origin)) return originNotAllowed();

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      status: 400,
      headers: responseHeaders(origin)
    });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return new Response(JSON.stringify({ error: 'invalid_request' }), {
      status: 400,
      headers: responseHeaders(origin)
    });
  }
  const path = TRACKED_PATHS.get(body.path);
  if (!path) {
    return new Response(JSON.stringify({ error: 'invalid_path' }), {
      status: 400,
      headers: responseHeaders(origin)
    });
  }
  const now = new Date();
  const period = currentPeriod(now, env.TIME_ZONE);
  const ipAddress = request.headers.get('CF-Connecting-IP') || '';
  const userAgent = request.headers.get('User-Agent') || '';
  if (!ipAddress || !userAgent) {
    throw new Error('client identity unavailable');
  }
  const hash = await deviceHash(
    env.VISITOR_HASH_SECRET,
    period,
    ipAddress,
    userAgent
  );

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE counter_totals SET value = value + 1 WHERE key = 'site_views'"
    ),
    env.DB.prepare(
      'INSERT INTO page_views (path, value) VALUES (?, 1) ' +
        'ON CONFLICT(path) DO UPDATE SET value = value + 1'
    ).bind(path),
    env.DB.prepare(
      'DELETE FROM monthly_devices WHERE period < ?'
    ).bind(period),
    env.DB.prepare(
      'INSERT OR IGNORE INTO monthly_devices (period, device_hash) ' +
        'SELECT ?, ? WHERE NOT EXISTS (' +
          'SELECT 1 FROM monthly_devices WHERE period > ?' +
        ')'
    ).bind(period, hash, period)
  ]);

  const [siteViews, pageViews, monthUniqueDevices] = await Promise.all([
    env.DB.prepare(
      "SELECT value FROM counter_totals WHERE key = 'site_views'"
    ).first('value'),
    env.DB.prepare(
      'SELECT COALESCE((SELECT value FROM page_views WHERE path = ?), 0) AS value'
    ).bind(path).first('value'),
    env.DB.prepare(
      'SELECT COUNT(*) AS value FROM monthly_devices WHERE period = ?'
    ).bind(period).first('value')
  ]);

  return new Response(
    JSON.stringify({
      siteViews: String(siteViews),
      monthUniqueDevices: String(monthUniqueDevices),
      pageViews: String(pageViews),
      period,
      trackingSince: env.TRACKING_START_DATE
    }),
    { status: 200, headers: responseHeaders(origin) }
  );
}

async function readStats(request, env, url) {
  if (!validConfiguration(env)) throw new Error('invalid worker configuration');
  const origin = request.headers.get('Origin') || '';
  if (origin && !originAllowed(env, origin)) return originNotAllowed();
  const path = TRACKED_PATHS.get(url.searchParams.get('path'));
  if (!path) {
    return new Response(JSON.stringify({ error: 'invalid_path' }), {
      status: 400,
      headers: responseHeaders(origin)
    });
  }

  const period = currentPeriod(new Date(), env.TIME_ZONE);
  const [siteViews, pageViews, monthUniqueDevices] = await Promise.all([
    env.DB.prepare(
      "SELECT value FROM counter_totals WHERE key = 'site_views'"
    ).first('value'),
    env.DB.prepare(
      'SELECT COALESCE((SELECT value FROM page_views WHERE path = ?), 0) AS value'
    ).bind(path).first('value'),
    env.DB.prepare(
      'SELECT COUNT(*) AS value FROM monthly_devices WHERE period = ?'
    ).bind(period).first('value')
  ]);

  return new Response(
    JSON.stringify({
      siteViews: String(siteViews),
      monthUniqueDevices: String(monthUniqueDevices),
      pageViews: String(pageViews),
      period,
      trackingSince: env.TRACKING_START_DATE
    }),
    { status: 200, headers: responseHeaders(origin) }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (
      request.method === 'OPTIONS' &&
      (url.pathname === '/v1/visit' || url.pathname === '/v1/stats')
    ) {
      const origin = request.headers.get('Origin') || '';
      if (!originAllowed(env, origin)) {
        return new Response(null, { status: 403, headers: { Vary: 'Origin' } });
      }
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin'
        }
      });
    }
    if (request.method === 'POST' && url.pathname === '/v1/visit') {
      try {
        return await recordVisit(request, env);
      } catch (error) {
        const origin = request.headers.get('Origin') || '';
        return new Response(JSON.stringify({ error: 'stats_unavailable' }), {
          status: 503,
          headers: responseHeaders(originAllowed(env, origin) ? origin : '')
        });
      }
    }
    if (request.method === 'GET' && url.pathname === '/v1/stats') {
      try {
        return await readStats(request, env, url);
      } catch (error) {
        const origin = request.headers.get('Origin') || '';
        return new Response(JSON.stringify({ error: 'stats_unavailable' }), {
          status: 503,
          headers: responseHeaders(originAllowed(env, origin) ? origin : '')
        });
      }
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      try {
        if (!validConfiguration(env)) throw new Error('invalid worker configuration');
        const schema = await env.DB.prepare(
          "SELECT " +
            "(SELECT value FROM counter_totals WHERE key = 'site_views') AS site_views, " +
            '(SELECT COUNT(*) FROM page_views) AS page_rows, ' +
            '(SELECT COUNT(*) FROM monthly_devices) AS device_rows'
        ).first();
        if (!schema || schema.site_views === null) {
          throw new Error('statistics schema unavailable');
        }
        const tableContracts = [
          ['counter_totals', ['key', 'value']],
          ['page_views', ['path', 'value']],
          ['monthly_devices', ['period', 'device_hash']]
        ];
        for (const [table, expectedColumns] of tableContracts) {
          const columnResult = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
          const actualColumns = Array.isArray(columnResult?.results)
            ? columnResult.results.map((column) => column.name)
            : [];
          if (
            actualColumns.length !== expectedColumns.length ||
            actualColumns.some((column, index) => column !== expectedColumns[index])
          ) {
            throw new Error('statistics schema unavailable');
          }
        }
        return new Response(
          JSON.stringify({
            status: 'ok',
            trackingSince: env.TRACKING_START_DATE
          }),
          {
            status: 200,
            headers: {
              'Cache-Control': 'no-store',
              'Content-Type': 'application/json; charset=utf-8'
            }
          }
        );
      } catch (error) {
        return new Response(JSON.stringify({ status: 'error' }), {
          status: 503,
          headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8'
          }
        });
      }
    }
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }
};
