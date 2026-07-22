const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  resolveLocalReference,
  stripUrlDecorations,
  validateRepository
} = require('./validate-site');

const COPIED_FIXTURE_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.ico',
  '.js',
  '.png',
  '.txt',
  '.webmanifest',
  '.xml'
]);

const MENU_CLEANUP_ISSUE =
  'assets/js/site.js: mobile menu cleanup must share the (max-width: 833px) breakpoint predicate';
const MOBILE_CSS_BREAKPOINT_ISSUE =
  'assets/css/site.css: mobile navigation rules must share one (max-width: 833px) media block';
const RESUME_OVERFLOW_CSS_ISSUE =
  'assets/css/site.css: resume cards, contact values, keyword tags, and long actions must remain shrinkable on narrow viewports';
const PROFILE_CONTACTS_ISSUE =
  'profile contact panel must list both approved email links and exclude phone and WeChat details';
const PROFILE_CONTACT_CSS_ISSUE =
  'assets/css/site.css: profile email links and summary tags must remain shrinkable and wrappable on narrow viewports';
const PROOF_RAIL_CSS_ISSUE =
  'assets/css/site.css: proof rails must use one card size and expose grab and dragging states';
const PROOF_RAIL_DRAG_ISSUE =
  'assets/js/site.js: proof rails must support mouse drag scrolling without opening evidence after a drag';
const HOME_HERO_MOBILE_CSS_ISSUE =
  'assets/css/site.css: mobile home hero cards must use the unified full-width dossier rail and integrated inner groups';
const NOT_FOUND_LOCALIZATION_ISSUE =
  'root 404 must localize /en/... missing routes in place with root-absolute links and shared five-second redirects';
const HOME_QUOTE_INVENTORY_ISSUE =
  'index.html: home quotation copies must include exactly one poem-note and one quote-text';
const HOME_QUOTE_PARITY_ISSUE = 'en/index.html: home quotation copies must match';
const ENGLISH_TERMINOLOGY_ISSUE =
  'en/index.html: English copy uses legacy terminology; replace "graduation design" with "undergraduate capstone project"';
const MODAL_INERT_RESTORE_ISSUE =
  'assets/js/site.js: modal background cleanup must restore each element\'s pre-existing inert state';
const STATS_INTEGER_CONTRACT_ISSUE =
  'assets/js/stats.js: public counters must accept only non-negative ASCII decimal integer text and fall back from invalid provider values';
const STATS_ZERO_CONTRACT_ISSUE =
  'assets/js/stats.js: zero must remain a valid public counter';
const STATS_UNAVAILABLE_CONTRACT_ISSUE =
  'assets/js/stats.js: invalid public counters must render -- and end in warn state';
const STATS_STATUS_MARKUP_ISSUE =
  'stats status must start in loading state and expose a polite atomic status live region';
const STATS_LOADING_CONTRACT_ISSUE =
  'assets/js/stats.js: public counter loading must poll every 250 ms, settle within 8 seconds, and expose loading, partial, and final states';
const STATS_LOCAL_DATE_CONTRACT_ISSUE =
  'assets/js/stats.js: local visit dates must remain formatted text';
const STATS_LOCAL_HISTORY_CONTRACT_ISSUE =
  'assets/js/stats.js: canonical local visit history must share one current timestamp, use exact ISO values, unique real days ending today, a 365-day cap, and matching rendered values';
const STATS_LOCAL_COUNT_CONTRACT_ISSUE =
  'assets/js/stats.js: canonical local visit counters must use exact non-negative ASCII decimals, lossless increment, and invalid-state recovery';
const STATS_LEGACY_STORAGE_CONTRACT_ISSUE =
  'assets/js/stats.js: legacy local history must transition safely without overriding canonical values, deleting legacy keys, or activating invalid data';
const MANIFEST_INSTALL_ICONS = [
  {
    src: '/assets/icons/app-icon-192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: '/assets/icons/app-icon-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any'
  }
];
const MANIFEST_FILES = ['manifest.webmanifest', 'manifest.en.webmanifest'];
const MANIFEST_ICON_INVENTORY_ISSUE =
  'icons must exactly match the install icon inventory by src';
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const FAVICON_SIZES = ['16x16', '32x32', '48x48', '256x256'];

function createStructurallyValidPng(width, height) {
  const data = Buffer.alloc(45);
  PNG_SIGNATURE.copy(data, 0);
  data.writeUInt32BE(13, 8);
  data.write('IHDR', 12, 4, 'ascii');
  data.writeUInt32BE(width, 16);
  data.writeUInt32BE(height, 20);
  data[24] = 8;
  data[25] = 6;
  data.writeUInt32BE(0, 33);
  data.write('IEND', 37, 4, 'ascii');
  return data;
}

function createRepositoryFixture(t) {
  const sourceRoot = path.resolve(__dirname, '..');
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ysb-site-fixture-'));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

  function mirrorDirectory(sourceDirectory, targetDirectory) {
    fs.mkdirSync(targetDirectory, { recursive: true });
    for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const sourcePath = path.join(sourceDirectory, entry.name);
      const targetPath = path.join(targetDirectory, entry.name);
      if (entry.isDirectory()) {
        mirrorDirectory(sourcePath, targetPath);
      } else if (COPIED_FIXTURE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        fs.copyFileSync(sourcePath, targetPath);
      } else {
        fs.writeFileSync(targetPath, '');
      }
    }
  }

  mirrorDirectory(sourceRoot, fixtureRoot);
  return fixtureRoot;
}

function replaceOnce(rootDir, relativePath, searchValue, replacement) {
  const absolutePath = path.join(rootDir, relativePath);
  const original = fs.readFileSync(absolutePath, 'utf8');
  assert.ok(original.includes(searchValue), `${relativePath} must contain the fixture text`);
  fs.writeFileSync(absolutePath, original.replace(searchValue, replacement));
}

function replaceMatching(rootDir, relativePath, pattern, replacement) {
  const absolutePath = path.join(rootDir, relativePath);
  const original = fs.readFileSync(absolutePath, 'utf8');
  assert.match(original, pattern, `${relativePath} must contain the fixture pattern`);
  fs.writeFileSync(absolutePath, original.replace(pattern, replacement));
}

function readManifest(rootDir, file) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, file), 'utf8'));
}

function writeManifest(rootDir, file, manifest) {
  fs.writeFileSync(
    path.join(rootDir, file),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

function setManifestIcons(rootDir, file, icons) {
  const manifest = readManifest(rootDir, file);
  manifest.icons = icons;
  writeManifest(rootDir, file, manifest);
}

function sortManifestIconsBySrc(icons) {
  return [...icons].sort((left, right) => left.src.localeCompare(right.src));
}

function cloneInstallIcons() {
  return MANIFEST_INSTALL_ICONS.map((icon) => ({ ...icon }));
}

function assertManifestInventoryMutationRejected(t, mutateIcons) {
  for (const file of MANIFEST_FILES) {
    const rootDir = createRepositoryFixture(t);
    const icons = cloneInstallIcons();
    mutateIcons(icons);
    setManifestIcons(rootDir, file, icons);

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(
      `${file}: ${MANIFEST_ICON_INVENTORY_ISSUE}`
    ));
  }
}

function mutateBinaryFile(rootDir, relativePath, mutate) {
  const absolutePath = path.join(rootDir, relativePath);
  const data = fs.readFileSync(absolutePath);
  mutate(data);
  fs.writeFileSync(absolutePath, data);
}

function readIcoEntry(data, index) {
  const entryOffset = 6 + index * 16;
  return {
    entryOffset,
    width: data[entryOffset] || 256,
    height: data[entryOffset + 1] || 256,
    imageBytes: data.readUInt32LE(entryOffset + 8),
    imageOffset: data.readUInt32LE(entryOffset + 12)
  };
}

function appendIcoPngEntry(data, width, height, png) {
  const oldCount = data.readUInt16LE(4);
  const oldDirectoryEnd = 6 + oldCount * 16;
  const newDirectoryEnd = oldDirectoryEnd + 16;
  const result = Buffer.alloc(data.length + 16 + png.length);

  data.copy(result, 0, 0, oldDirectoryEnd);
  data.copy(result, newDirectoryEnd, oldDirectoryEnd);
  result.writeUInt16LE(oldCount + 1, 4);
  for (let index = 0; index < oldCount; index += 1) {
    const entry = readIcoEntry(data, index);
    result.writeUInt32LE(entry.imageOffset + 16, entry.entryOffset + 12);
  }

  const entryOffset = 6 + oldCount * 16;
  const imageOffset = data.length + 16;
  result[entryOffset] = width === 256 ? 0 : width;
  result[entryOffset + 1] = height === 256 ? 0 : height;
  result.writeUInt16LE(1, entryOffset + 4);
  result.writeUInt16LE(32, entryOffset + 6);
  result.writeUInt32LE(png.length, entryOffset + 8);
  result.writeUInt32LE(imageOffset, entryOffset + 12);
  png.copy(result, imageOffset);
  return result;
}

function validateSiteScriptFixture(t, sourceLines) {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(rootDir, 'assets/js/site.js'),
    [...sourceLines, ''].join('\n')
  );
  return validateRepository(rootDir);
}

function validateModalSiteScriptFixture(t, sourceLines) {
  return validateSiteScriptFixture(t, [
    ...sourceLines,
    'function closeLightbox() {',
    '  setBackgroundInert(false);',
    '}',
    'function openLightbox() {',
    '  setBackgroundInert(true, [overlay]);',
    '}'
  ]);
}

function modalInertFunctionLines(options = {}) {
  const {
    activationReturn = 'return;',
    ariaRestoreCondition = 'previousAria !== null',
    cleanupPrefix = [],
    cleanupLines = [
      'var previousAria = element.getAttribute("data-modal-aria-hidden");',
      'var wasInert = element.getAttribute("data-modal-was-inert") === "true";',
      'if (previousAria === "__unset__") {',
      '  element.removeAttribute("aria-hidden");',
      `} else if (${ariaRestoreCondition}) {`,
      '  element.setAttribute("aria-hidden", previousAria);',
      '}',
      'element.removeAttribute("data-modal-inert");',
      'element.removeAttribute("data-modal-aria-hidden");',
      'element.removeAttribute("data-modal-was-inert");',
      'element.toggleAttribute("inert", wasInert);',
      'element.inert = wasInert;'
    ],
    cleanupSuffix = [],
    inertSnapshotExpression =
      'element.hasAttribute("inert") || element.inert',
    snapshotSuffix = []
  } = options;

  return [
    'function setElementInert(element, active) {',
    '  if (!element) return;',
    '  if (active) {',
    '    if (!element.hasAttribute("data-modal-inert")) {',
    '      element.setAttribute("data-modal-inert", "");',
    '      element.setAttribute("data-modal-aria-hidden",',
    '        element.hasAttribute("aria-hidden") ? element.getAttribute("aria-hidden") : "__unset__");',
    '      element.setAttribute("data-modal-was-inert",',
    `        ${inertSnapshotExpression} ? "true" : "false");`,
    ...snapshotSuffix.map((line) => `      ${line}`),
    '    }',
    '    element.setAttribute("aria-hidden", "true");',
    '    element.setAttribute("inert", "");',
    '    element.inert = true;',
    ...(activationReturn === null ? [] : [`    ${activationReturn}`]),
    '  }',
    '  if (!element.hasAttribute("data-modal-inert")) return;',
    ...cleanupPrefix.map((line) => `  ${line}`),
    ...cleanupLines.map((line) => `  ${line}`),
    ...cleanupSuffix.map((line) => `  ${line}`),
    '}'
  ];
}

function snapshotFiles(rootDir) {
  const snapshot = {};

  function walk(absoluteDirectory, relativeDirectory) {
    for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const relativePath = toPosix(path.join(relativeDirectory, entry.name));
      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
      } else if (entry.isFile()) {
        snapshot[relativePath] = crypto
          .createHash('sha256')
          .update(fs.readFileSync(absolutePath))
          .digest('hex');
      }
    }
  }

  walk(rootDir, '');
  return snapshot;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

