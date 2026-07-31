const {
  assert,
  path,
  test,
  validateRepository,
  STATS_INTEGER_CONTRACT_ISSUE,
  STATS_ZERO_CONTRACT_ISSUE,
  STATS_UNAVAILABLE_CONTRACT_ISSUE,
  STATS_STATUS_MARKUP_ISSUE,
  STATS_LOADING_CONTRACT_ISSUE,
  STATS_ENDPOINT_MARKUP_ISSUE,
  STATS_LEGACY_RUNTIME_ISSUE,
  STATS_LOCAL_DATE_CONTRACT_ISSUE,
  STATS_LOCAL_HISTORY_CONTRACT_ISSUE,
  STATS_LOCAL_COUNT_CONTRACT_ISSUE,
  STATS_LEGACY_STORAGE_CONTRACT_ISSUE,
  createRepositoryFixture,
  replaceOnce,
  replaceMatching,
} = require('./support');

test('validateRepository reports missing analytics local-counter nodes', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(rootDir, 'analytics.html', 'id="local-total"', 'data-missing-id="local-total"');

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes('analytics.html: stats.js requires #local-total'));
});

test('validateRepository requires the approved Worker endpoint on all stats pages', (t) => {
  const mutations = [
    {
      pattern: '<meta name="stats-api-endpoint" content="https://yan-shibo-site-stats.yan-shibo.workers.dev/v1/visit"/>',
      replacement: '<meta name="stats-api-endpoint" content="https://example.invalid/v1/visit"/>'
    },
    {
      pattern: '<link href="https://yan-shibo-site-stats.yan-shibo.workers.dev" rel="preconnect"/>',
      replacement: '<link href="https://example.invalid" rel="preconnect"/>'
    }
  ];

  for (const mutation of mutations) {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(rootDir, 'index.html', mutation.pattern, mutation.replacement);

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(`index.html: ${STATS_ENDPOINT_MARKUP_ISSUE}`));
  }
});

test('validateRepository requires the stats Worker preconnect inside head', (t) => {
  const rootDir = createRepositoryFixture(t);
  const preconnect = '  <link href="https://yan-shibo-site-stats.yan-shibo.workers.dev" rel="preconnect"/>\n';
  replaceOnce(rootDir, 'index.html', preconnect, '');
  replaceOnce(rootDir, 'index.html', '</body>', `${preconnect}</body>`);

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${STATS_ENDPOINT_MARKUP_ISSUE}`));
});

test('validateRepository limits the stats Worker preconnect to the four stats pages', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'projects.html',
    '  <link href="./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>',
    '  <link href="https://yan-shibo-site-stats.yan-shibo.workers.dev" rel="preconnect"/>\n' +
      '  <link href="./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'projects.html: stats-service preconnect https://yan-shibo-site-stats.yan-shibo.workers.dev is limited to the four stats-enabled pages'
  ));
});

test('validateRepository rejects legacy public-counter runtime references', (t) => {
  const legacyClient = ['ver', 'count'].join('');
  const htmlRoot = createRepositoryFixture(t);
  replaceOnce(
    htmlRoot,
    'index.html',
    '  <link href="./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>',
    `  <script src="https://events.${legacyClient}.one/js"></script>\n` +
      '  <link href="./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>'
  );
  const scriptRoot = createRepositoryFixture(t);
  replaceOnce(
    scriptRoot,
    'assets/js/stats.js',
    '(function () {',
    `(function () {\n  var legacyClient = '${legacyClient}';`
  );

  const htmlResult = validateRepository(htmlRoot);
  const scriptResult = validateRepository(scriptRoot);

  assert.ok(htmlResult.issues.includes(`index.html: ${STATS_LEGACY_RUNTIME_ISSUE}`));
  assert.ok(scriptResult.issues.includes(`assets/js/stats.js: ${STATS_LEGACY_RUNTIME_ISSUE}`));
});

test('validateRepository accepts accessible public stats status regions', (t) => {
  const rootDir = createRepositoryFixture(t);

  const result = validateRepository(rootDir);

  assert.deepEqual(
    result.issues.filter((issue) => issue.endsWith(STATS_STATUS_MARKUP_ISSUE)),
    []
  );
});

test('validateRepository rejects an inaccessible public stats status region', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(rootDir, 'index.html', ' aria-live="polite"', '');

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${STATS_STATUS_MARKUP_ISSUE}`));
});

