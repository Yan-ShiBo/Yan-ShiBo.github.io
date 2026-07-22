(function () {
  var PUBLIC_REQUEST_TIMEOUT_MS = 5000;
  var TRACKING_START_DATE = '2026-07-22';

  var STORAGE_KEYS = {
    total: 'ysb-visit-total',
    first: 'ysb-visit-first',
    last: 'ysb-visit-last',
    days: 'ysb-visit-days'
  };

  var MIGRATABLE_LEGACY_STORAGE_KEYS = {
    total: 'ysb_visit_total',
    first: 'ysb_first_visit',
    days: 'ysb_visit_days'
  };

  function getStorage() {
    try {
      return window.localStorage;
    } catch (err) {
      return null;
    }
  }

  function validLegacyTotal(value) {
    if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return false;
    var total = Number(value);
    return Number.isSafeInteger(total) && total < Number.MAX_SAFE_INTEGER;
  }

  function validLegacyTimestamp(value) {
    var date = new Date(value);
    return !isNaN(date.getTime()) && date.toISOString() === value;
  }

  function validLegacyDay(value) {
    if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) {
      return false;
    }
    var date = new Date(value + 'T00:00:00.000Z');
    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function validLegacyDays(value) {
    try {
      var days = JSON.parse(value);
      if (!Array.isArray(days)) return false;
      var seen = Object.create(null);
      for (var i = 0; i < days.length; i += 1) {
        if (!validLegacyDay(days[i]) || seen[days[i]]) return false;
        seen[days[i]] = true;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function migrateLegacyField(storage, canonicalKey, legacyKey, validate) {
    try {
      if (storage.getItem(canonicalKey) !== null) return;
      var value = storage.getItem(legacyKey);
      if (value === null || !validate(value)) return;
      storage.setItem(canonicalKey, value);
    } catch (err) {
      /* isolate unavailable or malformed legacy fields */
    }
  }

  function migrateLegacyStorage(storage) {
    migrateLegacyField(storage, STORAGE_KEYS.total, MIGRATABLE_LEGACY_STORAGE_KEYS.total, validLegacyTotal);
    migrateLegacyField(storage, STORAGE_KEYS.first, MIGRATABLE_LEGACY_STORAGE_KEYS.first, validLegacyTimestamp);
    migrateLegacyField(storage, STORAGE_KEYS.days, MIGRATABLE_LEGACY_STORAGE_KEYS.days, validLegacyDays);
  }

  function locale() {
    return document.documentElement.lang && document.documentElement.lang.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
  }

  var i18n = {
    zh: {
      loading: '正在加载访问统计（统计始于 2026-07-22）…',
      ok: '统计已更新；统计始于 2026-07-22，本月独立设备为估算值。',
      unavailable: '访问统计暂不可用；统计始于 2026-07-22，本机记录仍可正常显示。'
    },
    en: {
      loading: 'Loading visit statistics (tracking since July 22, 2026)…',
      ok: 'Statistics updated. Tracking since July 22, 2026; monthly device counts are estimates.',
      unavailable: 'Visit statistics are unavailable. Tracking since July 22, 2026; local records remain available.'
    }
  };

  function text(key) {
    return i18n[locale()][key];
  }

  function setStatus(message, state) {
    var el = document.getElementById('stats-status');
    if (!el) return;
    el.textContent = message;
    el.setAttribute('data-state', state);
  }

  function validCounter(value) {
    return typeof value === 'string' && /^[0-9]+$/.test(value);
  }

  function writeCounter(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = validCounter(value) ? value : '--';
  }

  function writeText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value || '--';
  }

  function statsEndpoint() {
    var meta = document.querySelector('meta[name="stats-api-endpoint"]');
    return meta ? (meta.getAttribute('content') || '').trim() : '';
  }

  function validPublicPayload(payload) {
    return payload &&
      typeof payload === 'object' &&
      validCounter(payload.siteViews) &&
      validCounter(payload.monthUniqueDevices) &&
      validCounter(payload.pageViews) &&
      typeof payload.period === 'string' &&
      /^[0-9]{4}-(?:0[1-9]|1[0-2])$/.test(payload.period) &&
      payload.trackingSince === TRACKING_START_DATE;
  }

  function renderUnavailable() {
    writeCounter('site-pv', '--');
    writeCounter('month-unique-devices', '--');
    writeCounter('page-pv', '--');
    setStatus(text('unavailable'), 'warn');
  }

  function loadPublicCounters() {
    var endpoint = statsEndpoint();
    if (!endpoint) {
      renderUnavailable();
      return;
    }
    if (typeof fetch !== 'function' || typeof AbortController !== 'function') {
      renderUnavailable();
      return;
    }

    var controller = new AbortController();
    var timer = window.setTimeout(function () {
      controller.abort();
    }, PUBLIC_REQUEST_TIMEOUT_MS);
    var requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname || '/' }),
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal
    };

    fetch(endpoint, requestOptions)
      .then(function (response) {
        if (!response.ok) throw new Error('stats request failed');
        return response.json();
      })
      .then(function (payload) {
        if (!validPublicPayload(payload)) throw new Error('invalid stats response');
        writeCounter('site-pv', payload.siteViews);
        writeCounter('month-unique-devices', payload.monthUniqueDevices);
        writeCounter('page-pv', payload.pageViews);
        setStatus(text('ok'), 'ok');
      })
      .catch(function () {
        renderUnavailable();
      })
      .finally(function () {
        window.clearTimeout(timer);
      });
  }

  function loadJSON(key, defaultValue) {
    var storage = getStorage();
    if (!storage) return defaultValue;
    try {
      var raw = storage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw);
    } catch (err) {
      return defaultValue;
    }
  }

  function saveJSON(key, value) {
    var storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* ignore */
    }
  }

  function formatDate(value) {
    if (!value) return '--';
    var date = new Date(value);
    if (isNaN(date.getTime())) return '--';
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    var h = String(date.getHours()).padStart(2, '0');
    var mm = String(date.getMinutes()).padStart(2, '0');
    return y + '-' + m + '-' + d + ' ' + h + ':' + mm;
  }

  function todayKey(now) {
    now = now || new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function normalizeVisitDays(value, today) {
    var source = Array.isArray(value) ? value : [];
    var seen = Object.create(null);
    var normalized = [];

    for (var i = 0; i < source.length; i += 1) {
      var day = source[i];
      if (!validLegacyDay(day) || day === today || seen[day]) continue;
      seen[day] = true;
      normalized.push(day);
    }

    normalized.push(today);
    return normalized.slice(-365);
  }

  function incrementLocalCounter(value) {
    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';

    var digits = value.split('');
    for (var i = digits.length - 1; i >= 0; i -= 1) {
      if (digits[i] !== '9') {
        digits[i] = String.fromCharCode(digits[i].charCodeAt(0) + 1);
        return digits.join('');
      }
      digits[i] = '0';
    }

    return '1' + digits.join('');
  }

  function updateLocalCounters() {
    var storage = getStorage();
    if (!storage) return;

    migrateLegacyStorage(storage);

    try {
      var total = incrementLocalCounter(storage.getItem(STORAGE_KEYS.total));
      storage.setItem(STORAGE_KEYS.total, String(total));

      var now = new Date();
      var nowIso = now.toISOString();
      var firstVisit = storage.getItem(STORAGE_KEYS.first);
      if (!validLegacyTimestamp(firstVisit)) {
        firstVisit = nowIso;
        storage.setItem(STORAGE_KEYS.first, firstVisit);
      }

      var lastVisit = nowIso;
      storage.setItem(STORAGE_KEYS.last, lastVisit);

      var today = todayKey(now);
      var visitDays = normalizeVisitDays(loadJSON(STORAGE_KEYS.days, []), today);
      saveJSON(STORAGE_KEYS.days, visitDays);

      var path = window.location.pathname || '/';
      var pageKey = 'ysb-page:' + path;
      var pageCount = incrementLocalCounter(storage.getItem(pageKey));
      storage.setItem(pageKey, String(pageCount));

      writeCounter('local-total', String(total));
      writeCounter('local-page', String(pageCount));
      writeCounter('local-days', String(visitDays.length));
      writeText('local-first', formatDate(firstVisit));
      writeText('local-last', formatDate(lastVisit));
    } catch (err) {
      /* local counters are optional; public statistics should still load */
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    updateLocalCounters();
  });

  window.addEventListener('load', function () {
    setStatus(text('loading'), 'loading');
    loadPublicCounters();
  });
})();