const STRUCTURED_PERSON_ID = 'https://yan-shibo.github.io/#person';
const STRUCTURED_WEBSITE_ID = 'https://yan-shibo.github.io/#website';
const STRUCTURED_PROJECT_IDS = [
  'https://yan-shibo.github.io/#project-persevere-study',
  'https://yan-shibo.github.io/#project-mic-family'
];
const STRUCTURED_RESEARCH_IDS = [
  'https://yan-shibo.github.io/#research-controller-updates',
  'https://yan-shibo.github.io/#research-pac-approximation',
  'https://yan-shibo.github.io/#research-certificate-templates',
  'https://yan-shibo.github.io/#research-complex-systems'
];
const STRUCTURED_SCRIPT_PATTERN =
  /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function readStructuredData(rootDir, relativePath) {
  const html = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
  const matches = Array.from(html.matchAll(STRUCTURED_SCRIPT_PATTERN));
  assert.equal(matches.length, 1, `${relativePath} must contain one JSON-LD fixture block`);
  return JSON.parse(matches[0][1]);
}

function writeStructuredData(rootDir, relativePath, value) {
  replaceMatching(
    rootDir,
    relativePath,
    STRUCTURED_SCRIPT_PATTERN,
    (fullMatch) => fullMatch.replace(/>[\s\S]*<\/script>$/i, `>${JSON.stringify(value)}</script>`)
  );
}

function mutateStructuredData(rootDir, relativePath, mutate) {
  const value = readStructuredData(rootDir, relativePath);
  mutate(value);
  writeStructuredData(rootDir, relativePath, value);
}

function findStructuredNode(value, id) {
  const node = value['@graph'].find((candidate) => candidate['@id'] === id);
  assert.ok(node, `fixture graph must contain ${id}`);
  return node;
}

function replaceStructuredMarkup(rootDir, relativePath, transform) {
  const absolutePath = path.join(rootDir, relativePath);
  const html = fs.readFileSync(absolutePath, 'utf8');
  const matches = Array.from(html.matchAll(STRUCTURED_SCRIPT_PATTERN));
  assert.equal(matches.length, 1, `${relativePath} must contain one JSON-LD fixture block`);
  fs.writeFileSync(
    absolutePath,
    html.slice(0, matches[0].index) +
      transform(matches[0][0], matches[0][1]) +
      html.slice(matches[0].index + matches[0][0].length)
  );
}

function assertStructuredIssue(result, relativePath, fragment) {
  assert.ok(
    result.issues.some((issue) => (
      issue.startsWith(`${relativePath}: `) && issue.includes(fragment)
    )),
    `expected ${relativePath} structured data issue containing ${JSON.stringify(fragment)}; received:\n${result.issues.join('\n')}`
  );
}

test('stripUrlDecorations removes query strings and fragments', () => {
  assert.equal(
    stripUrlDecorations('./docs/Shibo-Yan-Resume.pdf#view=FitH'),
    './docs/Shibo-Yan-Resume.pdf'
  );
  assert.equal(
    stripUrlDecorations('profile.html?lang=zh-CN#undergraduate'),
    'profile.html'
  );
});

test('resolveLocalReference accepts an existing file with a PDF fragment', (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ysb-site-validator-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  fs.mkdirSync(path.join(rootDir, 'docs'));
  fs.writeFileSync(path.join(rootDir, 'resume.html'), '<main id="main-content"></main>');
  fs.writeFileSync(path.join(rootDir, 'docs', 'resume.pdf'), 'fixture');

  const result = resolveLocalReference(
    rootDir,
    'resume.html',
    './docs/resume.pdf#view=FitH'
  );

  assert.equal(result.kind, 'local');
  assert.equal(result.exists, true);
  assert.equal(result.relativePath, 'docs/resume.pdf');
});

test('resolveLocalReference preserves question marks inside fragments', (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ysb-fragment-validator-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(rootDir, 'index.html'), '<main id="section?mode=full"></main>');

  const result = resolveLocalReference(
    rootDir,
    'index.html',
    'index.html#section?mode=full'
  );

  assert.equal(result.fragment, 'section?mode=full');
});

test('root 404 declares bilingual deep-path localization hooks', () => {
  const html = fs.readFileSync(path.resolve(__dirname, '..', '404.html'), 'utf8');

  assert.match(
    html,
    /<body\b[^>]*\bdata-not-found-page\b[^>]*\bdata-not-found-localizable\b[^>]*>/i
  );
  assert.match(html, /data-not-found-en-text="Page not found\."/);
  assert.match(html, /data-not-found-en-href="\/en\/index\.html"/);
  assert.match(html, /<link\b[^>]*href="\/assets\/css\/site\.css"/i);
  assert.match(html, /<script\b[^>]*src="\/assets\/js\/site\.js"/i);
});

test('validateRepository requires the root 404 localization marker', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    '404.html',
    ' data-not-found-localizable=""',
    ' data-missing-not-found-localizable=""'
  );

  const result = validateRepository(rootDir);
  assert.ok(result.issues.includes(`404.html: ${NOT_FOUND_LOCALIZATION_ISSUE}`));
});

test('validateRepository rejects relative root 404 resources', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    '404.html',
    'href="/assets/css/site.css"',
    'href="./assets/css/site.css"'
  );

  const result = validateRepository(rootDir);
  assert.ok(result.issues.includes(`404.html: ${NOT_FOUND_LOCALIZATION_ISSUE}`));
});

test('validateRepository rejects an unpaired root 404 English mapping', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    '404.html',
    'data-not-found-en-text="Page not found."',
    'data-missing-not-found-en-text="Page not found."'
  );

  const result = validateRepository(rootDir);
  assert.ok(result.issues.includes(`404.html: ${NOT_FOUND_LOCALIZATION_ISSUE}`));
});

test('validateRepository rejects root 404 English navigation drift', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    '404.html',
    /data-not-found-en-href="\/en\/index\.html"/g,
    'data-not-found-en-href="/index.html"'
  );

  const result = validateRepository(rootDir);
  assert.ok(result.issues.includes(`404.html: ${NOT_FOUND_LOCALIZATION_ISSUE}`));
});

test('validateRepository rejects root 404 English visible-text drift from the physical page', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    '404.html',
    'data-not-found-en-text="Home">',
    'data-not-found-en-text="Start">'
  );

  const result = validateRepository(rootDir);
  assert.ok(result.issues.includes(`404.html: ${NOT_FOUND_LOCALIZATION_ISSUE}`));
});

test('validateRepository rejects root 404 English metadata drift from the physical page', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    '404.html',
    'data-not-found-en-content="Page not found. Return to ShiBo Yan\'s homepage, research, projects, or resume."',
    'data-not-found-en-content="Wrong English description."'
  );

  const result = validateRepository(rootDir);
  assert.ok(result.issues.includes(`404.html: ${NOT_FOUND_LOCALIZATION_ISSUE}`));
});

for (const mutation of [
  {
    name: 'title',
    search: 'data-not-found-en-text="Page Not Found · ShiBo Yan"',
    replacement: 'data-not-found-en-text="Missing · ShiBo Yan"'
  },
  {
    name: 'ARIA label',
    search: 'data-not-found-en-aria-label="Open navigation"',
    replacement: 'data-not-found-en-aria-label="Open menu"'
  },
  {
    name: 'theme label',
    search: 'data-not-found-en-label-dark="Dark"',
    replacement: 'data-not-found-en-label-dark="Night"'
  }
]) {
  test(`validateRepository rejects root 404 English ${mutation.name} drift from the physical page`, (t) => {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(rootDir, '404.html', mutation.search, mutation.replacement);

    const result = validateRepository(rootDir);
    assert.ok(result.issues.includes(`404.html: ${NOT_FOUND_LOCALIZATION_ISSUE}`));
  });
}

test('validateRepository requires exactly one countdown on each 404 page', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    '404.html',
    '</main>',
    '<span data-countdown="">5</span>\n</main>'
  );

  const result = validateRepository(rootDir);
  assert.ok(result.issues.includes(`404.html: ${NOT_FOUND_LOCALIZATION_ISSUE}`));
});

test('validateRepository rejects executable inline scripts on 404 pages', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/404.html',
    '</body>',
    '<script>void 0;</script>\n</body>'
  );

  const result = validateRepository(rootDir);
  assert.ok(result.issues.includes(`en/404.html: ${NOT_FOUND_LOCALIZATION_ISSUE}`));
});

test('validateRepository rejects decoy localization mappings on the physical English 404', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/404.html',
    '<h1>Page not found.</h1>',
    '<h1 data-not-found-en-text="Page not found.">Wrong physical text.</h1>'
  );

  const result = validateRepository(rootDir);
  assert.ok(result.issues.includes(`en/404.html: ${NOT_FOUND_LOCALIZATION_ISSUE}`));
});

for (const mutation of [
  {
    name: 'a missing ordinary-page early return',
    search: "    if (!page) return;\n\n    var rootElement",
    replacement: "\n    var rootElement"
  },
  {
    name: 'an ordinary-page early-return location side effect',
    search: '    if (!page) return;',
    replacement: "    if (!page) { window.location.pathname = '/changed'; return; }"
  },
  {
    name: 'a pre-countdown pathname mutation',
    search: "    var countdown = document.querySelector('[data-countdown]');",
    replacement: "    window.location.pathname = '/changed';\n    var countdown = document.querySelector('[data-countdown]');"
  },
  {
    name: 'a pre-countdown search mutation',
    search: "    var countdown = document.querySelector('[data-countdown]');",
    replacement: "    window.location.search = '?changed=1';\n    var countdown = document.querySelector('[data-countdown]');"
  },
  {
    name: 'a pre-countdown hash mutation',
    search: "    var countdown = document.querySelector('[data-countdown]');",
    replacement: "    window.location.hash = '#changed';\n    var countdown = document.querySelector('[data-countdown]');"
  },
  {
    name: 'a pre-countdown href mutation',
    search: "    var countdown = document.querySelector('[data-countdown]');",
    replacement: "    window.location.href = '/changed';\n    var countdown = document.querySelector('[data-countdown]');"
  },
  {
    name: 'a pre-countdown location replacement',
    search: "    var countdown = document.querySelector('[data-countdown]');",
    replacement: "    window.location = '/changed';\n    var countdown = document.querySelector('[data-countdown]');"
  },
  {
    name: 'a broad English path prefix',
    search: "      ? /^\\/en(?:\\/|$)/.test(window.location.pathname)",
    replacement: "      ? /^\\/en/.test(window.location.pathname)"
  },
  {
    name: 'the wrong English redirect target',
    search: "    var home = usesEnglish ? '/en/' : '/';",
    replacement: "    var home = usesEnglish ? '/' : '/';"
  },
  {
    name: 'a non-five-second countdown interval',
    search: "    }, 1000);\n  }\n\n  function initYear()",
    replacement: "    }, 900);\n  }\n\n  function initYear()"
  },
  {
    name: '404 localization after theme initialization',
    search: "    initNotFoundPage();\n    initTheme();",
    replacement: "    initTheme();\n    initNotFoundPage();"
  }
]) {
  test(`validateRepository rejects ${mutation.name}`, (t) => {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(
      rootDir,
      'assets/js/site.js',
      mutation.search,
      mutation.replacement
    );

    const result = validateRepository(rootDir);
    assert.ok(
      result.issues.includes(`assets/js/site.js: ${NOT_FOUND_LOCALIZATION_ISSUE}`)
    );
  });
}

test('validateRepository accepts the checked-in site baseline', () => {
  const rootDir = path.resolve(__dirname, '..');
  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
  assert.equal(result.summary.htmlFiles, 14);
  assert.equal(result.summary.indexablePages, 12);
  assert.equal(result.summary.sitemapUrls, 12);
});