test('validateRepository accepts the bounded Worker request state machine', (t) => {
  const rootDir = createRepositoryFixture(t);

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(STATS_LOADING_CONTRACT_ISSUE));
});

const workerRequestBoundaryMutations = [
  {
    name: 'timeout duration',
    pattern: '  var PUBLIC_REQUEST_TIMEOUT_MS = 5000;',
    replacement: '  var PUBLIC_REQUEST_TIMEOUT_MS = 5001;'
  },
  {
    name: 'method',
    pattern: "      method: 'POST',",
    replacement: "      method: 'GET',"
  },
  {
    name: 'content type',
    pattern: "      headers: { 'Content-Type': 'application/json' },",
    replacement: "      headers: { 'Content-Type': 'text/plain' },"
  },
  {
    name: 'current path body',
    pattern: "      body: JSON.stringify({ path: window.location.pathname || '/' }),",
    replacement: "      body: JSON.stringify({ path: '/' }),"
  },
  {
    name: 'cache mode',
    pattern: "      cache: 'no-store',",
    replacement: "      cache: 'default',"
  },
  {
    name: 'credentials mode',
    pattern: "      credentials: 'omit'",
    replacement: "      credentials: 'include'"
  },
  {
    name: 'timeout cleanup',
    pattern: '        window.clearTimeout(timer);',
    replacement: '        /* timeout cleanup removed */'
  }
];

test('validateRepository rejects weakened Worker request boundaries', (t) => {
  for (const mutation of workerRequestBoundaryMutations) {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(
      rootDir,
      'assets/js/stats.js',
      mutation.pattern,
      mutation.replacement
    );

    const result = validateRepository(rootDir);

    assert.ok(
      result.issues.includes(STATS_LOADING_CONTRACT_ISSUE),
      mutation.name
    );
  }
});

test('validateRepository rejects weakened Worker response validation', (t) => {
  const mutations = [
    {
      pattern: /  function validCounter\(value\) \{[\s\S]*?\r?\n  \}/,
      replacement: [
        '  function validCounter(value) {',
        '    return /^\\p{Nd}+$/u.test(value);',
        '  }'
      ].join('\n')
    },
    {
      pattern: '/^[0-9]{4}-(?:0[1-9]|1[0-2])$/.test(payload.period)',
      replacement: '/^[0-9]{4}-[0-9]{2}$/.test(payload.period)'
    },
    {
      pattern: 'payload.trackingSince === TRACKING_START_DATE',
      replacement: "typeof payload.trackingSince === 'string'"
    }
  ];

  for (const mutation of mutations) {
    const rootDir = createRepositoryFixture(t);
    if (typeof mutation.pattern === 'string') {
      replaceOnce(rootDir, 'assets/js/stats.js', mutation.pattern, mutation.replacement);
    } else {
      replaceMatching(rootDir, 'assets/js/stats.js', mutation.pattern, mutation.replacement);
    }

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(STATS_INTEGER_CONTRACT_ISSUE));
  }
});

test('validateRepository treats zero as a valid public counter', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /  function validCounter\(value\) \{[\s\S]*?\r?\n  \}/,
    [
      '  function validCounter(value) {',
      "    return typeof value === 'string' && /^[0-9]+$/.test(value) && /[1-9]/.test(value);",
      '  }'
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_ZERO_CONTRACT_ISSUE));
});

test('validateRepository requires failed Worker requests to degrade to warn', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /      \.catch\(function \(\) \{\r?\n        renderUnavailable\(\);\r?\n      \}\)/,
    [
      '      .catch(function () {',
      "        setStatus(text('ok'), 'ok');",
      '      })'
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_UNAVAILABLE_CONTRACT_ISSUE));
});

test('validateRepository keeps local date text outside counter validation', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /    write[A-Za-z]+\('local-first', formatDate\(firstVisit\)\);/,
    "    writeCounter('local-first', formatDate(firstVisit));"
  );
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /    write[A-Za-z]+\('local-last', formatDate\(lastVisit\)\);/,
    "    writeCounter('local-last', formatDate(lastVisit));"
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_LOCAL_DATE_CONTRACT_ISSUE));
});

test('validateRepository accepts canonical local visit history normalization', (t) => {
  const rootDir = createRepositoryFixture(t);

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(STATS_LOCAL_HISTORY_CONTRACT_ISSUE));
});

