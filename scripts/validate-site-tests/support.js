const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const nodeTest = require('node:test');

const {
  resolveLocalReference,
  runCli,
  stripUrlDecorations,
  validateRepository
} = require('../validate-site');
const {
  EXPECTED_VALIDATOR_TEST_COUNT,
  expectedTestsForShard,
  parseValidatorTestShard
} = require('../validator-test-shard');

const validatorTestShard = parseValidatorTestShard(
  process.env.VALIDATOR_TEST_SHARD
);
let discoveredValidatorTests = 0;
let selectedValidatorTests = 0;
const registeredValidatorTestNames = new Set();

function test(name, ...args) {
  if (registeredValidatorTestNames.has(name)) {
    throw new Error(`duplicate validator test name: ${JSON.stringify(name)}`);
  }
  registeredValidatorTestNames.add(name);

  const options = args[0];
  if (options !== null && typeof options === 'object') {
    for (const directive of ['skip', 'todo', 'only']) {
      if (Reflect.has(options, directive)) {
        throw new Error(
          `validator test ${JSON.stringify(name)} must not declare ${directive}`
        );
      }
    }
  }

  const ordinal = discoveredValidatorTests;
  discoveredValidatorTests += 1;
  if (ordinal % validatorTestShard.total !== validatorTestShard.index) return undefined;

  selectedValidatorTests += 1;
  return nodeTest(name, ...args);
}

function verifyValidatorTestShard() {
  assert.equal(
    discoveredValidatorTests,
    EXPECTED_VALIDATOR_TEST_COUNT,
    'validator test inventory must match docs/testing.md'
  );
  assert.ok(
    validatorTestShard.total <= EXPECTED_VALIDATOR_TEST_COUNT,
    'VALIDATOR_TEST_SHARD must not create empty shards'
  );

  const expectedSelectedTests = validatorTestShard.total === 1
    ? EXPECTED_VALIDATOR_TEST_COUNT
    : expectedTestsForShard(validatorTestShard.index + 1);
  assert.equal(
    selectedValidatorTests,
    expectedSelectedTests,
    'validator test shard must select its complete partition'
  );

  if (validatorTestShard.total > 1) {
    process.stdout.write(
      `Validator test shard ${validatorTestShard.index + 1}/` +
        `${validatorTestShard.total}: ${selectedValidatorTests}/` +
        `${EXPECTED_VALIDATOR_TEST_COUNT} tests\n`
    );
  }
}

const FIXTURE_ROOT_EXTENSIONS = new Set([
  '.html',
  '.txt',
  '.webmanifest',
  '.xml'
]);
const FIXTURE_SOURCE_DIRECTORIES = [
  'assets',
  'en'
];
const FIXTURE_SOURCE_FILES = [
  'docs/Shibo-Yan-Resume.pdf',
  'docs/Shibo-Yan-Undergraduate-Transcript.pdf',
  'scripts/generate-sitemap.js',
  'scripts/run-validator-tests.js',
  'scripts/validate-site.js',
  'scripts/validator-test-shard.js',
  'worker/src/index.mjs'
];
const FIXTURE_CONTENT_FILES = new Set([
  'assets/css/site.css',
  'assets/icons/app-icon-192.png',
  'assets/icons/app-icon-512.png',
  'assets/icons/brand-mark.png',
  'assets/icons/site.ico',
  'assets/js/site.js',
  'assets/js/stats.js',
  'assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css',
  'manifest.en.webmanifest',
  'manifest.webmanifest',
  'robots.txt',
  'scripts/generate-sitemap.js',
  'scripts/run-validator-tests.js',
  'scripts/validate-site.js',
  'scripts/validator-test-shard.js',
  'sitemap.xml',
  'worker/src/index.mjs'
]);
const EMPTY_FIXTURE_CONTENT = Buffer.alloc(0);
let repositoryFixtureSnapshot;

const MENU_CLEANUP_ISSUE =
  'assets/js/site.js: mobile menu cleanup must share the (max-width: 833px) breakpoint predicate';