test('validateRepository accepts approved profile contacts and proof rail interaction', () => {
  const rootDir = path.resolve(__dirname, '..');
  const result = validateRepository(rootDir);

  for (const file of ['profile.html', 'en/profile.html']) {
    assert.ok(!result.issues.includes(`${file}: ${PROFILE_CONTACTS_ISSUE}`));
  }
  assert.ok(!result.issues.includes(PROFILE_CONTACT_CSS_ISSUE));
  assert.ok(!result.issues.includes(PROOF_RAIL_CSS_ISSUE));
  assert.ok(!result.issues.includes(PROOF_RAIL_DRAG_ISSUE));
});

test('validateRepository rejects a missing campus email in either profile language', (t) => {
  const campusEmail = '<a class="tag" href="mailto:yan3425@email.swu.edu.cn"><i aria-hidden="true" class="fa fa-envelope-o"></i> yan3425@email.swu.edu.cn</a>';
  for (const file of ['profile.html', 'en/profile.html']) {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(rootDir, file, campusEmail, '');

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(`${file}: ${PROFILE_CONTACTS_ISSUE}`));
  }
});

test('validateRepository rejects legacy phone details in either profile language', (t) => {
  const campusEmail = '<a class="tag" href="mailto:yan3425@email.swu.edu.cn"><i aria-hidden="true" class="fa fa-envelope-o"></i> yan3425@email.swu.edu.cn</a>';
  for (const file of ['profile.html', 'en/profile.html']) {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(
      rootDir,
      file,
      campusEmail,
      `${campusEmail}<span class="tag"><i aria-hidden="true" class="fa fa-phone"></i> 15603111769</span>`
    );

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(`${file}: ${PROFILE_CONTACTS_ISSUE}`));
  }
});

test('validateRepository rejects legacy WeChat details in either profile language', (t) => {
  const campusEmail = '<a class="tag" href="mailto:yan3425@email.swu.edu.cn"><i aria-hidden="true" class="fa fa-envelope-o"></i> yan3425@email.swu.edu.cn</a>';
  for (const file of ['profile.html', 'en/profile.html']) {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(
      rootDir,
      file,
      campusEmail,
      `${campusEmail}<span class="tag"><i aria-hidden="true" class="fa fa-weixin"></i> royal-y-3425</span>`
    );

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(`${file}: ${PROFILE_CONTACTS_ISSUE}`));
  }
});

test('validateRepository rejects non-wrapping profile email links', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '#overview .profile-body .inline-list .tag{\n  min-width:0;\n  max-width:100%;\n  white-space:normal;\n  overflow-wrap:anywhere;\n}',
    '#overview .profile-body .inline-list .tag{\n  min-width:0;\n  max-width:100%;\n  white-space:normal;\n  overflow-wrap:normal;\n}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(PROFILE_CONTACT_CSS_ISSUE));
});

test('validateRepository rejects non-wrapping profile summary tags', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '.summary-row .tag{\n  min-width:0;\n  max-width:100%;\n  white-space:normal;\n  overflow-wrap:anywhere;\n}',
    '.summary-row .tag{\n  min-width:0;\n  max-width:100%;\n  white-space:nowrap;\n  overflow-wrap:anywhere;\n}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(PROFILE_CONTACT_CSS_ISSUE));
});

test('validateRepository rejects proof card width drift', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    'flex:0 0 min(78vw, 280px);',
    'flex:0 0 280px;'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(PROOF_RAIL_CSS_ISSUE));
});

test('validateRepository rejects proof card height drift', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  height:366px;',
    '  min-height:366px;'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(PROOF_RAIL_CSS_ISSUE));
});

test('validateRepository rejects proof size variants that override the shared card', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n.proof-grid-wide .proof-item{flex:0 0 320px}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(PROOF_RAIL_CSS_ISSUE));
});

test('validateRepository rejects missing proof rail grab feedback', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '.proof-grid.is-drag-scroll{cursor:grab}',
    '.proof-grid.is-drag-scroll{cursor:pointer}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(PROOF_RAIL_CSS_ISSUE));
});

test('validateRepository rejects missing proof rail initialization', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(rootDir, 'assets/js/site.js', '    initProofRails();\n', '');

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(PROOF_RAIL_DRAG_ISSUE));
});

test('validateRepository rejects reversed proof rail drag movement', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/js/site.js',
    '      rail.scrollLeft = startScrollLeft - distance;',
    '      rail.scrollLeft = startScrollLeft + distance;'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(PROOF_RAIL_DRAG_ISSUE));
});

test('validateRepository rejects proof rail drag click-through', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/js/site.js',
    '      event.stopImmediatePropagation();',
    '      event.stopPropagation();'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(PROOF_RAIL_DRAG_ISSUE));
});

test('mobile home hero accepts the unified dossier rail', () => {
  const rootDir = path.resolve(__dirname, '..');
  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects the old capped card width', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '--hero-rail-card:calc(100vw - 32px);',
    '--hero-rail-card:min(86vw, 340px);'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects uneven card heights', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '    max-height:216px;',
    '    max-height:none;'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects restored contact pills', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .hero-side .profile-card .inline-list .tag{\n    width:max-content;\n    max-width:100%;\n    min-height:24px;\n    padding:0;\n    border:0;',
    '  .hero-side .profile-card .inline-list .tag{\n    width:max-content;\n    max-width:100%;\n    min-height:24px;\n    padding:0;\n    border:1px solid var(--hairline);'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects separated keyword pills', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '    gap:0;\n    overflow:hidden;\n    border:1px solid var(--hairline);\n    border-radius:10px;\n    background:var(--surface-pearl);',
    '    gap:8px;\n    overflow:hidden;\n    border:1px solid var(--hairline);\n    border-radius:10px;\n    background:var(--surface-pearl);'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects non-wrapping keyword cells', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '    justify-content:flex-start;\n    white-space:normal;\n    text-wrap:wrap;\n    overflow-wrap:anywhere;',
    '    justify-content:flex-start;\n    white-space:nowrap;\n    text-wrap:nowrap;\n    overflow-wrap:normal;'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects nested stat card borders', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '    min-height:76px;\n    overflow:hidden;\n    padding:10px 6px;\n    border:0;',
    '    min-height:76px;\n    overflow:hidden;\n    padding:10px 6px;\n    border:1px solid var(--hairline);'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects clipped counter labels', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '    white-space:normal;\n  }\n  .hero-side .compact-stat .stat-label::before{display:none}',
    '    white-space:nowrap;\n  }\n  .hero-side .compact-stat .stat-label::before{display:none}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects overflowing counter values', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '    overflow:hidden;\n    text-overflow:clip;\n    font-size:clamp(14px, 4.25vw, 20px);',
    '    overflow:visible;\n    text-overflow:clip;\n    font-size:clamp(18px, 5.2vw, 22px);'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects the old dense background grid', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '    background-size:auto,48px 48px,48px 48px,auto;',
    '    background-size:auto,36px 36px,36px 36px,auto;'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('home quotation rejects a missing duplicate slot', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(rootDir, 'index.html', 'class="quote-text"', 'class="quote-copy"');

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_QUOTE_INVENTORY_ISSUE));
});

test('home quotation rejects drift between duplicate English copies', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    '<p class="quote-text">',
    '<p class="quote-text">Changed duplicate. '
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_QUOTE_PARITY_ISSUE));
});

test('English terminology rejects legacy wording in active English copy', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    '<main class="main-shell" id="main-content">',
    '<main class="main-shell" id="main-content"><p>graduation design</p>'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(ENGLISH_TERMINOLOGY_ISSUE));
});

test('English terminology ignores legacy wording in HTML comments', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    '<main class="main-shell" id="main-content">',
    '<!-- graduation design -->\n  <main class="main-shell" id="main-content">'
  );

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('validateRepository requires shared mobile breakpoint menu cleanup', (t) => {
  const result = validateSiteScriptFixture(t, [
    '(function () {',
    '  var mobileMenuQuery = window.matchMedia("(max-width: 833px)");',
    '  void mobileMenuQuery;',
    '}());'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository requires the breakpoint handler to exit while the mobile query still matches', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var mobileMenuQuery = window.matchMedia("(max-width: 833px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (!event.matches || !document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'mobileMenuQuery.addEventListener("change", handleMenuBreakpointChange);'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository requires the breakpoint handler to inspect event.matches', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var mobileMenuQuery = window.matchMedia("(max-width: 833px)");',
    'function handleMenuBreakpointChange() {',
    '  if (!document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'mobileMenuQuery.addEventListener("change", handleMenuBreakpointChange);'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository requires the mobile exit gate before cleanup', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var mobileMenuQuery = window.matchMedia("(max-width: 833px)");',
    'function handleMenuBreakpointChange(event) {',
    '  closeMenu(false);',
    '  if (event.matches || !document.body.classList.contains("menu-open")) return;',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'mobileMenuQuery.addEventListener("change", handleMenuBreakpointChange);'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository rejects a nested mobile exit gate decoy', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var mobileMenuQuery = window.matchMedia("(max-width: 833px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (window.fakeCondition) {',
    '    if (event.matches || !document.body.classList.contains("menu-open")) return;',
    '  }',
    '  closeMenu(false);',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'mobileMenuQuery.addEventListener("change", handleMenuBreakpointChange);'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository requires closeMenu inside the breakpoint handler', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var mobileMenuQuery = window.matchMedia("(max-width: 833px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (event.matches || !document.body.classList.contains("menu-open")) return;',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'mobileMenuQuery.addEventListener("change", handleMenuBreakpointChange);',
    'function unrelated() {',
    '  closeMenu(false);',
    '}'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository rejects the gapped min-width desktop breakpoint predicate', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var desktopMenuQuery = window.matchMedia("(min-width: 834px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (!event.matches || !document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'desktopMenuQuery.addEventListener("change", handleMenuBreakpointChange);'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository requires a visible desktop focus fallback', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var mobileMenuQuery = window.matchMedia("(max-width: 833px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (event.matches || !document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '}',
    'mobileMenuQuery.addEventListener("change", handleMenuBreakpointChange);'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository ignores commented and string breakpoint cleanup decoys', (t) => {
  const result = validateSiteScriptFixture(t, [
    '// var mobileMenuQuery = window.matchMedia("(max-width: 833px)");',
    'var queryDecoy = \'var mobileMenuQuery = window.matchMedia("(max-width: 833px)");\';',
    'var listenerDecoy = \'mobileMenuQuery.addEventListener("change", handleMenuBreakpointChange);\';',
    'function handleMenuBreakpointChange(event) {',
    '  /*',
    '  if (event.matches || !document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '  */',
    '}',
    '// mobileMenuQuery.addEventListener("change", handleMenuBreakpointChange);',
    'void queryDecoy;',
    'void listenerDecoy;'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository accepts the max-width mobile breakpoint with comment-like literals', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var commentLikePattern = /[/*]/;',
    'var commentLikeUrl = "https://example.com/*not-comment*/";',
    'var mobileMenuQuery = window.matchMedia("(max-width: 833px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (event.matches || !document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'mobileMenuQuery.addEventListener("change", handleMenuBreakpointChange);',
    'void commentLikePattern;',
    'void commentLikeUrl;'
  ]);

  assert.ok(!result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository rejects CSS navigation breakpoint drift and comment decoys', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '@media (max-width:833px){',
    '/* @media (max-width:833px){.site-nav{display:none}.menu-toggle{display:inline-flex}} */\n' +
      ':root{--media-decoy:"@media (max-width:833px){.site-nav{display:none}.menu-toggle{display:inline-flex}}"}\n' +
      '@media (max-width:832px){'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
});

test('validateRepository rejects a mobile media block nested inside an outer supports rule', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '@media (max-width:833px){\n  .header-shell',
    '@supports (display:grid){\n@media (max-width:833px){\n  .header-shell'
  );
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .footer-actions{justify-content:flex-start}\n}\n\n@media (max-width:640px){',
    '  .footer-actions{justify-content:flex-start}\n}\n}\n\n@media (max-width:640px){'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
});

test('validateRepository requires mobile navigation rules in the same CSS media block', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .site-nav{display:none}\n  .menu-toggle{display:inline-flex}',
    '  .site-nav{display:none}\n}\n\n@media (max-width:833px){\n  .menu-toggle{display:inline-flex}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
});

test('validateRepository rejects nested supports-rule mobile display decoys', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .site-nav{display:none}\n  .menu-toggle{display:inline-flex}',
    '  @supports (display:grid){\n' +
      '    .decoy{}\n' +
      '    .site-nav{display:none}\n' +
      '    .menu-toggle{display:inline-flex}\n' +
      '  }'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
});

test('validateRepository rejects custom-property mobile display decoys', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .site-nav{display:none}\n  .menu-toggle{display:inline-flex}',
    '  .site-nav{--display:none;display:flex}\n' +
      '  .menu-toggle{--display:inline-flex;display:none}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
});