test('validateRepository rejects loose canonical local visit history behavior', (t) => {
  const mutations = [
    {
      name: 'truthy-only first-visit validation',
      pattern: '      if (!validLegacyTimestamp(firstVisit)) {',
      replacement: '      if (!firstVisit) {'
    },
    {
      name: 'whole-second-only ISO validation',
      pattern: '    return !isNaN(date.getTime()) && date.toISOString() === value;',
      replacement: "    return !isNaN(date.getTime()) && date.toISOString() === value && /\\.000Z$/.test(value);"
    },
    {
      name: 'separate current-time samples',
      pattern: '      var lastVisit = nowIso;',
      replacement: '      var lastVisit = new Date().toISOString();'
    },
    {
      name: 'conditional visit-day normalization',
      pattern: /      var today = todayKey\(now\);\r?\n      var visitDays = normalizeVisitDays\(loadJSON\(STORAGE_KEYS\.days, \[\]\), today\);\r?\n      saveJSON\(STORAGE_KEYS\.days, visitDays\);/,
      replacement: [
        '      var visitDays = loadJSON(STORAGE_KEYS.days, []);',
        '      var today = todayKey(now);',
        '      if (visitDays.indexOf(today) === -1) {',
        '        visitDays.push(today);',
        '        if (visitDays.length > 365) {',
        '          visitDays = visitDays.slice(-365);',
        '        }',
        '        saveJSON(STORAGE_KEYS.days, visitDays);',
        '      }'
      ].join('\n')
    },
    {
      name: 'skip unchanged visit-day persistence',
      pattern: '      saveJSON(STORAGE_KEYS.days, visitDays);',
      replacement: [
        '      var storedVisitDays = loadJSON(STORAGE_KEYS.days, []);',
        '      if (JSON.stringify(storedVisitDays) !== JSON.stringify(visitDays)) {',
        '        saveJSON(STORAGE_KEYS.days, visitDays);',
        '      }'
      ].join('\n')
    },
    {
      name: 'calendar-normalized visit days',
      pattern: '    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;',
      replacement: '    return !isNaN(date.getTime());'
    },
    {
      name: 'reject valid non-today leap day',
      pattern: '    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;',
      replacement: "    return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value !== '2020-02-29';"
    },
    {
      name: 'sort instead of stable order',
      pattern: '    normalized.push(today);',
      replacement: [
        '    normalized.sort();',
        '    normalized.push(today);'
      ].join('\n')
    },
    {
      name: 'last duplicate wins',
      pattern: '      if (!validLegacyDay(day) || day === today || seen[day]) continue;',
      replacement: [
        '      if (!validLegacyDay(day) || day === today) continue;',
        '      if (seen[day]) normalized.splice(normalized.indexOf(day), 1);'
      ].join('\n')
    },
    {
      name: 'separate today sample',
      pattern: '      var today = todayKey(now);',
      replacement: '      var today = todayKey();'
    }
  ];

  for (const mutation of mutations) {
    const rootDir = createRepositoryFixture(t);
    if (typeof mutation.pattern === 'string') {
      replaceOnce(rootDir, 'assets/js/stats.js', mutation.pattern, mutation.replacement);
    } else {
      replaceMatching(rootDir, 'assets/js/stats.js', mutation.pattern, mutation.replacement);
    }

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(STATS_LOCAL_HISTORY_CONTRACT_ISSUE), mutation.name);
  }
});

test('validateRepository accepts only lossless canonical localStorage counter increments', (t) => {
  const rootDir = createRepositoryFixture(t);

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(STATS_LOCAL_COUNT_CONTRACT_ISSUE));

  const commentRoot = createRepositoryFixture(t);
  replaceOnce(
    commentRoot,
    'assets/js/stats.js',
    '  function incrementLocalCounter(value) {',
    [
      '  function incrementLocalCounter(value) {',
      '    /* A comment containing `Number(digit)` is not executable. */'
    ].join('\n')
  );

  const commentResult = validateRepository(commentRoot);

  assert.ok(!commentResult.issues.includes(STATS_LOCAL_COUNT_CONTRACT_ISSUE));
});

