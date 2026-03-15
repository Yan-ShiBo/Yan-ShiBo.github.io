
(function () {
  var PUBLIC_SCRIPT_CANDIDATES = [
    'https://busuanzi.icodeq.com/busuanzi.pure.mini.js',
    'https://cdn.jsdelivr.net/gh/sukkaw/busuanzi@2.3/bsz.pure.mini.js',
    'https://cdn.jsdelivr.net/npm/busuanzi@2.3.0'
  ];

  var STORAGE_KEYS = {
    total: 'ysb-visit-total',
    first: 'ysb-visit-first',
    last: 'ysb-visit-last',
    days: 'ysb-visit-days'
  };

  function locale() {
    return document.documentElement.lang && document.documentElement.lang.toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en';
  }

  var i18n = {
    zh: {
      loading: '正在获取公开访问统计…',
      ok: '公开访问统计已成功载入',
      unavailable: '公开访问统计暂不可用，你的本机记录仍可正常显示。',
      publicSitePv: '公开全站访问量',
      publicSiteUv: '公开独立访客',
      publicPagePv: '公开当前页访问量'
    },
    en: {
      loading: 'Loading public counters…',
      ok: 'Public counters loaded successfully',
      unavailable: 'Public counters are unavailable right now. Local visit records still work normally.',
      publicSitePv: 'Public site PV',
      publicSiteUv: 'Public site UV',
      publicPagePv: 'Public page PV'
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

  function readCounter(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return (el.textContent || '').trim();
  }

  function validCounter(value) {
    return !!value && value !== '--' && value !== 'null' && value !== 'undefined' && value !== 'NaN' && value !== 'Loading';
  }

  function writeValue(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = validCounter(value) ? value : '--';
  }

  function loadPublicScript(index) {
    if (index >= PUBLIC_SCRIPT_CANDIDATES.length) return;
    var script = document.createElement('script');
    script.async = true;
    script.src = PUBLIC_SCRIPT_CANDIDATES[index];
    script.onerror = function () {
      loadPublicScript(index + 1);
    };
    document.head.appendChild(script);
  }

  function syncPublicCounters() {
    var sitePv = readCounter('busuanzi_value_site_pv');
    var siteUv = readCounter('busuanzi_value_site_uv');
    var pagePv = readCounter('busuanzi_value_page_pv');

    var found = validCounter(sitePv) || validCounter(siteUv) || validCounter(pagePv);

    writeValue('site-pv', sitePv);
    writeValue('site-uv', siteUv);
    writeValue('page-pv', pagePv);

    return found;
  }

  function loadJSON(key, defaultValue) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      return JSON.parse(raw);
    } catch (err) {
      return defaultValue;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
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

  function todayKey() {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function updateLocalCounters() {
    if (!window.localStorage) return;

    var total = parseInt(localStorage.getItem(STORAGE_KEYS.total) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEYS.total, String(total));

    var firstVisit = localStorage.getItem(STORAGE_KEYS.first);
    if (!firstVisit) {
      firstVisit = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.first, firstVisit);
    }

    var lastVisit = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.last, lastVisit);

    var visitDays = loadJSON(STORAGE_KEYS.days, []);
    var today = todayKey();
    if (visitDays.indexOf(today) === -1) {
      visitDays.push(today);
      saveJSON(STORAGE_KEYS.days, visitDays);
    }

    var path = window.location.pathname || '/';
    var pageKey = 'ysb-page:' + path;
    var pageCount = parseInt(localStorage.getItem(pageKey) || '0', 10) + 1;
    localStorage.setItem(pageKey, String(pageCount));

    writeValue('local-total', String(total));
    writeValue('local-page', String(pageCount));
    writeValue('local-days', String(visitDays.length));
    writeValue('local-first', formatDate(firstVisit));
    writeValue('local-last', formatDate(lastVisit));
  }

  document.addEventListener('DOMContentLoaded', function () {
    updateLocalCounters();

    setStatus(text('loading'), 'warn');
    loadPublicScript(0);

    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      if (syncPublicCounters()) {
        setStatus(text('ok'), 'ok');
        window.clearInterval(timer);
        return;
      }
      if (tries >= 18) {
        setStatus(text('unavailable'), 'warn');
        window.clearInterval(timer);
      }
    }, 800);
  });
})();