test('validateRepository rejects nested custom-property display decoys', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .site-nav{display:none}\n  .menu-toggle{display:inline-flex}',
    '  .site-nav{--x:{a:b;display:none}}\n' +
      '  .menu-toggle{--x:{a:b;display:inline-flex}}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
});

test('validateRepository rejects overridden mobile display declarations', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .site-nav{display:none}\n  .menu-toggle{display:inline-flex}',
    '  .site-nav{display:none;display:flex}\n' +
      '  .menu-toggle{display:inline-flex;display:none}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
});

test('validateRepository rejects later mobile display rule overrides', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .site-nav{display:none}\n  .menu-toggle{display:inline-flex}',
    '  .site-nav{display:none}\n' +
      '  .menu-toggle{display:inline-flex}\n' +
      '  .site-nav{display:flex}\n' +
      '  .menu-toggle{display:none}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
});

test('validateRepository rejects overrides in a later matching CSS media block', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '@media (max-width:833px){\n  .page-hero > .section-title-wrap,',
    '@media (max-width:833px){\n' +
      '  .site-nav{display:flex}\n' +
      '  .menu-toggle{display:none}\n' +
      '  .page-hero > .section-title-wrap,'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
});

test('validateRepository rejects a resume document card min-width override and CSS decoys', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n/* .doc-grid > .doc-card{min-width:0} */\n' +
      ':root{--resume-card-decoy:".doc-grid > .doc-card{min-width:0}"}\n' +
      '@supports (display:grid){.doc-grid > .doc-card{min-width:0}}\n' +
      '.doc-grid > .doc-card{min-width:auto}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects non-shrinkable resume contact rows and values', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n.resume-sidebar .meta-list li{min-width:auto}\n' +
      '.resume-sidebar .meta-list li span{min-width:auto;overflow-wrap:normal}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects non-wrapping resume keyword tags', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n.resume-sidebar .chip-list .tag{min-width:auto;white-space:nowrap;overflow-wrap:normal}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects a non-wrapping resume small action override', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n.resume-main .button.small{max-width:none;white-space:nowrap}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects conditional resume shrink-safety overrides', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){.doc-grid > .doc-card{min-width:auto}}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects whitespace-variant conditional resume overrides', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){.doc-grid  >  .doc-card{min-width:auto!important}}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects selector-list conditional resume overrides', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){.decoy,.doc-grid > .doc-card{min-width:auto!important}}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository accepts unrelated conditional declarations for resume selectors', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){\n' +
      '  .doc-grid  >  .doc-card{padding:12px}\n' +
      '  .resume-sidebar .meta-list li span{color:inherit}\n' +
      '}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects higher-specificity conditional resume overrides', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){body .doc-grid > .doc-card.doc-card{min-width:auto}}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository counts nth-child of-selector specificity for resume overrides', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){' +
      'article:nth-child(2 of .doc-card){min-width:auto}' +
      '}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects shorter important resume card overrides', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){#main-content .doc-card{min-width:auto!important}}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects shorter important resume action overrides', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){.resume-main .button{white-space:nowrap!important}}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects actual resume action variant overrides', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){.subtle{white-space:nowrap!important}}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository accepts negated and pseudo-element non-target resume rules', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){\n' +
      '  .doc-grid > :not(.doc-card){min-width:auto!important}\n' +
      '  .doc-grid > .doc-card::before{min-width:auto!important}\n' +
      '  .doc-grid > .doc-card:is(.doc-card)::before{min-width:auto!important}\n' +
      '}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects unsupported complex functional resume selectors', (t) => {
  const mutations = [
    '.doc-grid > :not(.doc-grid > .doc-card){min-width:auto!important}',
    '.doc-grid > :not(:is(.doc-grid > .doc-card,.other)){min-width:auto!important}',
    '.doc-card:is(.doc-card::before,.doc-card){min-width:auto!important}',
    '.doc-grid > :not(*,.doc-card){min-width:auto!important}',
    '#main-content:not(#main-content) .doc-card{min-width:auto!important}'
  ];

  for (const mutation of mutations) {
    const rootDir = createRepositoryFixture(t);
    fs.appendFileSync(
      path.join(rootDir, 'assets/css/site.css'),
      `\n@media (max-width:640px){${mutation}}\n`
    );

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
  }
});

test('validateRepository rejects nested state-dependent negated resume overrides', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n@media (max-width:640px){' +
      'article.doc-card:not(:not(:hover)){min-width:auto!important}' +
      '}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository preserves an earlier important resume shrink declaration', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '.doc-grid > .doc-card{min-width:0}',
    '.doc-grid > .doc-card{min-width:0!important}\n' +
      '.doc-grid > .doc-card{min-width:auto}'
  );

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects stale resume overrides despite a later repair', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/css/site.css'),
    '\n#main-content .doc-card{min-width:auto!important}\n' +
      '#main-content .doc-card{min-width:0!important}\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository rejects a conditional decoy instead of a global resume shrink rule', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '.doc-grid > .doc-card{min-width:0}',
    '@supports (display:grid){.doc-grid > .doc-card{min-width:0}}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(RESUME_OVERFLOW_CSS_ISSUE));
});

test('validateRepository requires Lightbox close background cleanup wiring', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/site.js',
    /(function closeLightbox\(\) \{[\s\S]*?)^[\t ]*setBackgroundInert\(false\);\r?\n/m,
    '$1'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository requires Lightbox open background activation wiring', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/site.js',
    /(function openLightbox\(trigger\) \{[\s\S]*?)^[\t ]*setBackgroundInert\(true,\s*\[overlay\]\);\r?\n/m,
    '$1'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository rejects executable modal inert handler reassignment', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/site.js',
    /^([\t ]*function setBackgroundInert\(active, activeElements\) \{)/m,
    '  setElementInert = function () {};\n\n$1'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository rejects var modal inert handler reassignment', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/site.js',
    /^([\t ]*function setBackgroundInert\(active, activeElements\) \{)/m,
    '  var setElementInert = function () {};\n\n$1'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository rejects modal inert reassignment after another statement', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/site.js',
    /^([\t ]*function setBackgroundInert\(active, activeElements\) \{)/m,
    '  void 0; setElementInert = function () {};\n\n$1'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository rejects a same-line duplicate modal inert declaration', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/site.js',
    /^([\t ]*function setBackgroundInert\(active, activeElements\) \{)/m,
    '  ; function setElementInert(element, active) { void element; void active; }\n\n$1'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository ignores property, commented, and literal modal inert assignments', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/site.js',
    /^([\t ]*function setBackgroundInert\(active, activeElements\) \{)/m,
    [
      '  var inertAssignmentDecoy = "setElementInert = function () {};";',
      '  var inertDeclarationDecoy = "; function setElementInert(element, active) {};";',
      '  var inertAssignmentTarget = {};',
      '  inertAssignmentTarget.setElementInert = function () {};',
      '  inertAssignmentTarget[\'setElementInert\'] = function () {};',
      '  // setElementInert = function () {};',
      '  // ; function setElementInert(element, active) {}',
      '  void inertAssignmentDecoy;',
      '  void inertDeclarationDecoy;',
      '  void inertAssignmentTarget;',
      '',
      '$1'
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository requires the modal snapshot to include the inert property', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines({
    inertSnapshotExpression: 'element.hasAttribute("inert")'
  }));

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository rejects commented, literal, and unrelated modal inert decoys', (t) => {
  const result = validateModalSiteScriptFixture(t, [
    'function setElementInert(element, active) {',
    '  var decoy = "element.toggleAttribute(\\\"inert\\\", wasInert);";',
    '  /*',
    '  if (active) {',
    '    if (!element.hasAttribute("data-modal-inert")) {',
    '      element.setAttribute("data-modal-was-inert",',
    '        element.hasAttribute("inert") || element.inert ? "true" : "false");',
    '    }',
    '  }',
    '  var wasInert = element.getAttribute("data-modal-was-inert") === "true";',
    '  element.removeAttribute("data-modal-was-inert");',
    '  element.inert = wasInert;',
    '  */',
    '  void active;',
    '  void decoy;',
    '}',
    ...modalInertFunctionLines().map((line) =>
      line.replace('function setElementInert(', 'function unrelated(')
    )
  ]);

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository accepts equivalent modal inert behavior', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines());

  assert.ok(!result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository preserves independent state across interleaved elements', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines({
    snapshotSuffix: [
      'globalThis.sharedPreviousAria = element.hasAttribute("aria-hidden") ?',
      '  element.getAttribute("aria-hidden") : "__unset__";',
      'globalThis.sharedWasInert = element.hasAttribute("inert") || element.inert;'
    ],
    cleanupLines: [
      'var previousAria = globalThis.sharedPreviousAria;',
      'var wasInert = globalThis.sharedWasInert;',
      'if (previousAria === "__unset__") {',
      '  element.removeAttribute("aria-hidden");',
      '} else if (previousAria !== null) {',
      '  element.setAttribute("aria-hidden", previousAria);',
      '}',
      'element.removeAttribute("data-modal-inert");',
      'element.removeAttribute("data-modal-aria-hidden");',
      'element.removeAttribute("data-modal-was-inert");',
      'element.toggleAttribute("inert", wasInert);',
      'element.inert = wasInert;'
    ]
  }));

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository restores an explicit false aria-hidden value', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines({
    ariaRestoreCondition: 'previousAria === "true"'
  }));

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository rejects duplicate modal inert handlers', (t) => {
  const result = validateModalSiteScriptFixture(t, [
    ...modalInertFunctionLines(),
    'function setElementInert(element, active) {',
    '  if (active) return;',
    '}'
  ]);

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository rejects modal activation fallthrough without return', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines({
    activationReturn: null
  }));

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository rejects a thrown cleanup before inert restoration', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines({
    cleanupPrefix: ['throw new Error("stop before restoration");']
  }));

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository reports modal inert syntax errors', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines({
    cleanupPrefix: ['var broken = ;']
  }));

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository times out non-terminating modal cleanup', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines({
    cleanupPrefix: ['while (true) {}']
  }));

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository rejects an unconditional inert clear after modal restoration', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines({
    cleanupSuffix: [
      'element.removeAttribute("inert");',
      'element.inert = false;'
    ]
  }));

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository rejects deferred inert clearing after restoration', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines({
    cleanupSuffix: [
      'Promise.resolve().then(function () {',
      '  element.removeAttribute("inert");',
      '  element.inert = false;',
      '});'
    ]
  }));

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository requires modal restoration after reading the inert snapshot', (t) => {
  const result = validateModalSiteScriptFixture(t, modalInertFunctionLines({
    cleanupLines: [
      'var previousAria = element.getAttribute("data-modal-aria-hidden");',
      'element.toggleAttribute("inert", wasInert);',
      'element.inert = wasInert;',
      'var wasInert = element.getAttribute("data-modal-was-inert") === "true";',
      'if (previousAria === "__unset__") {',
      '  element.removeAttribute("aria-hidden");',
      '} else if (previousAria !== null) {',
      '  element.setAttribute("aria-hidden", previousAria);',
      '}',
      'element.removeAttribute("data-modal-inert");',
      'element.removeAttribute("data-modal-aria-hidden");',
      'element.removeAttribute("data-modal-was-inert");'
    ]
  }));

  assert.ok(result.issues.includes(MODAL_INERT_RESTORE_ISSUE));
});