const numericCounterMutations = [
  {
    name: 'Number',
    body: "    return String(Number(value || '0') + 1);"
  },
  {
    name: 'parseInt',
    body: "    return String(parseInt(value || '0', 10) + 1);"
  },
  {
    name: 'per-digit Number',
    body: [
      "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
      "    var digits = value.split('');",
      '    for (var i = digits.length - 1; i >= 0; i -= 1) {',
      "      if (digits[i] !== '9') {",
      '        digits[i] = String(Number(digits[i]) + 1);',
      "        return digits.join('');",
      '      }',
      "      digits[i] = '0';",
      '    }',
      "    return '1' + digits.join('');"
    ].join('\n')
  },
  {
    name: 'per-digit parseInt',
    body: [
      "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
      "    var digits = value.split('');",
      '    for (var i = digits.length - 1; i >= 0; i -= 1) {',
      "      if (digits[i] !== '9') {",
      '        digits[i] = String(parseInt(digits[i], 10) + 1);',
      "        return digits.join('');",
      '      }',
      "      digits[i] = '0';",
      '    }',
      "    return '1' + digits.join('');"
    ].join('\n')
  },
  {
    name: 'comment-separated Number',
    body: [
      "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
      "    var digits = value.split('');",
      '    for (var i = digits.length - 1; i >= 0; i -= 1) {',
      "      if (digits[i] !== '9') {",
      '        digits[i] = String(Number/* exact digit */(digits[i]) + 1);',
      "        return digits.join('');",
      '      }',
      "      digits[i] = '0';",
      '    }',
      "    return '1' + digits.join('');"
    ].join('\n')
  },
  {
    name: 'template interpolation Number',
    body: [
      "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
      "    var digits = value.split('');",
      '    for (var i = digits.length - 1; i >= 0; i -= 1) {',
      "      if (digits[i] !== '9') {",
      '        digits[i] = `${Number(digits[i]) + 1}`;',
      "        return digits.join('');",
      '      }',
      "      digits[i] = '0';",
      '    }',
      "    return '1' + digits.join('');"
    ].join('\n')
  },
  {
    name: 'parseInt alias',
    body: [
      "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
      '    var toInteger = parseInt;',
      "    var digits = value.split('');",
      '    for (var i = digits.length - 1; i >= 0; i -= 1) {',
      "      if (digits[i] !== '9') {",
      '        digits[i] = String(toInteger(digits[i], 10) + 1);',
      "        return digits.join('');",
      '      }',
      "      digits[i] = '0';",
      '    }',
      "    return '1' + digits.join('');"
    ].join('\n')
  },
  {
    name: 'per-digit parseFloat',
    body: [
      "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
      "    var digits = value.split('');",
      '    for (var i = digits.length - 1; i >= 0; i -= 1) {',
      "      if (digits[i] !== '9') {",
      '        digits[i] = String(parseFloat(digits[i]) + 1);',
      "        return digits.join('');",
      '      }',
      "      digits[i] = '0';",
      '    }',
      "    return '1' + digits.join('');"
    ].join('\n')
  },
  {
    name: 'decimal BigInt literal',
    body: [
      "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
      '    var zero = 0n;',
      "    var digits = value.split('');",
      '    for (var i = digits.length - 1; i >= 0; i -= 1) {',
      "      if (digits[i] !== '9') {",
      '        digits[i] = String.fromCharCode(digits[i].charCodeAt(0) + 1);',
      "        return digits.join('');",
      '      }',
      "      digits[i] = '0';",
      '    }',
      "    return '1' + digits.join('');"
    ].join('\n')
  },
  {
    name: 'hexadecimal BigInt literal',
    body: [
      "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
      '    var unused = 0x0n;',
      "    var digits = value.split('');",
      '    for (var i = digits.length - 1; i >= 0; i -= 1) {',
      "      if (digits[i] !== '9') {",
      '        digits[i] = String.fromCharCode(digits[i].charCodeAt(0) + 1);',
      "        return digits.join('');",
      '      }',
      "      digits[i] = '0';",
      '    }',
      "    return '1' + digits.join('');"
    ].join('\n')
  },
  {
    name: 'separated BigInt literals',
    body: [
      "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
      '    var unused = [0b1_0n, 0o1_0n, 1_0n];',
      "    var digits = value.split('');",
      '    for (var i = digits.length - 1; i >= 0; i -= 1) {',
      "      if (digits[i] !== '9') {",
      '        digits[i] = String.fromCharCode(digits[i].charCodeAt(0) + 1);',
      "        return digits.join('');",
      '      }',
      "      digits[i] = '0';",
      '    }',
      "    return '1' + digits.join('');"
    ].join('\n')
  }
];

