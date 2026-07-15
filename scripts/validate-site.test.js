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
  '.txt',
  '.webmanifest',
  '.xml'
]);

const MENU_CLEANUP_ISSUE =
  'assets/js/site.js: missing 834px desktop breakpoint menu cleanup';

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

function validateSiteScriptFixture(t, sourceLines) {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(rootDir, 'assets/js/site.js'),
    [...sourceLines, ''].join('\n')
  );
  return validateRepository(rootDir);
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

test('validateRepository accepts the checked-in site baseline', () => {
  const rootDir = path.resolve(__dirname, '..');
  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
  assert.equal(result.summary.htmlFiles, 14);
  assert.equal(result.summary.indexablePages, 12);
  assert.equal(result.summary.sitemapUrls, 12);
});

test('validateRepository requires desktop breakpoint menu cleanup', (t) => {
  const result = validateSiteScriptFixture(t, [
    '(function () {',
    '  var desktopMenuQuery = window.matchMedia("(min-width: 834px)");',
    '  void desktopMenuQuery;',
    '}());'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository requires the breakpoint handler to inspect event.matches', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var desktopMenuQuery = window.matchMedia("(min-width: 834px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (!document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'desktopMenuQuery.addEventListener("change", handleMenuBreakpointChange);'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository requires closeMenu inside the breakpoint handler', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var desktopMenuQuery = window.matchMedia("(min-width: 834px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (!event.matches || !document.body.classList.contains("menu-open")) return;',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'desktopMenuQuery.addEventListener("change", handleMenuBreakpointChange);',
    'function unrelated() {',
    '  closeMenu(false);',
    '}'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository binds cleanup to the 834px media query', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var desktopMenuQuery = window.matchMedia("(min-width: 900px)");',
    'var unrelated = window.matchMedia("(min-width: 834px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (!event.matches || !document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'desktopMenuQuery.addEventListener("change", handleMenuBreakpointChange);',
    'void unrelated;'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository requires a visible desktop focus fallback', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var desktopMenuQuery = window.matchMedia("(min-width: 834px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (!event.matches || !document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '}',
    'desktopMenuQuery.addEventListener("change", handleMenuBreakpointChange);'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository ignores commented-out breakpoint cleanup', (t) => {
  const result = validateSiteScriptFixture(t, [
    '// var desktopMenuQuery = window.matchMedia("(min-width: 834px)");',
    'function handleMenuBreakpointChange(event) {',
    '  /*',
    '  if (!event.matches || !document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '  */',
    '}',
    '// desktopMenuQuery.addEventListener("change", handleMenuBreakpointChange);'
  ]);

  assert.ok(result.issues.includes(MENU_CLEANUP_ISSUE));
});

test('validateRepository preserves comment-like text inside JavaScript literals', (t) => {
  const result = validateSiteScriptFixture(t, [
    'var commentLikePattern = /[/*]/;',
    'var commentLikeUrl = "https://example.com/*not-comment*/";',
    'var desktopMenuQuery = window.matchMedia("(min-width: 834px)");',
    'function handleMenuBreakpointChange(event) {',
    '  if (!event.matches || !document.body.classList.contains("menu-open")) return;',
    '  closeMenu(false);',
    '  var desktopTarget = document.querySelector(\'.site-nav [aria-current="page"]\') ||',
    '    document.querySelector(\'.site-nav a\');',
    '  focusNode(desktopTarget);',
    '}',
    'desktopMenuQuery.addEventListener("change", handleMenuBreakpointChange);',
    'void commentLikePattern;',
    'void commentLikeUrl;'
  ]);

  assert.ok(!result.issues.includes(MENU_CLEANUP_ISSUE));
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
  replaceOnce(
    rootDir,
    'sitemap.xml',
    '    <lastmod>2026-06-24</lastmod>',
    '    <lastmod>2026-06-24</lastmod>\n' +
      '    <xhtml:link rel="wrong" hreflang="en" href="https://yan-shibo.github.io/en/" />'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'index.html: hreflang en link must use rel="alternate"'
  ));
  assert.ok(result.issues.includes(
    'sitemap.xml: https://yan-shibo.github.io/ has a hreflang en link without rel="alternate"'
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

test('validateRepository rejects manifest sizes that differ from ICO layers', (t) => {
  const rootDir = createRepositoryFixture(t);
  const manifestPath = path.join(rootDir, 'manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.icons[0].sizes = '32x32';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'manifest.webmanifest: icons[0].sizes declares "32x32" but ICO contains "16x16 32x32 48x48 256x256"'
  ));
});

test('validateRepository safely reports a truncated ICO directory', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(rootDir, 'assets/icons/site.ico'),
    Buffer.from([0, 0, 1, 0, 2, 0])
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'manifest.webmanifest: icons[0] references invalid ICO assets/icons/site.ico: truncated icon directory'
  ));
});

test('validateRepository rejects ICO image data that overlaps its directory', (t) => {
  const rootDir = createRepositoryFixture(t);
  const icoPath = path.join(rootDir, 'assets/icons/site.ico');
  const ico = fs.readFileSync(icoPath);
  ico.writeUInt32LE(0, 6 + 12);
  fs.writeFileSync(icoPath, ico);

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'manifest.webmanifest: icons[0] references invalid ICO assets/icons/site.ico: icon entry 0 image data overlaps the icon directory'
  ));
});

test('validateRepository distinguishes invalid manifest sizes from missing sizes', (t) => {
  const rootDir = createRepositoryFixture(t);
  const manifestPath = path.join(rootDir, 'manifest.webmanifest');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.icons[0].sizes = 123;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'manifest.webmanifest: icons[0].sizes is invalid (123); ICO contains "16x16 32x32 48x48 256x256"'
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