test('validateRepository does not depend on the current working directory', () => {
  const rootDir = path.resolve(__dirname, '..');
  const originalCwd = process.cwd();

  try {
    process.chdir(os.tmpdir());
    const result = validateRepository(rootDir);
    assert.deepEqual(result.issues, []);
  } finally {
    process.chdir(originalCwd);
  }
});

test('validateRepository reports missing files instead of throwing', (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ysb-empty-site-'));
  t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes('index.html: expected HTML file is missing'));
  assert.ok(result.issues.includes('manifest.webmanifest: expected file is missing'));
  assert.equal(result.summary.htmlFiles, 0);
  assert.equal(result.summary.sitemapUrls, 0);
});

test('validateRepository reports missing analytics local-counter nodes', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(rootDir, 'analytics.html', 'id="local-total"', 'data-missing-id="local-total"');

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes('analytics.html: stats.js requires #local-total'));
});

test('validateRepository rejects stats-service preconnects on non-stats pages', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'projects.html',
    '  <link href="./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>',
    '  <link href="//cdn.jsdelivr.net/npm/example" rel="dns-prefetch PRECONNECT"/>\n' +
      '  <link href="https://busuanzi.icodeq.com/api/site_pv?site=example" rel="preconnect"/>\n' +
      '  <link href="https://events.vercount.one/path" rel="PRECONNECT"/>\n' +
      '  <link href="./assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css" rel="stylesheet"/>'
  );

  const result = validateRepository(rootDir);

  assert.deepEqual(
    result.issues.filter((issue) => issue.includes('stats-service preconnect')),
    [
      'projects.html: stats-service preconnect https://cdn.jsdelivr.net is limited to the four stats-enabled pages',
      'projects.html: stats-service preconnect https://busuanzi.icodeq.com is limited to the four stats-enabled pages',
      'projects.html: stats-service preconnect https://events.vercount.one is limited to the four stats-enabled pages'
    ]
  );
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

test('validateRepository accepts the bounded public stats loading state machine', (t) => {
  const rootDir = createRepositoryFixture(t);

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(STATS_LOADING_CONTRACT_ISSUE));
});

test('validateRepository rejects slow or collapsed public stats loading states', (t) => {
  const mutations = [
    {
      pattern: '  var PUBLIC_COUNTER_POLL_MS = 250;',
      replacement: '  var PUBLIC_COUNTER_POLL_MS = 1000;'
    },
    {
      pattern: '  var PUBLIC_COUNTER_MAX_TRIES = 32;',
      replacement: '  var PUBLIC_COUNTER_MAX_TRIES = 96;'
    },
    {
      pattern: "        setStatus(text('partial'), 'partial');",
      replacement: "        setStatus(text('partial'), 'ok');"
    }
  ];

  for (const mutation of mutations) {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(
      rootDir,
      'assets/js/stats.js',
      mutation.pattern,
      mutation.replacement
    );

    const result = validateRepository(rootDir);

    assert.ok(result.issues.includes(STATS_LOADING_CONTRACT_ISSUE));
  }
});

test('validateRepository rejects non-ASCII public counter digits', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /  function validCounter\(value\) \{[\s\S]*?\r?\n  \}/,
    [
      '  function validCounter(value) {',
      '    return /^\\p{Nd}+$/u.test(value);',
      '  }'
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_INTEGER_CONTRACT_ISSUE));
});

test('validateRepository treats zero as a valid public counter', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /  function validCounter\(value\) \{[\s\S]*?\r?\n  \}/,
    [
      '  function validCounter(value) {',
      '    return /^[0-9]+$/.test(value) && /[1-9]/.test(value);',
      '  }'
    ].join('\n')
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(STATS_ZERO_CONTRACT_ISSUE));
});

test('validateRepository requires invalid counters to degrade to warn', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'assets/js/stats.js',
    /  function validCounter\(value\) \{[\s\S]*?\r?\n  \}/,
    [
      '  function validCounter(value) {',
      '    return !!value;',
      '  }'
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

test('validateRepository rejects lossy or delegated increments and crossed counter wiring', (t) => {
  const numericMutations = [
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

  for (const mutation of numericMutations) {
    const rootDir = createRepositoryFixture(t);
    assert.ok(
      !validateRepository(rootDir).issues.includes(STATS_LOCAL_COUNT_CONTRACT_ISSUE),
      `${mutation.name} fixture must begin compliant`
    );
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
    assert.ok(
      !validateRepository(rootDir).issues.includes(STATS_LOCAL_COUNT_CONTRACT_ISSUE),
      `${mutation.name} fixture must begin compliant`
    );
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

test('validateRepository checks local URLs in the Font Awesome stylesheet', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.rmSync(path.join(
    rootDir,
    'assets',
    'vendor',
    'font-awesome-4.7.0',
    'fonts',
    'fontawesome-webfont.woff2'
  ));

  const result = validateRepository(rootDir);

  assert.ok(result.issues.some((issue) => (
    issue.startsWith('assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css:') &&
    issue.includes('fontawesome-webfont.woff2')
  )));
});

test('validateRepository rejects duplicate page hreflang entries', (t) => {
  const rootDir = createRepositoryFixture(t);
  const alternate = '<link rel="alternate" hreflang="en" href="https://yan-shibo.github.io/en/"/>';
  replaceOnce(rootDir, 'index.html', alternate, `${alternate}\n  ${alternate}`);

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'index.html: expected exactly one hreflang en alternate'
  ));
});

test('validateRepository requires alternate rel values in the sitemap', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'sitemap.xml',
    '<xhtml:link rel="alternate"',
    '<xhtml:link rel="wrong"'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'sitemap.xml: https://yan-shibo.github.io/ must contain exactly one alternate hreflang zh-CN'
  ));
});

test('validateRepository rejects extra hreflang links with the wrong rel', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '</head>',
    '  <link rel="wrong" hreflang="en" href="https://yan-shibo.github.io/en/"/>\n</head>'
  );
  replaceMatching(
    rootDir,
    'sitemap.xml',
    /^([ \t]*)<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>$/m,
    (match, indentation) => `${match}\n${indentation}` +
      '<xhtml:link rel="wrong" hreflang="en" href="https://yan-shibo.github.io/en/" />'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'index.html: hreflang en link must use rel="alternate"'
  ));
  assert.ok(result.issues.includes(
    'sitemap.xml: https://yan-shibo.github.io/ has a hreflang en link without rel="alternate"'
  ));
});

test('validateRepository accepts split language manifests', (t) => {
  const rootDir = createRepositoryFixture(t);

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('language manifests declare the exact install icon inventory', (t) => {
  const rootDir = createRepositoryFixture(t);

  for (const file of MANIFEST_FILES) {
    const manifest = readManifest(rootDir, file);
    assert.deepEqual(
      sortManifestIconsBySrc(manifest.icons),
      sortManifestIconsBySrc(MANIFEST_INSTALL_ICONS)
    );
  }
});

test('validateRepository accepts install manifest icons in reverse order', (t) => {
  const rootDir = createRepositoryFixture(t);
  const reversedIcons = cloneInstallIcons().reverse();
  for (const file of MANIFEST_FILES) {
    setManifestIcons(rootDir, file, reversedIcons);
  }

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('validateRepository rejects a missing install PNG asset', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.unlinkSync(path.join(rootDir, 'assets/icons/app-icon-192.png'));

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/app-icon-192.png: expected file is missing'
  ));
});

test('validateRepository rejects a missing install icon in both language manifests', (t) => {
  assertManifestInventoryMutationRejected(t, (icons) => icons.shift());
});

test('validateRepository rejects a duplicate install icon in both language manifests', (t) => {
  assertManifestInventoryMutationRejected(t, (icons) => {
    icons[1] = { ...icons[0] };
  });
});

test('validateRepository rejects an extra install icon in both language manifests', (t) => {
  assertManifestInventoryMutationRejected(t, (icons) => icons.push({
    src: '/assets/icons/app-icon-1024.png',
    sizes: '1024x1024',
    type: 'image/png',
    purpose: 'any'
  }));
});

test('validateRepository rejects install icon src drift in both language manifests', (t) => {
  assertManifestInventoryMutationRejected(t, (icons) => {
    icons[0].src = '/assets/icons/app-icon-191.png';
  });
});

test('validateRepository rejects install icon type drift in both language manifests', (t) => {
  assertManifestInventoryMutationRejected(t, (icons) => {
    icons[0].type = 'image/x-icon';
  });
});

test('validateRepository rejects install icon purpose drift in both language manifests', (t) => {
  assertManifestInventoryMutationRejected(t, (icons) => {
    icons[0].purpose = 'maskable';
  });
});

test('validateRepository rejects install icon size drift in both language manifests', (t) => {
  assertManifestInventoryMutationRejected(t, (icons) => {
    icons[0].sizes = '191x191';
  });
});

test('validateRepository rejects extra install icon fields in both language manifests', (t) => {
  assertManifestInventoryMutationRejected(t, (icons) => {
    icons[0].platform = 'web';
  });
});

test('validateRepository requires exactly one language-specific manifest link', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/profile.html',
    '  <link rel="manifest" href="../manifest.en.webmanifest"/>',
    '  <link rel="manifest" href="../manifest.en.webmanifest"/>\n' +
      '  <link rel="manifest" href="../manifest.webmanifest"/>'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'en/profile.html: expected exactly one manifest link to manifest.en.webmanifest'
  ));
});

test('validateRepository rejects a unique manifest link for the wrong language', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '  <link rel="manifest" href="./manifest.webmanifest"/>',
    '  <link rel="manifest" href="./manifest.en.webmanifest"/>'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'index.html: expected exactly one manifest link to manifest.webmanifest'
  ));
});

test('validateRepository requires the language manifest link inside head', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/profile.html',
    '  <link rel="manifest" href="../manifest.en.webmanifest"/>',
    ''
  );
  replaceOnce(
    rootDir,
    'en/profile.html',
    '</body>',
    '  <link rel="manifest" href="../manifest.en.webmanifest"/>\n</body>'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'en/profile.html: expected exactly one manifest link to manifest.en.webmanifest'
  ));
});

test('validateRepository rejects an additional manifest link outside head', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/profile.html',
    '</body>',
    '  <link rel="manifest" href="../manifest.en.webmanifest"/>\n</body>'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'en/profile.html: expected exactly one manifest link to manifest.en.webmanifest'
  ));
});

test('validateRepository ignores manifest links inside HTML comments', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/profile.html',
    '  <link rel="manifest" href="../manifest.en.webmanifest"/>',
    '  <!-- <link rel="manifest" href="../manifest.en.webmanifest"/> -->'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'en/profile.html: expected exactly one manifest link to manifest.en.webmanifest'
  ));
});

test('validateRepository enforces language-specific manifest metadata', (t) => {
  const rootDir = createRepositoryFixture(t);
  const manifestPath = path.join(rootDir, 'manifest.en.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.start_url = '/';
  manifest.scope = '/en/';
  manifest.lang = 'zh-CN';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'manifest.en.webmanifest: expected start_url "/en/" for en'
  ));
  assert.ok(result.issues.includes(
    'manifest.en.webmanifest: expected scope "/" for en'
  ));
  assert.ok(result.issues.includes(
    'manifest.en.webmanifest: expected lang "en"'
  ));
});

test('validateRepository reports a null manifest instead of throwing', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(path.join(rootDir, 'manifest.webmanifest'), 'null\n');

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'manifest.webmanifest: manifest root must be an object'
  ));
});

test('validateRepository reports malformed manifest icon entries', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(rootDir, 'manifest.webmanifest'),
    `${JSON.stringify({ icons: [null, {}] }, null, 2)}\n`
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'manifest.webmanifest: icons[0] must be an object with a non-empty src'
  ));
  assert.ok(result.issues.includes(
    'manifest.webmanifest: icons[1] must be an object with a non-empty src'
  ));
});