const MOBILE_CSS_BREAKPOINT_ISSUE =
  'assets/css/site.css: mobile navigation and 44px touch-target rules must share one (max-width: 833px) media block';
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
  'index.html: home quotation must include exactly one quote-text and no duplicate poem-note';
const HOME_STATS_CARD_MARKUP_ISSUE =
  'home hero must include exactly one meta-card--stats card wrapping the hero stats grid';
const HOME_OVERVIEW_HEADING_ISSUE =
  'home overview must use one section-block section-muted with a visually hidden h2 referenced by aria-labelledby, followed by one tile-dark quote-band';
const ENGLISH_TERMINOLOGY_ISSUE =
  'en/index.html: English copy uses legacy terminology; replace "graduation design" with "undergraduate capstone project"';
const MODAL_INERT_RESTORE_ISSUE =
  'assets/js/site.js: modal background cleanup must restore each element\'s pre-existing inert state';
const STATS_INTEGER_CONTRACT_ISSUE =
  'assets/js/stats.js: Worker responses must expose non-negative ASCII decimal strings plus the approved period and start date';
const STATS_ZERO_CONTRACT_ISSUE =
  'assets/js/stats.js: zero must remain a valid public counter';
const STATS_UNAVAILABLE_CONTRACT_ISSUE =
  'assets/js/stats.js: invalid or unavailable Worker responses must render -- and end in warn state';
const STATS_STATUS_MARKUP_ISSUE =
  'stats status must start in loading state and expose a polite atomic status live region';
const STATS_LOADING_CONTRACT_ISSUE =
  'assets/js/stats.js: public statistics must make one JSON POST with a five-second abort deadline and loading, ok, and warn states';
const STATS_ENDPOINT_MARKUP_ISSUE =
  'stats pages must expose exactly one approved API endpoint meta and preconnect';
const STATS_LEGACY_RUNTIME_ISSUE =
  'legacy public-counter runtime references are forbidden';
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

function createRepositoryFixtureSnapshot(sourceRoot) {
  const directories = new Set();
  const files = [];

  function addSourceFile(relativePath) {
    const portablePath = relativePath.split(path.sep).join('/');
    const nativePath = portablePath.split('/').join(path.sep);
    const sourcePath = path.join(sourceRoot, nativePath);
    if (!fs.existsSync(sourcePath)) return;

    let relativeDirectory = path.dirname(nativePath);
    while (relativeDirectory !== '.') {
      directories.add(relativeDirectory);
      relativeDirectory = path.dirname(relativeDirectory);
    }

    files.push({
      contents:
        path.extname(portablePath).toLowerCase() === '.html' ||
        FIXTURE_CONTENT_FILES.has(portablePath)
          ? fs.readFileSync(sourcePath)
          : EMPTY_FIXTURE_CONTENT,
      relativePath: nativePath
    });
  }

  function addSourceDirectory(relativeDirectory) {
    const sourceDirectory = path.join(sourceRoot, relativeDirectory);
    if (!fs.existsSync(sourceDirectory)) return;

    const entries = fs.readdirSync(sourceDirectory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = path.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        addSourceDirectory(relativePath);
      } else {
        addSourceFile(relativePath);
      }
    }
  }

  const rootEntries = fs.readdirSync(sourceRoot, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of rootEntries) {
    if (
      !entry.isDirectory() &&
      FIXTURE_ROOT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
    ) {
      addSourceFile(entry.name);
    }
  }
  for (const relativeDirectory of FIXTURE_SOURCE_DIRECTORIES) {
    addSourceDirectory(relativeDirectory);
  }
  for (const relativePath of FIXTURE_SOURCE_FILES) {
    addSourceFile(relativePath);
  }

  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return {
    directories: [...directories].sort((left, right) => {
      const depthDelta =
        left.split(path.sep).length - right.split(path.sep).length;
      return depthDelta || left.localeCompare(right);
    }),
    files
  };
}