function assertNumericCounterMutations(t, mutations) {
  for (const mutation of mutations) {
    const rootDir = createRepositoryFixture(t);
    replaceMatching(
      rootDir,
      'assets/js/stats.js',
      /  function incrementLocalCounter\(value\) \{[\s\S]*?\r?\n  \}/,
      [
        '  function incrementLocalCounter(value) {',
        mutation.body,
        '  }'
      ].join('\n')
    );

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(STATS_LOCAL_COUNT_CONTRACT_ISSUE), mutation.name);
  }
}

test('validateRepository rejects direct numeric counter increments', (t) => {
  assertNumericCounterMutations(t, numericCounterMutations.slice(0, 6));
});

test('validateRepository rejects delegated increments and crossed counter wiring', (t) => {
  assertNumericCounterMutations(t, numericCounterMutations.slice(6));

  const crossedWiringRoot = createRepositoryFixture(t);
  replaceOnce(
    crossedWiringRoot,
    'assets/js/stats.js',
    "      writeCounter('local-page', String(pageCount));",
    "      writeCounter('local-page', String(total));"
  );

  const crossedWiringResult = validateRepository(crossedWiringRoot);

  assert.ok(crossedWiringResult.issues.includes(STATS_LOCAL_COUNT_CONTRACT_ISSUE));

  const crossedStateRoot = createRepositoryFixture(t);
  replaceOnce(
    crossedStateRoot,
    'assets/js/stats.js',
    '      var pageCount = incrementLocalCounter(storage.getItem(pageKey));',
    '      var pageCount = total;'
  );

  const crossedStateResult = validateRepository(crossedStateRoot);

  assert.ok(crossedStateResult.issues.includes(STATS_LOCAL_COUNT_CONTRACT_ISSUE));

  const delegatedRoot = createRepositoryFixture(t);
  replaceOnce(
    delegatedRoot,
    'assets/js/stats.js',
    '  function incrementLocalCounter(value) {',
    [
      '  function nextDigit(value) {',
      '    return String(Number(value) + 1);',
      '  }',
      '',
      '  function incrementLocalCounter(value) {'
    ].join('\n')
  );
  replaceOnce(
    delegatedRoot,
    'assets/js/stats.js',
    '        digits[i] = String.fromCharCode(digits[i].charCodeAt(0) + 1);',
    '        digits[i] = nextDigit(digits[i]);'
  );

  const delegatedResult = validateRepository(delegatedRoot);

  assert.ok(delegatedResult.issues.includes(STATS_LOCAL_COUNT_CONTRACT_ISSUE));
});

test('validateRepository rejects loose canonical localStorage counter formats', (t) => {
  const formatMutations = [
    {
      name: 'leading zero',
      condition: "    if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return '1';",
      digits: "    var digits = value.split('');"
    },
    {
      name: 'trimmed whitespace',
      condition: "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value.trim())) return '1';",
      digits: "    var digits = value.trim().split('');"
    },
    {
      name: 'optional plus',
      condition: "    if (typeof value !== 'string' || !/^\\+?(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
      digits: "    var digits = value.replace(/^\\+/, '').split('');"
    }
  ];

  for (const mutation of formatMutations) {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(
      rootDir,
      'assets/js/stats.js',
      [
        "    if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(value)) return '1';",
        '',
        "    var digits = value.split('');"
      ].join('\n'),
      [mutation.condition, '', mutation.digits].join('\n')
    );

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(STATS_LOCAL_COUNT_CONTRACT_ISSUE), mutation.name);
  }
});

test('validateRepository migrates valid legacy localStorage counters safely', (t) => {
  const rootDir = createRepositoryFixture(t);

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(STATS_LEGACY_STORAGE_CONTRACT_ISSUE));
});

test('validateRepository rejects an omitted legacy localStorage migration field', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /  function getStorage\(\) \{[\s\S]*?\r?\n  \}/,
    [
      '  function getStorage() {',
      '    var storage = window.localStorage;',
      '    return {',
      '      getItem: function (key) {',
      "        return key === 'ysb_visit_total' ? null : storage.getItem(key);",
      '      },',
      '      setItem: function (key, value) {',
      '        storage.setItem(key, value);',
      '      }',
      '    };',
      '  }'
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_LEGACY_STORAGE_CONTRACT_ISSUE));
});