test('validateRepository reports a non-string manifest icon src without throwing', (t) => {
  const rootDir = createRepositoryFixture(t);
  const manifest = readManifest(rootDir, 'manifest.webmanifest');
  manifest.icons[0].src = { toString: null };
  writeManifest(rootDir, 'manifest.webmanifest', manifest);

  let result;
  assert.doesNotThrow(() => {
    result = validateRepository(rootDir);
  });
  assert.ok(result.issues.includes(
    `manifest.webmanifest: ${MANIFEST_ICON_INVENTORY_ISSUE}`
  ));
  assert.ok(result.issues.includes(
    'manifest.webmanifest: icons[0] must be an object with a non-empty src'
  ));
});

test('validateRepository accepts the compact brand mark PNG asset', (t) => {
  const rootDir = createRepositoryFixture(t);

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.some((issue) => (
    issue.startsWith('assets/icons/brand-mark.png:')
  )));
});

test('validateRepository rejects brand mark PNG dimension drift', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/brand-mark.png', (png) => {
    png.writeUInt32BE(63, 16);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.some((issue) => (
    issue.startsWith(
      'assets/icons/brand-mark.png: expected 64x64 but PNG IHDR declares '
    )
  )));
});

test('validateRepository rejects an oversized brand mark PNG asset', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.appendFileSync(
    path.join(rootDir, 'assets/icons/brand-mark.png'),
    Buffer.alloc(16 * 1024 + 1)
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.some((issue) => (
    issue.startsWith(
      'assets/icons/brand-mark.png: must not exceed 16384 bytes; found '
    )
  )));
});

test('validateRepository rejects a corrupt install PNG signature', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/app-icon-192.png', (png) => {
    assert.deepEqual(png.subarray(0, PNG_SIGNATURE.length), PNG_SIGNATURE);
    png[0] = 0;
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/app-icon-192.png: invalid PNG: invalid PNG signature'
  ));
});

test('validateRepository accepts bounded PNG structure without CRC or pixel decoding', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(rootDir, 'assets/icons/app-icon-192.png'),
    createStructurallyValidPng(192, 192)
  );

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('validateRepository checks the 512 install PNG signature too', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/app-icon-512.png', (png) => {
    png[0] = 0;
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/app-icon-512.png: invalid PNG: invalid PNG signature'
  ));
});

test('validateRepository safely reports an extremely short install PNG', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(rootDir, 'assets/icons/app-icon-192.png'),
    PNG_SIGNATURE.subarray(0, 4)
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/app-icon-192.png: invalid PNG: truncated PNG signature'
  ));
});

test('validateRepository requires IHDR to be the first install PNG chunk', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/app-icon-192.png', (png) => {
    png.write('IDAT', 12, 4, 'ascii');
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/app-icon-192.png: invalid PNG: first PNG chunk must be IHDR'
  ));
});

test('validateRepository requires a 13-byte install PNG IHDR', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/app-icon-192.png', (png) => {
    png.writeUInt32BE(12, 8);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/app-icon-192.png: invalid PNG: IHDR chunk length must be 13'
  ));
});

test('validateRepository rejects zero install PNG dimensions', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/app-icon-192.png', (png) => {
    png.writeUInt32BE(0, 16);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/app-icon-192.png: invalid PNG: IHDR dimensions must be non-zero'
  ));
});

test('validateRepository rejects an install PNG chunk beyond the file boundary', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/app-icon-192.png', (png) => {
    const secondChunkOffset = 8 + 12 + png.readUInt32BE(8);
    png.writeUInt32BE(0xffffffff, secondChunkOffset);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/app-icon-192.png: invalid PNG: PNG chunk at byte 33 exceeds file boundary'
  ));
});

test('validateRepository matches install PNG dimensions to the declared size', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/app-icon-512.png', (png) => {
    png.writeUInt32BE(511, 16);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/app-icon-512.png: expected 512x512 but PNG IHDR declares 511x512'
  ));
});

test('validateRepository requires the exact favicon size inventory independently of manifests', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    ico.writeUInt16LE(3, 4);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    `assets/icons/site.ico: expected favicon sizes "${FAVICON_SIZES.join(' ')}" without duplicates; ` +
      'found "16x16 32x32 48x48"'
  ));
});

test('validateRepository rejects duplicate favicon sizes instead of collapsing them', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    const entry = readIcoEntry(ico, 1);
    ico[entry.entryOffset] = 16;
    ico[entry.entryOffset + 1] = 16;
    ico.writeUInt32BE(16, entry.imageOffset + 16);
    ico.writeUInt32BE(16, entry.imageOffset + 20);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    `assets/icons/site.ico: expected favicon sizes "${FAVICON_SIZES.join(' ')}" without duplicates; ` +
      'found "16x16 16x16 48x48 256x256"'
  ));
});

test('validateRepository rejects four unique favicon entries with one wrong size', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    const entry = readIcoEntry(ico, 1);
    ico[entry.entryOffset] = 64;
    ico[entry.entryOffset + 1] = 64;
    ico.writeUInt32BE(64, entry.imageOffset + 16);
    ico.writeUInt32BE(64, entry.imageOffset + 20);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    `assets/icons/site.ico: expected favicon sizes "${FAVICON_SIZES.join(' ')}" without duplicates; ` +
      'found "16x16 48x48 64x64 256x256"'
  ));
});

test('validateRepository rejects a valid extra fifth favicon entry', (t) => {
  const rootDir = createRepositoryFixture(t);
  const icoPath = path.join(rootDir, 'assets/icons/site.ico');
  const ico = fs.readFileSync(icoPath);
  fs.writeFileSync(
    icoPath,
    appendIcoPngEntry(ico, 64, 64, createStructurallyValidPng(64, 64))
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    `assets/icons/site.ico: expected favicon sizes "${FAVICON_SIZES.join(' ')}" without duplicates; ` +
      'found "16x16 32x32 48x48 64x64 256x256"'
  ));
});

test('validateRepository safely reports a truncated favicon ICO directory', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(rootDir, 'assets/icons/site.ico'),
    Buffer.from([0, 0, 1, 0, 2, 0])
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/site.ico: invalid ICO: truncated icon directory'
  ));
});

test('validateRepository rejects favicon ICO image data overlapping its directory', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    ico.writeUInt32LE(0, 6 + 12);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/site.ico: invalid ICO: icon entry 0 image data overlaps the icon directory'
  ));
});

test('validateRepository rejects overlapping favicon ICO image entries', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    const firstEntry = readIcoEntry(ico, 0);
    const secondEntry = readIcoEntry(ico, 1);
    ico.writeUInt32LE(firstEntry.imageOffset, secondEntry.entryOffset + 12);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/site.ico: invalid ICO: ' +
      'icon entry 1 image data overlaps icon entry 0'
  ));
});

test('validateRepository rejects favicon ICO image lengths outside the file', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    ico.writeUInt32LE(ico.length, 6 + 8);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/site.ico: invalid ICO: icon entry 0 image data is outside the file'
  ));
});

test('validateRepository bounds embedded favicon PNG parsing to each ICO entry length', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    ico.writeUInt32LE(PNG_SIGNATURE.length, 6 + 8);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/site.ico: invalid ICO: icon entry 0: truncated PNG chunk header'
  ));
});

test('validateRepository rejects a corrupt embedded favicon PNG signature', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    const entry = readIcoEntry(ico, 0);
    assert.deepEqual(
      ico.subarray(entry.imageOffset, entry.imageOffset + PNG_SIGNATURE.length),
      PNG_SIGNATURE
    );
    ico[entry.imageOffset] = 0;
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/site.ico: invalid ICO: icon entry 0: invalid PNG signature'
  ));
});

test('validateRepository checks embedded PNG signatures beyond the first favicon entry', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    const entry = readIcoEntry(ico, 2);
    ico[entry.imageOffset] = 0;
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/site.ico: invalid ICO: icon entry 2: invalid PNG signature'
  ));
});

test('validateRepository checks later PNG chunk bounds in the fourth favicon entry', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    const entry = readIcoEntry(ico, 3);
    const secondChunkOffset = entry.imageOffset + 8 + 12 +
      ico.readUInt32BE(entry.imageOffset + 8);
    ico.writeUInt32BE(0xffffffff, secondChunkOffset);
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/site.ico: invalid ICO: icon entry 3: ' +
      'PNG chunk at byte 33 exceeds file boundary'
  ));
});

test('validateRepository requires embedded favicon PNG images to begin with IHDR', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    const entry = readIcoEntry(ico, 0);
    ico.write('IDAT', entry.imageOffset + 12, 4, 'ascii');
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/site.ico: invalid ICO: icon entry 0: first PNG chunk must be IHDR'
  ));
});

test('validateRepository rejects favicon ICO directory and IHDR dimension drift', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateBinaryFile(rootDir, 'assets/icons/site.ico', (ico) => {
    ico[6] = 17;
  });

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'assets/icons/site.ico: invalid ICO: icon entry 0 directory size 17x16 ' +
      'does not match PNG IHDR 16x16'
  ));
});

test('validateRepository rejects path casing that differs from disk', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    'src="./assets/profile/photo.jpg"',
    'src="./assets/profile/PHOTO.jpg"'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'index.html: path casing mismatch for ./assets/profile/PHOTO.jpg'
  ));
});

test('validateRepository rejects a site-wide robots disallow rule', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(rootDir, 'robots.txt'),
    'User-agent: *\nDisallow: /\n\nSitemap: https://yan-shibo.github.io/sitemap.xml\n'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'robots.txt: User-agent * must allow / and must not disallow /'
  ));
});

test('validateRepository scopes robots rules to the wildcard user-agent group', (t) => {
  const blockedRoot = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(blockedRoot, 'robots.txt'),
    'User-agent: *\nDisallow: /*\n\nUser-agent: ExampleBot\nAllow: /\n\n' +
      'Sitemap: https://yan-shibo.github.io/sitemap.xml\n'
  );
  const blockedResult = validateRepository(blockedRoot);
  assert.ok(blockedResult.issues.includes(
    'robots.txt: User-agent * must allow / and must not disallow /'
  ));

  const allowedRoot = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(allowedRoot, 'robots.txt'),
    'User-agent: *\nAllow: /\n\nUser-agent: ExampleBot\nDisallow: /\n\n' +
      'Sitemap: https://yan-shibo.github.io/sitemap.xml\n'
  );
  const allowedResult = validateRepository(allowedRoot);
  assert.ok(!allowedResult.issues.includes(
    'robots.txt: User-agent * must allow / and must not disallow /'
  ));
});

test('validateRepository requires the sitemap XML envelope and namespaces', (t) => {
  const rootDir = createRepositoryFixture(t);
  const sitemapPath = path.join(rootDir, 'sitemap.xml');
  const original = fs.readFileSync(sitemapPath, 'utf8');
  const withoutEnvelope = original
    .replace(/<urlset\b[^>]*>/, '')
    .replace('</urlset>', '');
  fs.writeFileSync(sitemapPath, withoutEnvelope);

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'sitemap.xml: invalid urlset envelope or namespaces'
  ));
});

test('validateRepository rejects an additional sitemap document element', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'sitemap.xml',
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?xml version="1.0" encoding="UTF-8"?>\n<bogus/>'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'sitemap.xml: invalid urlset envelope or namespaces'
  ));
});

test('validateRepository reports unregistered HTML in nested directories', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.mkdirSync(path.join(rootDir, 'nested'));
  fs.writeFileSync(path.join(rootDir, 'nested', 'new.html'), '<!doctype html>\n');

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'nested/new.html: unexpected HTML file; update the bilingual page inventory'
  ));
});

test('validateRepository does not modify the repository it checks', (t) => {
  const rootDir = createRepositoryFixture(t);
  const before = snapshotFiles(rootDir);

  const result = validateRepository(rootDir);
  const after = snapshotFiles(rootDir);

  assert.deepEqual(result.issues, []);
  assert.deepEqual(after, before);
});