function getRepositoryFixtureSnapshot() {
  if (!repositoryFixtureSnapshot) {
    const sourceRoot = path.resolve(__dirname, '..', '..');
    repositoryFixtureSnapshot = createRepositoryFixtureSnapshot(sourceRoot);
  }
  return repositoryFixtureSnapshot;
}

function createRepositoryFixture(t) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ysb-site-fixture-'));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

  const snapshot = getRepositoryFixtureSnapshot();
  for (const relativeDirectory of snapshot.directories) {
    fs.mkdirSync(path.join(fixtureRoot, relativeDirectory));
  }
  for (const file of snapshot.files) {
    fs.writeFileSync(
      path.join(fixtureRoot, file.relativePath),
      file.contents
    );
  }

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
  'https://yan-shibo.github.io/#project-mic-family',
  'https://yan-shibo.github.io/#project-vision-obstacle-avoidance-rover',
  'https://yan-shibo.github.io/#project-local-read-translate',
  'https://yan-shibo.github.io/#project-bilingual-subtitle-pipeline',
  'https://yan-shibo.github.io/#project-photo-selector',
  'https://yan-shibo.github.io/#project-biliclaw-extended',
  'https://yan-shibo.github.io/#project-personal-knowledge-base',
  'https://yan-shibo.github.io/#project-codex-skills-kit',
  'https://yan-shibo.github.io/#project-portfolio'
];
const STRUCTURED_RESEARCH_IDS = [
  'https://yan-shibo.github.io/#research-trustworthy-control',
  'https://yan-shibo.github.io/#research-stochastic-reach-avoid',
  'https://yan-shibo.github.io/#research-learning-enabled-verification',
  'https://yan-shibo.github.io/#research-scalable-verification'
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

module.exports = {
  assert,
  crypto,
  fs,
  os,
  path,
  test,
  verifyValidatorTestShard,
  resolveLocalReference,
  runCli,
  stripUrlDecorations,
  validateRepository,
  MENU_CLEANUP_ISSUE,
  MOBILE_CSS_BREAKPOINT_ISSUE,
  RESUME_OVERFLOW_CSS_ISSUE,
  PROFILE_CONTACTS_ISSUE,
  PROFILE_CONTACT_CSS_ISSUE,
  PROOF_RAIL_CSS_ISSUE,
  PROOF_RAIL_DRAG_ISSUE,
  HOME_HERO_MOBILE_CSS_ISSUE,
  NOT_FOUND_LOCALIZATION_ISSUE,
  HOME_QUOTE_INVENTORY_ISSUE,
  HOME_STATS_CARD_MARKUP_ISSUE,
  HOME_OVERVIEW_HEADING_ISSUE,
  ENGLISH_TERMINOLOGY_ISSUE,
  MODAL_INERT_RESTORE_ISSUE,
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
  MANIFEST_INSTALL_ICONS,
  MANIFEST_FILES,
  MANIFEST_ICON_INVENTORY_ISSUE,
  PNG_SIGNATURE,
  FAVICON_SIZES,
  createStructurallyValidPng,
  createRepositoryFixture,
  replaceOnce,
  replaceMatching,
  readManifest,
  writeManifest,
  setManifestIcons,
  sortManifestIconsBySrc,
  cloneInstallIcons,
  assertManifestInventoryMutationRejected,
  mutateBinaryFile,
  readIcoEntry,
  appendIcoPngEntry,
  validateSiteScriptFixture,
  validateModalSiteScriptFixture,
  modalInertFunctionLines,
  snapshotFiles,
  toPosix,
  STRUCTURED_PERSON_ID,
  STRUCTURED_WEBSITE_ID,
  STRUCTURED_PROJECT_IDS,
  STRUCTURED_RESEARCH_IDS,
  STRUCTURED_SCRIPT_PATTERN,
  readStructuredData,
  writeStructuredData,
  mutateStructuredData,
  findStructuredNode,
  replaceStructuredMarkup,
  assertStructuredIssue,
};
