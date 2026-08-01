const {
  assert,
  fs,
  os,
  path,
  test,
  resolveLocalReference,
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
  PROJECT_GRID_CSS_ISSUE,
  HOME_QUOTE_CSS_ISSUE,
  NOT_FOUND_LOCALIZATION_ISSUE,
  HOME_QUOTE_INVENTORY_ISSUE,
  HOME_HERO_STRUCTURE_ISSUE,
  HOME_SECTION_SEQUENCE_ISSUE,
  ENGLISH_TERMINOLOGY_ISSUE,
  MODAL_INERT_RESTORE_ISSUE,
  createRepositoryFixture,
  replaceOnce,
  replaceMatching,
  validateSiteScriptFixture,
  validateModalSiteScriptFixture,
  modalInertFunctionLines,
} = require('./support');

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
  const html = fs.readFileSync(
    path.resolve(__dirname, '..', '..', '404.html'),
    'utf8'
  );

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
  const rootDir = path.resolve(__dirname, '..', '..');
  const result = validateRepository(rootDir);

  assert.deepEqual(result.issues, []);
  assert.equal(result.summary.htmlFiles, 14);
  assert.equal(result.summary.indexablePages, 12);
  assert.equal(result.summary.sitemapUrls, 12);
});

test('validateRepository accepts approved profile contacts, proof rails, and project grids', (t) => {
  const rootDir = path.resolve(__dirname, '..', '..');
  const result = validateRepository(rootDir);

  for (const file of ['profile.html', 'en/profile.html']) {
    assert.ok(!result.issues.includes(`${file}: ${PROFILE_CONTACTS_ISSUE}`));
  }
  assert.ok(!result.issues.includes(PROFILE_CONTACT_CSS_ISSUE));
  assert.ok(!result.issues.includes(PROOF_RAIL_CSS_ISSUE));
  assert.ok(!result.issues.includes(PROOF_RAIL_DRAG_ISSUE));
  assert.ok(!result.issues.includes(PROJECT_GRID_CSS_ISSUE));

  const fixtureRoot = createRepositoryFixture(t);
  replaceOnce(
    fixtureRoot,
    'assets/css/site.css',
    'repeat(auto-fit,minmax(min(100%,var(--project-card-min)),1fr))',
    'repeat(auto-fill,minmax(min(100%,var(--project-card-min)),1fr))'
  );
  const fixtureResult = validateRepository(fixtureRoot);
  assert.ok(fixtureResult.issues.includes(PROJECT_GRID_CSS_ISSUE));

  const featuredRoot = createRepositoryFixture(t);
  replaceOnce(
    featuredRoot,
    'assets/css/site.css',
    '.project-grid--featured{\n  --project-card-min:30rem;\n}',
    '.project-grid--featured{\n  --project-card-min:30rem;\n}\n.project-grid--featured{display:flex;grid-template-columns:none}'
  );
  const featuredResult = validateRepository(featuredRoot);
  assert.ok(featuredResult.issues.includes(PROJECT_GRID_CSS_ISSUE));
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

test('mobile home hero accepts the four-card dossier rail and ordered homepage sections', () => {
  const rootDir = path.resolve(__dirname, '..', '..');
  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
  for (const file of ['index.html', 'en/index.html']) {
    assert.ok(!result.issues.includes(`${file}: ${HOME_HERO_STRUCTURE_ISSUE}`));
    assert.ok(!result.issues.includes(`${file}: ${HOME_SECTION_SEQUENCE_ISSUE}`));
  }
});

test('mobile home hero rejects the old full-width card spacing', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '    --hero-rail-card:calc(100% - 56px);\n    --hero-rail-gutter:28px;',
    '    --hero-rail-card:calc(100vw - 32px);\n    --hero-rail-gutter:16px;'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));

  const endMarginRoot = createRepositoryFixture(t);
  replaceOnce(
    endMarginRoot,
    'assets/css/site.css',
    '  .hero .hero-side > :last-child{\n    margin-right:var(--hero-rail-gutter);\n  }',
    '  .hero .hero-side > :last-child{\n    margin-right:0;\n  }'
  );
  const endMarginResult = validateRepository(endMarginRoot);
  assert.ok(endMarginResult.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));

  const splitRuleRoot = createRepositoryFixture(t);
  replaceOnce(
    splitRuleRoot,
    'assets/css/site.css',
    '    --hero-rail-gutter:28px;\n    display:flex;\n    flex-direction:row;',
    '    --hero-rail-gutter:28px;\n    flex-direction:row;'
  );
  replaceOnce(
    splitRuleRoot,
    'assets/css/site.css',
    '  .hero .hero-side::-webkit-scrollbar{display:none}',
    '  .hero .hero-side{display:flex}\n  .hero .hero-side::-webkit-scrollbar{display:none}'
  );
  const splitRuleResult = validateRepository(splitRuleRoot);
  assert.ok(splitRuleResult.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects a restored fixed card height cap', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '    height:auto;\n    min-height:216px;\n    max-height:none;',
    '    height:216px;\n    min-height:216px;\n    max-height:216px;'
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

test('mobile home hero rejects an expanded quick-link grid gap', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '.home-quick-links{\n  display:grid;\n  grid-template-columns:repeat(2,minmax(0,1fr));\n  gap:8px;\n}',
    '.home-quick-links{\n  display:grid;\n  grid-template-columns:repeat(2,minmax(0,1fr));\n  gap:16px;\n}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects non-wrapping summary paragraphs', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .hero-side .meta-card > p{min-width:0;overflow-wrap:anywhere}',
    '  .hero-side .meta-card > p{min-width:auto;overflow-wrap:normal}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects quick-link buttons that cannot shrink', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '.home-quick-links .button{\n  min-width:0;',
    '.home-quick-links .button{\n  min-width:max-content;'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('home hero rejects an out-of-rail quick card, a fifth rail card, or a missing semantic side surface', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    'class="meta-card home-quick-card"',
    'class="meta-card home-quick-card-missing"'
  );
  replaceOnce(
    rootDir,
    'index.html',
    '</section>\n<section aria-labelledby="home-current-title"',
    '</section>\n<div class="meta-card home-quick-card"><div class="home-quick-links"></div></div>\n<section aria-labelledby="home-current-title"'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));

  const semanticRoot = createRepositoryFixture(t);
  replaceOnce(
    semanticRoot,
    'index.html',
    'class="surface hero-side-surface"',
    'class="surface"'
  );
  const semanticResult = validateRepository(semanticRoot);
  assert.ok(semanticResult.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));

  const fifthCardRoot = createRepositoryFixture(t);
  replaceOnce(
    fifthCardRoot,
    'index.html',
    '<div class="meta-card home-quick-card">',
    '<div class="meta-card"></div>\n<div class="meta-card home-quick-card">'
  );
  const fifthCardResult = validateRepository(fifthCardRoot);
  assert.ok(fifthCardResult.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));

  const reorderedCardsRoot = createRepositoryFixture(t);
  replaceOnce(
    reorderedCardsRoot,
    'index.html',
    'class="profile-card"',
    'class="card-order-placeholder"'
  );
  replaceOnce(
    reorderedCardsRoot,
    'index.html',
    'class="meta-card"',
    'class="profile-card"'
  );
  replaceOnce(
    reorderedCardsRoot,
    'index.html',
    'class="card-order-placeholder"',
    'class="meta-card"'
  );
  const reorderedCardsResult = validateRepository(reorderedCardsRoot);
  assert.ok(reorderedCardsResult.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));

  const shortQuickGridRoot = createRepositoryFixture(t);
  replaceOnce(
    shortQuickGridRoot,
    'index.html',
    '<a class="button small" href="https://github.com/Yan-ShiBo" rel="noopener noreferrer" target="_blank"><i aria-hidden="true" class="fa fa-github"></i> GitHub</a>\n',
    ''
  );
  const shortQuickGridResult = validateRepository(shortQuickGridRoot);
  assert.ok(shortQuickGridResult.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));

  const reorderedQuickLinksRoot = createRepositoryFixture(t);
  replaceOnce(
    reorderedQuickLinksRoot,
    'en/index.html',
    'class="button small primary" href="research.html"><i aria-hidden="true" class="fa fa-compass"></i> Research',
    'class="button small primary" href="quick-link-placeholder"><i aria-hidden="true" class="fa fa-compass"></i> Research'
  );
  replaceOnce(
    reorderedQuickLinksRoot,
    'en/index.html',
    'class="button small" href="projects.html"><i aria-hidden="true" class="fa fa-code-fork"></i> Projects',
    'class="button small" href="research.html"><i aria-hidden="true" class="fa fa-code-fork"></i> Projects'
  );
  replaceOnce(
    reorderedQuickLinksRoot,
    'en/index.html',
    'class="button small primary" href="quick-link-placeholder"><i aria-hidden="true" class="fa fa-compass"></i> Research',
    'class="button small primary" href="projects.html"><i aria-hidden="true" class="fa fa-compass"></i> Research'
  );
  const reorderedQuickLinksResult = validateRepository(reorderedQuickLinksRoot);
  assert.ok(reorderedQuickLinksResult.issues.includes(`en/index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));

  const wrongProfileLinkRoot = createRepositoryFixture(t);
  replaceOnce(
    wrongProfileLinkRoot,
    'index.html',
    '<a class="button small" href="profile.html"><i aria-hidden="true" class="fa fa-user-o"></i> 个人档案</a>',
    '<a class="button small" href="resume.html"><i aria-hidden="true" class="fa fa-user-o"></i> 个人档案</a>'
  );
  const wrongProfileLinkResult = validateRepository(wrongProfileLinkRoot);
  assert.ok(wrongProfileLinkResult.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home quick card ignores a template decoy', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    'class="meta-card home-quick-card"',
    'class="meta-card home-quick-card-missing"'
  );
  replaceOnce(
    rootDir,
    'en/index.html',
    '</section>\n<section aria-labelledby="home-current-title"',
    '</section>\n<template><div class="meta-card home-quick-card"><div class="home-quick-links"></div></div></template>\n<section aria-labelledby="home-current-title"'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`en/index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home quick links reject a hook moved to another rail card', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    'class="meta-card home-quick-card"',
    'class="meta-card home-quick-card-missing"'
  );
  replaceOnce(
    rootDir,
    'index.html',
    'class="meta-card"',
    'class="meta-card home-quick-card"'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home hero rejects duplicate quick or rail hooks and legacy stats hooks', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    'class="meta-card"',
    'class="meta-card home-quick-card"'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`en/index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));

  for (const legacyClass of ['meta-card--stats', 'hero-stats']) {
    const legacyRoot = createRepositoryFixture(t);
    replaceOnce(
      legacyRoot,
      'en/index.html',
      'class="meta-card home-quick-card"',
      `class="meta-card home-quick-card ${legacyClass}"`
    );
    const legacyResult = validateRepository(legacyRoot);
    assert.ok(legacyResult.issues.includes(`en/index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
  }

  const duplicateRailRoot = createRepositoryFixture(t);
  replaceOnce(
    duplicateRailRoot,
    'en/index.html',
    'class="meta-card"',
    'class="meta-card hero-side"'
  );
  const duplicateRailResult = validateRepository(duplicateRailRoot);
  assert.ok(duplicateRailResult.issues.includes(`en/index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('mobile quick-link layout rejects widened button padding', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  padding-left:10px;\n  padding-right:10px;',
    '  padding-left:18px;\n  padding-right:18px;'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile quick-link layout rejects undersized touch targets', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .hero-side .home-quick-links .button{min-height:44px;font-size:13px}',
    '  .hero-side .home-quick-links .button{min-height:32px;font-size:13px}'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('home structure accepts a quoted comparison attribute', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<section aria-labelledby="home-current-title"',
    '<section data-note="1 > 0" aria-labelledby="home-current-title"'
  );

  const result = validateRepository(rootDir);

  assert.ok(!result.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
  assert.ok(!result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('mobile home hero rejects non-wrapping quick-link labels', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  white-space:normal;\n  text-wrap:wrap;',
    '  white-space:nowrap;\n  text-wrap:nowrap;'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('mobile home hero rejects oversized quick-link labels', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '  .hero-side .home-quick-links .button{min-height:44px;font-size:13px}',
    '  .hero-side .home-quick-links .button{min-height:44px;font-size:17px}'
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

  const positionalRoot = createRepositoryFixture(t);
  replaceOnce(
    positionalRoot,
    'assets/css/site.css',
    '  .home-hero > .hero-side-surface{',
    '  .home-hero > .hero-side-surface,\n  .home-hero > aside:nth-child(2){'
  );
  const positionalResult = validateRepository(positionalRoot);
  assert.ok(positionalResult.issues.includes(HOME_HERO_MOBILE_CSS_ISSUE));
});

test('home quotation rejects missing copy or a muted primary quote', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(rootDir, 'index.html', 'class="quote-text"', 'class="quote-copy"');

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(HOME_QUOTE_INVENTORY_ISSUE));

  const cssRoot = createRepositoryFixture(t);
  replaceOnce(
    cssRoot,
    'assets/css/site.css',
    '.main-shell > .section-block.tile-dark > .quote-block > .quote-text{color:var(--on-dark)}',
    '.main-shell > .section-block.tile-dark > .quote-block > .quote-text{color:var(--body-muted)}'
  );
  const cssResult = validateRepository(cssRoot);
  assert.ok(cssResult.issues.includes(HOME_QUOTE_CSS_ISSUE));

  const cascadeRoot = createRepositoryFixture(t);
  replaceOnce(
    cascadeRoot,
    'assets/css/site.css',
    '.main-shell > .section-block.tile-dark > .quote-block > .quote-text{color:var(--on-dark)}',
    '.main-shell > .section-block.tile-dark > .quote-block > .quote-text{color:var(--on-dark)}\n#main-content .quote-band p{color:var(--body-muted)}'
  );
  const cascadeResult = validateRepository(cascadeRoot);
  assert.ok(cascadeResult.issues.includes(HOME_QUOTE_CSS_ISSUE));

  const sourceCascadeRoot = createRepositoryFixture(t);
  replaceOnce(
    sourceCascadeRoot,
    'assets/css/site.css',
    '.main-shell > .section-block.tile-dark > .quote-block > .quote-source{color:var(--body-muted)}',
    '.main-shell > .section-block.tile-dark > .quote-block > .quote-source{color:var(--body-muted)}\n#main-content .quote-band footer{color:var(--on-dark)}'
  );
  const sourceCascadeResult = validateRepository(sourceCascadeRoot);
  assert.ok(sourceCascadeResult.issues.includes(HOME_QUOTE_CSS_ISSUE));
});

test('home quotation rejects a duplicate quotation', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    '<p class="quote-text">',
    '<p class="quote-text">Duplicate quotation.</p><p class="quote-text">'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(
    'en/index.html: home quotation must include exactly one quote-text and no duplicate poem-note'
  ));
});

test('home section sequence rejects reordered roles, missing tones, or a duplicate quote band', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<section aria-labelledby="home-current-title" class="section-block section-muted" data-reveal="">',
    '<section aria-labelledby="home-current-title" class="section-block tile-dark" data-reveal="">'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));

  const reorderedRoot = createRepositoryFixture(t);
  replaceOnce(
    reorderedRoot,
    'index.html',
    'aria-labelledby="home-current-title"',
    'aria-labelledby="home-role-placeholder"'
  );
  replaceOnce(
    reorderedRoot,
    'index.html',
    'aria-labelledby="home-updates-title"',
    'aria-labelledby="home-current-title"'
  );
  replaceOnce(
    reorderedRoot,
    'index.html',
    'aria-labelledby="home-role-placeholder"',
    'aria-labelledby="home-updates-title"'
  );
  const reorderedResult = validateRepository(reorderedRoot);
  assert.ok(reorderedResult.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));

  const updatesToneRoot = createRepositoryFixture(t);
  replaceOnce(
    updatesToneRoot,
    'index.html',
    '<section aria-labelledby="home-updates-title" class="section-block" data-reveal="">',
    '<section aria-labelledby="home-updates-title" class="section-block section-muted" data-reveal="">'
  );
  const updatesToneResult = validateRepository(updatesToneRoot);
  assert.ok(updatesToneResult.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));

  const beyondToneRoot = createRepositoryFixture(t);
  replaceOnce(
    beyondToneRoot,
    'index.html',
    '<section aria-labelledby="home-beyond-title" class="section-block section-muted" data-reveal="">',
    '<section aria-labelledby="home-beyond-title" class="section-block" data-reveal="">'
  );
  const beyondToneResult = validateRepository(beyondToneRoot);
  assert.ok(beyondToneResult.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));

  const missingQuoteToneRoot = createRepositoryFixture(t);
  replaceOnce(
    missingQuoteToneRoot,
    'index.html',
    '<section class="section-block tile-dark quote-band" data-reveal="">',
    '<section class="section-block quote-band" data-reveal="">'
  );
  const missingQuoteToneResult = validateRepository(missingQuoteToneRoot);
  assert.ok(missingQuoteToneResult.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));

  const duplicateQuoteRoot = createRepositoryFixture(t);
  replaceOnce(
    duplicateQuoteRoot,
    'index.html',
    '</main>',
    '<section class="section-block tile-dark quote-band"></section>\n</main>'
  );
  const duplicateQuoteResult = validateRepository(duplicateQuoteRoot);
  assert.ok(duplicateQuoteResult.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));

  const nestedQuoteRoot = createRepositoryFixture(t);
  replaceOnce(
    nestedQuoteRoot,
    'index.html',
    '<section aria-labelledby="home-beyond-title" class="section-block section-muted" data-reveal="">',
    '<section aria-labelledby="home-beyond-title" class="section-block section-muted" data-reveal=""><section class="section-block tile-dark quote-band"></section>'
  );
  const nestedQuoteResult = validateRepository(nestedQuoteRoot);
  assert.ok(nestedQuoteResult.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));

  const leadingContentRoot = createRepositoryFixture(t);
  replaceOnce(
    leadingContentRoot,
    'index.html',
    '<main class="main-shell" id="main-content">',
    '<main class="main-shell" id="main-content"><div>Unexpected leading content</div>'
  );
  const leadingContentResult = validateRepository(leadingContentRoot);
  assert.ok(leadingContentResult.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence ignores a raw-text aria decoy', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    '<section aria-labelledby="home-current-title" class="section-block section-muted" data-reveal="">',
    '<section class="section-block section-muted" data-reveal="">'
  );
  replaceOnce(
    rootDir,
    'en/index.html',
    '</main>\n<footer class="footer-shell">',
    '</main>\n<script type="text/plain"><section aria-labelledby="home-current-title" class="section-block section-muted"><h2 id="home-current-title">Decoy</h2></section></script>\n<footer class="footer-shell">'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`en/index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence rejects a mismatched heading id', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    'id="home-current-title"',
    'id="home-current-heading"'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`en/index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence rejects a hidden semantic heading', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<h2 id="home-current-title">',
    '<h2 class="visually-hidden" id="home-current-title">'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));

  const hiddenSectionRoot = createRepositoryFixture(t);
  replaceOnce(
    hiddenSectionRoot,
    'index.html',
    '<section aria-labelledby="home-current-title"',
    '<section hidden="" aria-labelledby="home-current-title"'
  );
  const hiddenSectionResult = validateRepository(hiddenSectionRoot);
  assert.ok(hiddenSectionResult.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence requires descendant h2 headings', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    '<h2 id="home-updates-title">Recent updates.</h2>',
    '<p id="home-updates-title">Recent updates.</p>'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`en/index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
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

test('validateRepository requires mobile navigation and touch targets in the same CSS media block', (t) => {
  const navigationRootDir = createRepositoryFixture(t);
  replaceOnce(
    navigationRootDir,
    'assets/css/site.css',
    '  .site-nav{display:none}\n  .menu-toggle{display:inline-flex}',
    '  .site-nav{display:none}\n}\n\n@media (max-width:833px){\n  .menu-toggle{display:inline-flex}'
  );

  const navigationResult = validateRepository(navigationRootDir);

  assert.ok(navigationResult.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));

  const touchTargetRootDir = createRepositoryFixture(t);
  replaceOnce(
    touchTargetRootDir,
    'assets/css/site.css',
    '  .brand{min-height:var(--header-h)}\n',
    ''
  );

  const touchTargetResult = validateRepository(touchTargetRootDir);

  assert.ok(touchTargetResult.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
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
  const rootDir = path.resolve(__dirname, '..', '..');
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