test('the validator CLI exits with status 1 for an invalid repository', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(path.join(rootDir, 'manifest.webmanifest'), 'null\n');

  const result = childProcess.spawnSync(
    process.execPath,
    [path.join(rootDir, 'scripts', 'validate-site.js')],
    { cwd: os.tmpdir(), encoding: 'utf8' }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /manifest root must be an object/);
});

const structuredExtractionCases = [
  {
    name: 'rejects a missing head block',
    file: 'index.html',
    issue: 'expected exactly one active JSON-LD block in head',
    mutate(rootDir, file) {
      replaceStructuredMarkup(rootDir, file, () => '');
    }
  },
  {
    name: 'rejects duplicate head blocks',
    file: 'index.html',
    issue: 'expected exactly one active JSON-LD block in head',
    mutate(rootDir, file) {
      replaceStructuredMarkup(rootDir, file, (block) => `${block}\n${block}`);
    }
  },
  {
    name: 'rejects an extra body block',
    file: 'index.html',
    issue: 'JSON-LD blocks are not allowed outside head',
    mutate(rootDir, file) {
      const absolutePath = path.join(rootDir, file);
      const html = fs.readFileSync(absolutePath, 'utf8');
      const block = html.match(STRUCTURED_SCRIPT_PATTERN)[0];
      fs.writeFileSync(absolutePath, html.replace('</body>', `${block}\n</body>`));
    }
  },
  {
    name: 'ignores a comment-only block',
    file: 'index.html',
    issue: 'expected exactly one active JSON-LD block in head',
    mutate(rootDir, file) {
      replaceStructuredMarkup(rootDir, file, (block) => `<!--${block}-->`);
    }
  },
  {
    name: 'reports malformed JSON without binding to engine wording',
    file: 'index.html',
    issue: 'invalid structured data JSON',
    mutate(rootDir, file) {
      replaceStructuredMarkup(
        rootDir,
        file,
        (block) => block.replace(/>[\s\S]*<\/script>$/i, '>{"@context":</script>')
      );
    }
  },
  {
    name: 'rejects the wrong root context',
    file: 'index.html',
    issue: '@context must be exactly https://schema.org',
    mutate(rootDir, file) {
      mutateStructuredData(rootDir, file, (value) => {
        value['@context'] = 'http://schema.org';
      });
    }
  },
  {
    name: 'rejects a non-array graph',
    file: 'index.html',
    issue: '@graph must be an array',
    mutate(rootDir, file) {
      mutateStructuredData(rootDir, file, (value) => {
        value['@graph'] = {};
      });
    }
  }
];

for (const mutation of structuredExtractionCases) {
  test(`structured data ${mutation.name}`, (t) => {
    const rootDir = createRepositoryFixture(t);
    mutation.mutate(rootDir, mutation.file);

    const result = validateRepository(rootDir);

    assertStructuredIssue(result, mutation.file, mutation.issue);
  });
}

const structuredCommonCases = [
  {
    name: 'rejects the wrong page type',
    issue: 'page @type must be ProfilePage',
    mutate(value) { value['@graph'][0]['@type'] = 'WebPage'; }
  },
  {
    name: 'rejects the wrong page language',
    issue: 'page inLanguage must be zh-CN',
    mutate(value) { value['@graph'][0].inLanguage = 'en'; }
  },
  {
    name: 'rejects the wrong page URL',
    issue: 'page url must match canonical',
    mutate(value) { value['@graph'][0].url = 'https://yan-shibo.github.io/wrong.html'; }
  },
  {
    name: 'rejects a page name that differs from the title',
    issue: 'page name must match the document title',
    mutate(value) { value['@graph'][0].name = 'Invisible page title'; }
  },
  {
    name: 'rejects a page description that differs from metadata',
    issue: 'page description must match the meta description',
    mutate(value) { value['@graph'][0].description = 'Invisible page description'; }
  },
  {
    name: 'rejects a relative top-level ID',
    issue: 'top-level @id must be an absolute URL',
    mutate(value) { value['@graph'][0]['@id'] = '/#webpage'; }
  },
  {
    name: 'rejects a missing top-level ID',
    issue: 'top-level graph node is missing @id',
    mutate(value) { delete value['@graph'][0]['@id']; }
  },
  {
    name: 'rejects a duplicate top-level ID',
    issue: 'duplicate top-level @id',
    mutate(value) { value['@graph'][1]['@id'] = value['@graph'][0]['@id']; }
  },
  {
    name: 'rejects a dangling internal reference',
    issue: 'unresolved same-origin @id reference',
    mutate(value) {
      value['@graph'][0].isPartOf['@id'] = 'https://yan-shibo.github.io/#missing';
    }
  },
  {
    name: 'rejects an unexpected graph node',
    issue: 'unexpected graph node',
    mutate(value) {
      value['@graph'].push({
        '@type': 'Thing',
        '@id': 'https://yan-shibo.github.io/#unexpected'
      });
    }
  },
  {
    name: 'rejects Person inLanguage',
    issue: 'Person must not contain inLanguage',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PERSON_ID).inLanguage = 'zh-CN';
    }
  },
  {
    name: 'rejects relation objects with extra fields',
    issue: 'isPartOf must be an @id-only object',
    mutate(value) {
      value['@graph'][0].isPartOf.name = 'Website';
    }
  }
];

for (const mutation of structuredCommonCases) {
  test(`structured data ${mutation.name}`, (t) => {
    const rootDir = createRepositoryFixture(t);
    mutateStructuredData(rootDir, 'index.html', mutation.mutate);

    const result = validateRepository(rootDir);

    assertStructuredIssue(result, 'index.html', mutation.issue);
  });
}

const structuredConsistencyCases = [
  {
    name: 'rejects Person stable-ID drift across pages',
    file: 'en/profile.html',
    issue: 'Person @id must be consistent across pages',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PERSON_ID)['@id'] =
        'https://yan-shibo.github.io/#different-person';
    }
  },
  {
    name: 'rejects Person stable-fact drift across pages',
    file: 'en/profile.html',
    issue: 'Person stable facts must be consistent across pages',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PERSON_ID).email = 'mailto:different@example.com';
    }
  },
  {
    name: 'rejects Person name-set drift across pages',
    file: 'en/profile.html',
    issue: 'Person name set must be consistent across pages',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PERSON_ID).alternateName = 'Different Name';
    }
  },
  {
    name: 'rejects WebSite stable-ID drift across pages',
    file: 'en/profile.html',
    issue: 'WebSite @id must be consistent across pages',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_WEBSITE_ID)['@id'] =
        'https://yan-shibo.github.io/#different-website';
    }
  },
  {
    name: 'rejects WebSite stable-fact drift across pages',
    file: 'en/profile.html',
    issue: 'WebSite stable facts must be consistent across pages',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_WEBSITE_ID).url =
        'https://yan-shibo.github.io/different/';
    }
  },
  {
    name: 'rejects WebSite language-set drift across pages',
    file: 'en/profile.html',
    issue: 'WebSite language set must be consistent across pages',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_WEBSITE_ID).inLanguage.push('fr');
    }
  },
  {
    name: 'rejects same-language WebSite name drift',
    file: 'profile.html',
    issue: 'WebSite name must be consistent across zh-CN pages',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_WEBSITE_ID).name = '不同站点名';
    }
  }
];

for (const mutation of structuredConsistencyCases) {
  test(`structured data ${mutation.name}`, (t) => {
    const rootDir = createRepositoryFixture(t);
    mutateStructuredData(rootDir, mutation.file, mutation.mutate);

    const result = validateRepository(rootDir);

    assertStructuredIssue(result, mutation.file, mutation.issue);
  });
}

test('structured data accepts reversed WebSite language-array order', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateStructuredData(rootDir, 'en/profile.html', (value) => {
    findStructuredNode(value, STRUCTURED_WEBSITE_ID).inLanguage.reverse();
  });

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

const structuredProjectCases = [
  {
    name: 'rejects the wrong project numberOfItems',
    issue: 'project list numberOfItems must be 2',
    mutate(value) {
      findStructuredNode(value, 'https://yan-shibo.github.io/projects.html#project-list')
        .numberOfItems = 3;
    }
  },
  {
    name: 'rejects a missing project list element',
    issue: 'project list must contain exactly 2 elements',
    mutate(value) {
      findStructuredNode(value, 'https://yan-shibo.github.io/projects.html#project-list')
        .itemListElement.pop();
    }
  },
  {
    name: 'rejects the wrong project order',
    issue: 'project list item order must match the approved inventory',
    mutate(value) {
      const elements = findStructuredNode(
        value,
        'https://yan-shibo.github.io/projects.html#project-list'
      ).itemListElement;
      [elements[0].item, elements[1].item] = [elements[1].item, elements[0].item];
    }
  },
  {
    name: 'rejects duplicate project positions',
    issue: 'project list positions must be 1 and 2',
    mutate(value) {
      findStructuredNode(value, 'https://yan-shibo.github.io/projects.html#project-list')
        .itemListElement[1].position = 1;
    }
  },
  {
    name: 'rejects the wrong project repository',
    issue: 'project codeRepository must match the approved repository',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PROJECT_IDS[0]).codeRepository =
        'https://github.com/Yan-ShiBo/Wrong';
    }
  },
  {
    name: 'rejects the wrong project contributor',
    issue: 'project contributor must reference Person',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PROJECT_IDS[0]).contributor['@id'] =
        STRUCTURED_WEBSITE_ID;
    }
  },
  {
    name: 'rejects an invisible project name',
    issue: 'project name must appear in visible page text',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PROJECT_IDS[0]).name = 'Invisible project name';
    }
  },
  {
    name: 'rejects an invisible project description',
    issue: 'project description must appear in visible page text',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PROJECT_IDS[0]).description =
        'Invisible project description';
    }
  },
  {
    name: 'rejects an invisible project keyword',
    issue: 'project keyword must appear in visible page text',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PROJECT_IDS[0]).keywords[0] =
        'Invisible project keyword';
    }
  },
  {
    name: 'rejects forbidden project creator claims',
    issue: 'SoftwareSourceCode has unexpected key creator',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PROJECT_IDS[0]).creator = {
        '@id': STRUCTURED_PERSON_ID
      };
    }
  }
];

for (const mutation of structuredProjectCases) {
  test(`structured data ${mutation.name}`, (t) => {
    const rootDir = createRepositoryFixture(t);
    mutateStructuredData(rootDir, 'projects.html', mutation.mutate);

    const result = validateRepository(rootDir);

    assertStructuredIssue(result, 'projects.html', mutation.issue);
  });
}

const structuredResearchCases = [
  {
    name: 'rejects the wrong research numberOfItems',
    issue: 'research list numberOfItems must be 4',
    mutate(value) {
      findStructuredNode(value, 'https://yan-shibo.github.io/research.html#research-directions')
        .numberOfItems = 3;
    }
  },
  {
    name: 'rejects a missing research list element',
    issue: 'research list must contain exactly 4 elements',
    mutate(value) {
      findStructuredNode(value, 'https://yan-shibo.github.io/research.html#research-directions')
        .itemListElement.pop();
    }
  },
  {
    name: 'rejects the wrong research order',
    issue: 'research list item order must match the approved inventory',
    mutate(value) {
      const elements = findStructuredNode(
        value,
        'https://yan-shibo.github.io/research.html#research-directions'
      ).itemListElement;
      [elements[0].item, elements[1].item] = [elements[1].item, elements[0].item];
    }
  },
  {
    name: 'rejects duplicate research positions',
    issue: 'research list positions must be 1 through 4',
    mutate(value) {
      findStructuredNode(value, 'https://yan-shibo.github.io/research.html#research-directions')
        .itemListElement[1].position = 1;
    }
  },
  {
    name: 'rejects ResearchProject claims',
    issue: 'research item @type must be Thing',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_RESEARCH_IDS[0])['@type'] = 'ResearchProject';
    }
  },
  {
    name: 'rejects an invisible research name',
    issue: 'research name must appear in visible page text',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_RESEARCH_IDS[0]).name =
        'Invisible research name';
    }
  },
  {
    name: 'rejects an invisible research description',
    issue: 'research description must appear in visible page text',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_RESEARCH_IDS[0]).description =
        'Invisible research description';
    }
  }
];