test('validateRepository rejects legacy localStorage overwriting canonical fields', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /(  function updateLocalCounters\(\) \{\r?\n    var storage = getStorage\(\);\r?\n    if \(!storage\) return;\r?\n)/,
    [
      '$1',
      "    if (storage.getItem('ysb-visit-total') === '7') {",
      "      storage.setItem('ysb-visit-total', storage.getItem('ysb_visit_total'));",
      "      storage.setItem('ysb-visit-total', '7');",
      '    }',
      ''
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_LEGACY_STORAGE_CONTRACT_ISSUE));
});

test('validateRepository rejects transient legacy localStorage page counter migration', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /(  function updateLocalCounters\(\) \{\r?\n    var storage = getStorage\(\);\r?\n    if \(!storage\) return;\r?\n)/,
    [
      '$1',
      "    storage.setItem('ysb-page:/analytics.html', storage.getItem('ysb_page:/analytics.html'));",
      "    storage.setItem('ysb-page:/analytics.html', '0');",
      ''
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_LEGACY_STORAGE_CONTRACT_ISSUE));
});

test('validateRepository rejects activation of invalid legacy localStorage data', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /(  function updateLocalCounters\(\) \{\r?\n    var storage = getStorage\(\);\r?\n    if \(!storage\) return;\r?\n)/,
    [
      '$1',
      "    if (storage.getItem('ysb-visit-total') === null && storage.getItem('ysb_visit_total') !== null) {",
      "      storage.setItem('ysb-visit-total', storage.getItem('ysb_visit_total'));",
      '    }',
      ''
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_LEGACY_STORAGE_CONTRACT_ISSUE));
});

test('validateRepository rejects deleting migrated legacy localStorage keys', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /(      storage\.setItem\(canonicalKey, value\);\r?\n)/,
    [
      '$1',
      '      var legacyValue = storage.getItem(legacyKey);',
      '      storage.removeItem(legacyKey);',
      '      storage.setItem(legacyKey, legacyValue);',
      ''
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_LEGACY_STORAGE_CONTRACT_ISSUE));
});

test('validateRepository rejects legacy localStorage migration without per-field exception isolation', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /  function migrateLegacyField\(storage, canonicalKey, legacyKey, validate\) \{[\s\S]*?\r?\n  \}/,
    [
      '  function migrateLegacyField(storage, canonicalKey, legacyKey, validate) {',
      '    if (storage.getItem(canonicalKey) !== null) return;',
      '    var value = storage.getItem(legacyKey);',
      '    if (value === null || !validate(value)) return;',
      '    storage.setItem(canonicalKey, value);',
      '  }'
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_LEGACY_STORAGE_CONTRACT_ISSUE));
});

test('validateRepository rejects loose legacy localStorage value shapes', (t) => {
  const mutations = [
    {
      name: 'leading-zero and unsafe totals',
      pattern: /  function validLegacyTotal\(value\) \{[\s\S]*?\r?\n  \}/,
      replacement: [
        '  function validLegacyTotal(value) {',
        '    return /^[0-9]+$/.test(value);',
        '  }'
      ].join('\n')
    },
    {
      name: 'non-canonical ISO timestamps',
      pattern: /  function validLegacyTimestamp\(value\) \{[\s\S]*?\r?\n  \}/,
      replacement: [
        '  function validLegacyTimestamp(value) {',
        '    var date = new Date(value);',
        '    if (isNaN(date.getTime())) return false;',
        '    var iso = date.toISOString();',
        "    return value === iso || value === iso.replace('.000Z', 'Z');",
        '  }'
      ].join('\n')
    },
    {
      name: 'duplicate visit days',
      pattern: '        if (!validLegacyDay(days[i]) || seen[days[i]]) return false;',
      replacement: '        if (!validLegacyDay(days[i])) return false;'
    }
  ];

  for (const mutation of mutations) {
    const rootDir = createRepositoryFixture(t);
    if (typeof mutation.pattern === 'string') {
      replaceOnce(rootDir, 'assets/js/stats.js', mutation.pattern, mutation.replacement);
    } else {
      replaceMatching(rootDir, 'assets/js/stats.js', mutation.pattern, mutation.replacement);
    }
    const result = validateRepository(rootDir);
    assert.ok(
      result.issues.includes(STATS_LEGACY_STORAGE_CONTRACT_ISSUE),
      mutation.name
    );
  }
});