for (const mutation of structuredResearchCases) {
  test(`structured data ${mutation.name}`, (t) => {
    const rootDir = createRepositoryFixture(t);
    mutateStructuredData(rootDir, 'research.html', mutation.mutate);

    const result = validateRepository(rootDir);

    assertStructuredIssue(result, 'research.html', mutation.issue);
  });
}

const structuredAnalyticsCases = [
  {
    name: 'rejects Dataset anywhere on analytics pages',
    issue: 'analytics structured data must not contain @type Dataset',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PERSON_ID).homeLocation['@type'] = 'Dataset';
    }
  },
  {
    name: 'rejects InteractionCounter anywhere on analytics pages',
    issue: 'analytics structured data must not contain @type InteractionCounter',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PERSON_ID).homeLocation['@type'] =
        'InteractionCounter';
    }
  },
  {
    name: 'rejects Person as analytics mainEntity',
    issue: 'analytics page must not contain mainEntity',
    mutate(value) {
      value['@graph'][0].mainEntity = { '@id': STRUCTURED_PERSON_ID };
    }
  },
  {
    name: 'rejects userInteractionCount analytics fields',
    issue: 'analytics structured data must not contain field userInteractionCount',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PERSON_ID).homeLocation.userInteractionCount = 1;
    }
  },
  {
    name: 'rejects localStorage analytics fields',
    issue: 'analytics structured data must not contain field localStorage',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_WEBSITE_ID).localStorage = 'ysb-visits';
    }
  },
  {
    name: 'rejects visitorId analytics fields',
    issue: 'analytics structured data must not contain field visitorId',
    mutate(value) {
      findStructuredNode(value, STRUCTURED_PERSON_ID).visitorId = 'local-id';
    }
  }
];

for (const mutation of structuredAnalyticsCases) {
  test(`structured data ${mutation.name}`, (t) => {
    const rootDir = createRepositoryFixture(t);
    mutateStructuredData(rootDir, 'analytics.html', mutation.mutate);

    const result = validateRepository(rootDir);

    assertStructuredIssue(result, 'analytics.html', mutation.issue);
  });
}

for (const file of ['404.html', 'en/404.html']) {
  test(`structured data rejects JSON-LD on ${file}`, (t) => {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(
      rootDir,
      file,
      '</head>',
      `  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[]}</script>\n</head>`
    );

    const result = validateRepository(rootDir);

    assertStructuredIssue(result, file, '404 pages must not contain active JSON-LD');
  });
}

test('structured data deeply nested input does not stop repository validation', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(rootDir, 'index.html', (block) => {
    const nested = '{"child":'.repeat(12000) + 'null' + '}'.repeat(12000);
    return block.replace(/}<\/script>$/i, `,"deep":${nested}}</script>`);
  });

  const result = validateRepository(rootDir);

  assertStructuredIssue(result, 'index.html', 'structured data root has unexpected key deep');
  assert.ok(result.issues.some((issue) => issue.startsWith('en/index.html: ')) === false);
});

test('structured data excludes template content from visible project evidence', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateStructuredData(rootDir, 'projects.html', (value) => {
    findStructuredNode(value, STRUCTURED_PROJECT_IDS[0]).name = 'Template-only project name';
  });
  replaceOnce(
    rootDir,
    'projects.html',
    '</body>',
    '<template>Template-only project name</template>\n</body>'
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(result, 'projects.html', 'project name must appear in visible page text');
});

test('structured data excludes noscript content from visible project evidence when scripting is enabled', (t) => {
  const rootDir = createRepositoryFixture(t);
  const structuredData = readStructuredData(rootDir, 'projects.html');
  const projectName = findStructuredNode(
    structuredData,
    STRUCTURED_PROJECT_IDS[0]
  ).name;
  replaceOnce(
    rootDir,
    'projects.html',
    `<h3>${projectName}</h3>`,
    '<h3></h3>'
  );
  replaceOnce(
    rootDir,
    'projects.html',
    '</body>',
    `<noscript>${projectName}</noscript>\n</body>`
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(result, 'projects.html', 'project name must appear in visible page text');
});

test('structured data excludes noscript content from visible research evidence when scripting is enabled', (t) => {
  const rootDir = createRepositoryFixture(t);
  const structuredData = readStructuredData(rootDir, 'research.html');
  const researchName = findStructuredNode(
    structuredData,
    STRUCTURED_RESEARCH_IDS[0]
  ).name;
  replaceOnce(
    rootDir,
    'research.html',
    `<h3>${researchName}</h3>`,
    '<h3></h3>'
  );
  replaceOnce(
    rootDir,
    'research.html',
    '</body>',
    `<noscript>${researchName}</noscript>\n</body>`
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(result, 'research.html', 'research name must appear in visible page text');
});

test('structured data ignores JSON-LD inside head noscript when scripting is enabled', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(
    rootDir,
    'index.html',
    (block) => `<noscript>${block}</noscript>`
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(
    result,
    'index.html',
    'expected exactly one active JSON-LD block in head'
  );
});

test('structured data ignores JSON-LD text inside a head textarea', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(
    rootDir,
    'index.html',
    (block) => `<textarea>${block}</textarea>`
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(
    result,
    'index.html',
    'expected exactly one active JSON-LD block in head'
  );
});

test('structured data ignores JSON-LD text inside a head title', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(
    rootDir,
    'index.html',
    (block) => `<title>${block}</title>`
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(
    result,
    'index.html',
    'expected exactly one active JSON-LD block in head'
  );
});

test('structured data excludes evidence hidden behind a quoted greater-than attribute', (t) => {
  const rootDir = createRepositoryFixture(t);
  const structuredData = readStructuredData(rootDir, 'projects.html');
  const projectName = findStructuredNode(
    structuredData,
    STRUCTURED_PROJECT_IDS[0]
  ).name;
  replaceOnce(
    rootDir,
    'projects.html',
    `<h3>${projectName}</h3>`,
    '<h3></h3>'
  );
  replaceOnce(
    rootDir,
    'projects.html',
    '</body>',
    `<div title=">" hidden>${projectName}</div>\n</body>`
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(result, 'projects.html', 'project name must appear in visible page text');
});

test('structured data excludes evidence when a quoted body opener is hidden', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'projects.html',
    '<body>',
    '<body title=">" hidden>'
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(result, 'projects.html', 'project name must appear in visible page text');
});

test('structured data keeps the head open across a literal closer in script raw text', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(
    rootDir,
    'index.html',
    (block) => `<script>const marker = "</head>";</script>${block}`
  );

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('structured data keeps the head open across a literal closer in style raw text', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(
    rootDir,
    'index.html',
    (block) => `<style>.marker { --value: "</head>"; }</style>${block}`
  );

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('structured data keeps the head open across a closer in an HTML comment', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(
    rootDir,
    'index.html',
    (block) => `<!-- </head> -->${block}`
  );

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('structured data ignores JSON-LD nested in a head template', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(
    rootDir,
    'index.html',
    (block) => `<template>${block}</template>`
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(
    result,
    'index.html',
    'expected exactly one active JSON-LD block in head'
  );
});

test('structured data ignores a spaced template end tag that browsers treat as text', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(
    rootDir,
    'index.html',
    (block) => `<template></ template>${block}</template>`
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(
    result,
    'index.html',
    'expected exactly one active JSON-LD block in head'
  );
});

test('structured data ignores JSON-LD after a template closer inside raw script text', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(rootDir, 'index.html', (block) => [
    '<template>',
    '<script>const marker = "</template>";</script>',
    block,
    '</template>'
  ].join(''));

  const result = validateRepository(rootDir);

  assertStructuredIssue(
    result,
    'index.html',
    'expected exactly one active JSON-LD block in head'
  );
});

test('structured data keeps template depth after a raw script false closer with NBSP', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(rootDir, 'index.html', (block) => [
    '<template>',
    '<script>const marker = "</script\u00a0></template>";</script>',
    block,
    '</template>'
  ].join(''));

  const result = validateRepository(rootDir);

  assertStructuredIssue(
    result,
    'index.html',
    'expected exactly one active JSON-LD block in head'
  );
});

test('structured data keeps template depth when comment text splits a raw script closer', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(rootDir, 'index.html', (block) => [
    '<template>',
    '<script>const marker = "</scr<!--x-->ipt></template>";</script>',
    block,
    '</template>'
  ].join(''));

  const result = validateRepository(rootDir);

  assertStructuredIssue(
    result,
    'index.html',
    'expected exactly one active JSON-LD block in head'
  );
});

test('structured data ignores JSON-LD after a template closer inside raw style text', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(rootDir, 'index.html', (block) => [
    '<template>',
    '<style>.marker { --value: "</template>"; }</style>',
    block,
    '</template>'
  ].join(''));

  const result = validateRepository(rootDir);

  assertStructuredIssue(
    result,
    'index.html',
    'expected exactly one active JSON-LD block in head'
  );
});

test('structured data accepts a slash-delimited JSON-LD script end tag', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceStructuredMarkup(
    rootDir,
    'index.html',
    (block) => block.replace(/<\/script>$/, '</script/>')
  );

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('structured data accepts reordered top-level graph nodes', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateStructuredData(rootDir, 'index.html', (value) => {
    value['@graph'].reverse();
  });

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('structured data rejects a literal JSON entity as a decoded HTML title match', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'index.html',
    /<title>[^<]*<\/title>/,
    '<title>A &amp; B</title>'
  );
  mutateStructuredData(rootDir, 'index.html', (value) => {
    findStructuredNode(value, 'https://yan-shibo.github.io/#webpage').name = 'A &amp; B';
  });

  const result = validateRepository(rootDir);

  assertStructuredIssue(result, 'index.html', 'page name must match the document title');
});

test('structured data accepts middot HTML entity for a literal JSON middle dot', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<title>闫士博 · 研究型个人主页</title>',
    '<title>闫士博 &middot; 研究型个人主页</title>'
  );

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('structured data preserves common and numeric HTML entity decoding', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceMatching(
    rootDir,
    'index.html',
    /<title>[^<]*<\/title>/,
    '<title>A &amp; B&nbsp;&#183; C</title>'
  );
  mutateStructuredData(rootDir, 'index.html', (value) => {
    findStructuredNode(value, 'https://yan-shibo.github.io/#webpage').name = 'A & B · C';
  });

  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
});

test('structured data does not decode JSON entities for visible evidence', (t) => {
  const rootDir = createRepositoryFixture(t);
  mutateStructuredData(rootDir, 'projects.html', (value) => {
    findStructuredNode(value, STRUCTURED_PROJECT_IDS[0]).keywords[0] =
      'Ampersand &amp; marker';
  });
  replaceOnce(
    rootDir,
    'projects.html',
    '</body>',
    '<div>Ampersand &amp; marker</div>\n</body>'
  );

  const result = validateRepository(rootDir);

  assertStructuredIssue(
    result,
    'projects.html',
    'project keyword must appear in visible page text'
  );
});

for (const hiddenMarkup of [
  '<div hidden>Hidden-only project name</div>',
  '<div inert>Hidden-only project name</div>',
  '<div aria-hidden="true">Hidden-only project name</div>'
]) {
  test(`structured data excludes ${hiddenMarkup.split('>')[0]}> evidence`, (t) => {
    const rootDir = createRepositoryFixture(t);
    mutateStructuredData(rootDir, 'projects.html', (value) => {
      findStructuredNode(value, STRUCTURED_PROJECT_IDS[0]).name =
        'Hidden-only project name';
    });
    replaceOnce(rootDir, 'projects.html', '</body>', `${hiddenMarkup}\n</body>`);

    const result = validateRepository(rootDir);

    assertStructuredIssue(
      result,
      'projects.html',
      'project name must appear in visible page text'
    );
  });
}
