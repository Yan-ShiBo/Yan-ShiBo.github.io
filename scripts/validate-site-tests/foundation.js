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
  MOBILE_BOOTSTRAP_ISSUE,
  MOBILE_FOUNDATION_CSS_ISSUE,
  ANCHOR_FOLLOW_ISSUE,
  RESUME_RESPONSIVE_IMAGE_ISSUE,
  RESUME_OVERFLOW_CSS_ISSUE,
  PROFILE_CONTACTS_ISSUE,
  PROFILE_MODELING_AWARD_ISSUE,
  PROFILE_KTV_CONTRACT_ISSUE,
  PROFILE_CONTACT_CSS_ISSUE,
  RESUME_KTV_CONTRACT_ISSUE,
  RESUME_AWARDS_CONTRACT_ISSUE,
  RESUME_CCF_A_CONTRACT_ISSUE,
  RESUME_SERVICE_CONTRACT_ISSUE,
  RESUME_TYPOGRAPHY_CSS_ISSUE,
  RESUME_PDF_SOURCE_CONTRACT_ISSUE,
  PROOF_RAIL_CSS_ISSUE,
  PROOF_RAIL_DRAG_ISSUE,
  HOME_HERO_MOBILE_CSS_ISSUE,
  PROJECT_GRID_CSS_ISSUE,
  PROJECT_PAGE_STRUCTURE_ISSUE,
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

function assertContentMutationsRejected(t, issue, mutations) {
  for (const mutation of mutations) {
    const rootDir = createRepositoryFixture(t);
    mutation.mutate(rootDir);

    const result = validateRepository(rootDir);

    assert.ok(
      result.issues.includes(`${mutation.file}: ${issue}`),
      `${mutation.name}; received:\n${result.issues.join('\n')}`
    );
  }
}

test('resume and profile synchronized content rejects KTV, organization, or typography drift', (t) => {
  assertContentMutationsRejected(t, RESUME_KTV_CONTRACT_ISSUE, [
    {
      name: 'Chinese KTV entry restores legacy uni-app',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'Vue、Spring Boot、MyBatis-Plus 与 MySQL',
          'Vue、Spring Boot、MyBatis-Plus、MySQL 与 uni-app'
        );
      }
    },
    {
      name: 'English KTV entry restores legacy uni-app',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'Vue, Spring Boot, MyBatis-Plus, and MySQL',
          'Vue, Spring Boot, MyBatis-Plus, MySQL, and uni-app'
        );
      }
    },
    {
      name: 'Chinese KTV entry restores a decoupled-architecture claim',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'MicFamily：KTV 运营管理系统',
          'MicFamily：前后端分离的 KTV 运营管理系统'
        );
      }
    },
    {
      name: 'English KTV entry restores a decoupled-architecture claim',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'MicFamily: KTV Operations Management System',
          'MicFamily: Decoupled Front-End/Back-End KTV Operations Management System'
        );
      }
    },
    {
      name: 'Chinese KTV entry with the wrong internship period',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          '<div class="resume-entry__date">2022.06—2022.08</div>',
          '<div class="resume-entry__date">2022.06—2022.07</div>'
        );
      }
    },
    {
      name: 'English KTV entry with the wrong internship period',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          '<div class="resume-entry__date">2022.06—2022.08</div>',
          '<div class="resume-entry__date">2022.06—2022.07</div>'
        );
      }
    }
  ]);

  assertContentMutationsRejected(t, PROFILE_KTV_CONTRACT_ISSUE, [
    {
      name: 'Chinese profile KTV card restores legacy uni-app',
      file: 'profile.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          '<span>Vue</span><span>Spring Boot</span><span>MyBatis-Plus</span><span>MySQL</span>',
          '<span>Vue</span><span>Spring Boot</span><span>MyBatis-Plus</span><span>MySQL</span><span>uni-app</span>'
        );
      }
    },
    {
      name: 'English profile KTV card restores legacy uni-app',
      file: 'en/profile.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'The browser UI uses Vue;',
          'The browser UI uses Vue and uni-app;'
        );
      }
    },
    {
      name: 'Chinese profile KTV card omits MyBatis-Plus',
      file: 'profile.html',
      mutate(rootDir) {
        replaceOnce(rootDir, this.file, '<span>MyBatis-Plus</span>', '');
        replaceOnce(rootDir, this.file, 'Spring Boot、MyBatis-Plus 与 MySQL', 'Spring Boot 与 MySQL');
      }
    },
    {
      name: 'English profile KTV card restores a decoupled-architecture claim',
      file: 'en/profile.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'Project: MicFamily: KTV Operations Management System.',
          'Project: MicFamily KTV Management System with a Decoupled Front-End/Back-End Architecture.'
        );
      }
    }
  ]);

  assertContentMutationsRejected(t, RESUME_SERVICE_CONTRACT_ISSUE, [
    {
      name: 'Chinese organization section without the Student Union entry',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(rootDir, this.file, '计算机与信息科学学院 软件学院学生会', '计算机与信息科学学院 软件学院');
      }
    },
    {
      name: 'English organization section without the research-assistant role',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(rootDir, this.file, '<span>Research assistant</span>', '<span>Assistant</span>');
      }
    }
  ]);

  assertContentMutationsRejected(t, RESUME_AWARDS_CONTRACT_ISSUE, [
    {
      name: 'Chinese resume restores an extra 2025 honor outside the PDF selection',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          '<ul class="resume-award-list">',
          '<ul class="resume-award-list"><li><time datetime="2025">2025</time><span>“华为杯”第二十二届中国研究生数学建模竞赛三等奖</span></li>'
        );
      }
    },
    {
      name: 'English resume changes the PDF-selected graduate scholarship class',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'Additional graduate honors: Outstanding Individual in Academic, Scientific, and Technological Innovation and First-Class Graduate Academic Scholarship',
          'Additional graduate honors: Outstanding Individual in Academic, Scientific, and Technological Innovation and Second-Class Graduate Academic Scholarship'
        );
      }
    }
  ]);

  assertContentMutationsRejected(t, RESUME_TYPOGRAPHY_CSS_ISSUE, [
    {
      name: 'Resume page base type scale returns to 17px',
      file: 'assets/css/site.css',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          '.resume-page{\n  --resume-anchor-h:var(--anchor-h);\n  font-size:16px;',
          '.resume-page{\n  --resume-anchor-h:var(--anchor-h);\n  font-size:17px;'
        );
      }
    },
    {
      name: 'Organization and practice entries become bold again',
      file: 'assets/css/site.css',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          '.resume-service-section .resume-entry__heading h3,\n.resume-service-section .resume-entry__heading > span{\n  font-weight:400;',
          '.resume-service-section .resume-entry__heading h3,\n.resume-service-section .resume-entry__heading > span{\n  font-weight:600;'
        );
      }
    }
  ]);

  assertContentMutationsRejected(t, RESUME_PDF_SOURCE_CONTRACT_ISSUE, [
    {
      name: 'Downloadable resume is replaced by a generated PDF',
      file: 'docs/Shibo-Yan-Resume.pdf',
      mutate(rootDir) {
        fs.writeFileSync(
          path.join(rootDir, this.file),
          Buffer.from('%PDF-1.7\n% generated replacement\n', 'ascii')
        );
      }
    }
  ]);
});

test('modeling award requires the approved Certificate Authority Cup identity', (t) => {
  assertContentMutationsRejected(t, PROFILE_MODELING_AWARD_ISSUE, [
    {
      name: 'Chinese profile without the approved competition identity',
      file: 'profile.html',
      mutate(rootDir) {
        replaceMatching(
          rootDir,
          this.file,
          /第九届“认证杯”国际数学建模竞赛/g,
          '第九届国际数学建模竞赛'
        );
      }
    },
    {
      name: 'English profile without the approved competition identity',
      file: 'en/profile.html',
      mutate(rootDir) {
        replaceMatching(
          rootDir,
          this.file,
          /Certificate Authority Cup/g,
          'International Modeling Contest'
        );
      }
    }
  ]);

  assertContentMutationsRejected(t, RESUME_AWARDS_CONTRACT_ISSUE, [
    {
      name: 'Chinese resume without the approved competition identity',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          '第九届“认证杯”国际数学建模竞赛（小美赛）',
          '2020 国际数学建模竞赛'
        );
      }
    },
    {
      name: 'English resume without the approved competition identity',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'Certificate Authority Cup International Mathematical Contest in Modeling',
          'International Mathematical Contest in Modeling'
        );
      }
    }
  ]);
});

test('modeling award rejects MCM/ICM aliases even when approved wording remains', (t) => {
  assertContentMutationsRejected(t, PROFILE_MODELING_AWARD_ISSUE, [
    {
      name: 'Chinese profile with an MCM/ICM alias beside the approved identity',
      file: 'profile.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          '<main class="main-shell" id="main-content">',
          '<main class="main-shell" id="main-content"><p>MCM/ICM</p>'
        );
      }
    },
    {
      name: 'English profile with an MCM/ICM alias beside the approved identity',
      file: 'en/profile.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          '<main class="main-shell" id="main-content">',
          '<main class="main-shell" id="main-content"><p>MCM/ICM</p>'
        );
      }
    }
  ]);

  assertContentMutationsRejected(t, RESUME_AWARDS_CONTRACT_ISSUE, [
    {
      name: 'Chinese resume with an MCM/ICM alias beside the approved identity',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          '第九届“认证杯”国际数学建模竞赛（小美赛）Honorable Mention（荣誉奖）',
          '第九届“认证杯”国际数学建模竞赛（小美赛）Honorable Mention（荣誉奖，MCM/ICM）'
        );
      }
    },
    {
      name: 'English resume with an MCM/ICM alias beside the approved identity',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'Honorable Mention, 2020 Certificate Authority Cup International Mathematical Contest in Modeling',
          'Honorable Mention, 2020 Certificate Authority Cup International Mathematical Contest in Modeling (MCM/ICM)'
        );
      }
    }
  ]);
});

test('resume CCF A facts reject full-title or submission-status drift', (t) => {
  const title =
    'Formal Reach-Avoid Controller Synthesis for Stochastic Systems via Iterative Neural-Symbolic Learning';
  const shortenedTitle =
    'Formal Reach-Avoid Controller Synthesis for Stochastic Systems via Neural-Symbolic Learning';

  assertContentMutationsRejected(t, RESUME_CCF_A_CONTRACT_ISSUE, [
    {
      name: 'Chinese resume with a shortened CCF A title',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(rootDir, this.file, title, shortenedTitle);
      }
    },
    {
      name: 'English resume with a shortened CCF A title',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(rootDir, this.file, title, shortenedTitle);
      }
    },
    {
      name: 'Chinese resume with an in-review CCF A status',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          `<span class="resume-status">在投</span><div><cite>${title}`,
          `<span class="resume-status">在审</span><div><cite>${title}`
        );
      }
    },
    {
      name: 'English resume with an under-review CCF A status',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          `<span class="resume-status">Submitted</span><div><cite>${title}`,
          `<span class="resume-status">Under review</span><div><cite>${title}`
        );
      }
    }
  ]);
});

test('resume CCF A facts reject venue-class or author-order drift', (t) => {
  assertContentMutationsRejected(t, RESUME_CCF_A_CONTRACT_ISSUE, [
    {
      name: 'Chinese resume with CCF B venue classification',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'CCF A 类会议 · 第二作者（导师第一作者）',
          'CCF B 类会议 · 第二作者（导师第一作者）'
        );
      }
    },
    {
      name: 'English resume with CCF Class B venue classification',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'CCF Class A conference · Second author (advisor first)',
          'CCF Class B conference · Second author (advisor first)'
        );
      }
    },
    {
      name: 'Chinese resume with first-author CCF A attribution',
      file: 'resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'CCF A 类会议 · 第二作者（导师第一作者）',
          'CCF A 类会议 · 第一作者'
        );
      }
    },
    {
      name: 'English resume with first-author CCF A attribution',
      file: 'en/resume.html',
      mutate(rootDir) {
        replaceOnce(
          rootDir,
          this.file,
          'CCF Class A conference · Second author (advisor first)',
          'CCF Class A conference · First author'
        );
      }
    }
  ]);
});

test('validateRepository accepts approved profile contacts, proof rails, and project page contracts', (t) => {
  const rootDir = path.resolve(__dirname, '..', '..');
  const result = validateRepository(rootDir);

  for (const file of ['profile.html', 'en/profile.html']) {
    assert.ok(!result.issues.includes(`${file}: ${PROFILE_CONTACTS_ISSUE}`));
  }
  assert.ok(!result.issues.includes(PROFILE_CONTACT_CSS_ISSUE));
  assert.ok(!result.issues.includes(PROOF_RAIL_CSS_ISSUE));
  assert.ok(!result.issues.includes(PROOF_RAIL_DRAG_ISSUE));
  assert.ok(!result.issues.includes(PROJECT_GRID_CSS_ISSUE));
  for (const file of ['projects.html', 'en/projects.html']) {
    assert.ok(!result.issues.includes(`${file}: ${PROJECT_PAGE_STRUCTURE_ISSUE}`));
  }

  const fixtureRoot = createRepositoryFixture(t);
  replaceOnce(
    fixtureRoot,
    'assets/css/site.css',
    'repeat(auto-fit,minmax(min(100%,var(--project-card-min)),1fr))',
    'repeat(auto-fill,minmax(min(100%,var(--project-card-min)),1fr))'
  );
  const fixtureResult = validateRepository(fixtureRoot);
  assert.ok(fixtureResult.issues.includes(PROJECT_GRID_CSS_ISSUE));

  const projectCaseRoot = createRepositoryFixture(t);
  replaceOnce(
    projectCaseRoot,
    'assets/css/site.css',
    'grid-template-columns:minmax(0,11fr) minmax(17rem,9fr)',
    'grid-template-columns:minmax(0,10fr) minmax(17rem,10fr)'
  );
  const projectCaseResult = validateRepository(projectCaseRoot);
  assert.ok(projectCaseResult.issues.includes(PROJECT_GRID_CSS_ISSUE));

  const projectOrderRoot = createRepositoryFixture(t);
  replaceOnce(
    projectOrderRoot,
    'projects.html',
    'data-project-id="project-vision-obstacle-avoidance-rover"',
    'data-project-id="project-portfolio"'
  );
  const projectOrderResult = validateRepository(projectOrderRoot);
  assert.ok(projectOrderResult.issues.includes(
    `projects.html: ${PROJECT_PAGE_STRUCTURE_ISSUE}`
  ));

  const projectAnchorRoot = createRepositoryFixture(t);
  replaceOnce(
    projectAnchorRoot,
    'projects.html',
    'class="anchor-chip" href="#project-list"',
    'class="anchor-chip" href="#local-tools"'
  );
  const projectAnchorResult = validateRepository(projectAnchorRoot);
  assert.ok(projectAnchorResult.issues.includes(
    `projects.html: ${PROJECT_PAGE_STRUCTURE_ISSUE}`
  ));

  const projectTagRoot = createRepositoryFixture(t);
  replaceOnce(
    projectTagRoot,
    'projects.html',
    '<div class="project-stack"><span>Vue</span><span>Spring Boot</span><span>MyBatis-Plus</span><span>MySQL</span></div>',
    '<div class="project-stack"><span>Vue</span><span>Spring Boot</span><span>MyBatis-Plus</span><span>MySQL</span><span>Axios</span></div>'
  );
  const projectTagResult = validateRepository(projectTagRoot);
  assert.ok(projectTagResult.issues.includes(
    `projects.html: ${PROJECT_PAGE_STRUCTURE_ISSUE}`
  ));

  const projectFactRoot = createRepositoryFixture(t);
  replaceOnce(
    projectFactRoot,
    'projects.html',
    '<h3>MicFamily：KTV 运营管理系统</h3>',
    '<h3>MicFamily：前后端分离的 KTV 运营管理系统（uni-app）</h3>'
  );
  const projectFactResult = validateRepository(projectFactRoot);
  assert.ok(projectFactResult.issues.includes(
    `projects.html: ${PROJECT_PAGE_STRUCTURE_ISSUE}`
  ));
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
    '    --hero-rail-gutter:max(28px, var(--safe-left), var(--safe-right));\n' +
      '    --hero-rail-card:calc(100% - var(--hero-rail-gutter) - var(--hero-rail-gutter));',
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
    '    --hero-rail-gutter:max(28px, var(--safe-left), var(--safe-right));\n' +
      '    --hero-rail-card:calc(100% - var(--hero-rail-gutter) - var(--hero-rail-gutter));\n' +
      '    display:flex;\n    flex-direction:row;',
    '    --hero-rail-gutter:max(28px, var(--safe-left), var(--safe-right));\n' +
      '    --hero-rail-card:calc(100% - var(--hero-rail-gutter) - var(--hero-rail-gutter));\n' +
      '    flex-direction:row;'
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

test('home hero rejects a quick card moved outside the side rail', (t) => {
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
});

test('home hero requires the semantic side surface', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    'class="surface hero-side-surface"',
    'class="surface"'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home hero rejects a fifth side-rail card', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<div class="meta-card home-quick-card">',
    '<div class="meta-card"></div>\n<div class="meta-card home-quick-card">'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home hero rejects reordered side-rail cards', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    'class="profile-card"',
    'class="card-order-placeholder"'
  );
  replaceOnce(
    rootDir,
    'index.html',
    'class="meta-card"',
    'class="profile-card"'
  );
  replaceOnce(
    rootDir,
    'index.html',
    'class="card-order-placeholder"',
    'class="meta-card"'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home hero rejects a missing GitHub quick link', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<a class="button small" href="https://github.com/Yan-ShiBo" rel="noopener noreferrer" target="_blank"><i aria-hidden="true" class="fa fa-github"></i> GitHub</a>\n',
    ''
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home hero rejects reordered English quick links', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    'class="button small primary" href="research.html"><i aria-hidden="true" class="fa fa-compass"></i> Research',
    'class="button small primary" href="quick-link-placeholder"><i aria-hidden="true" class="fa fa-compass"></i> Research'
  );
  replaceOnce(
    rootDir,
    'en/index.html',
    'class="button small" href="projects.html"><i aria-hidden="true" class="fa fa-code-fork"></i> Projects',
    'class="button small" href="research.html"><i aria-hidden="true" class="fa fa-code-fork"></i> Projects'
  );
  replaceOnce(
    rootDir,
    'en/index.html',
    'class="button small primary" href="quick-link-placeholder"><i aria-hidden="true" class="fa fa-compass"></i> Research',
    'class="button small primary" href="projects.html"><i aria-hidden="true" class="fa fa-compass"></i> Research'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`en/index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home hero requires the profile quick-link route', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<a class="button small" href="profile.html"><i aria-hidden="true" class="fa fa-user-o"></i> 个人档案</a>',
    '<a class="button small" href="resume.html"><i aria-hidden="true" class="fa fa-user-o"></i> 个人档案</a>'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
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

test('home hero rejects a duplicate quick-card hook', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    'class="meta-card"',
    'class="meta-card home-quick-card"'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`en/index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home hero rejects the legacy meta-card stats hook', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    'class="meta-card home-quick-card"',
    'class="meta-card home-quick-card meta-card--stats"'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`en/index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home hero rejects the legacy hero stats hook', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    'class="meta-card home-quick-card"',
    'class="meta-card home-quick-card hero-stats"'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`en/index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
});

test('home hero rejects a duplicate side-rail hook', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'en/index.html',
    'class="meta-card"',
    'class="meta-card hero-side"'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`en/index.html: ${HOME_HERO_STRUCTURE_ISSUE}`));
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

test('home section sequence requires the current section muted tone', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<section aria-labelledby="home-current-title" class="section-block section-muted" data-reveal="">',
    '<section aria-labelledby="home-current-title" class="section-block tile-dark" data-reveal="">'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence rejects reordered current and updates roles', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    'aria-labelledby="home-current-title"',
    'aria-labelledby="home-role-placeholder"'
  );
  replaceOnce(
    rootDir,
    'index.html',
    'aria-labelledby="home-updates-title"',
    'aria-labelledby="home-current-title"'
  );
  replaceOnce(
    rootDir,
    'index.html',
    'aria-labelledby="home-role-placeholder"',
    'aria-labelledby="home-updates-title"'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence requires the updates section default tone', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<section aria-labelledby="home-updates-title" class="section-block" data-reveal="">',
    '<section aria-labelledby="home-updates-title" class="section-block section-muted" data-reveal="">'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence requires the beyond section muted tone', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<section aria-labelledby="home-beyond-title" class="section-block section-muted" data-reveal="">',
    '<section aria-labelledby="home-beyond-title" class="section-block" data-reveal="">'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence requires the quote band dark tone', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<section class="section-block tile-dark quote-band" data-reveal="">',
    '<section class="section-block quote-band" data-reveal="">'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence rejects a duplicate quote band', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '</main>',
    '<section class="section-block tile-dark quote-band"></section>\n</main>'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence rejects a nested quote band', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<section aria-labelledby="home-beyond-title" class="section-block section-muted" data-reveal="">',
    '<section aria-labelledby="home-beyond-title" class="section-block section-muted" data-reveal=""><section class="section-block tile-dark quote-band"></section>'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
});

test('home section sequence rejects leading main content', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<main class="main-shell" id="main-content">',
    '<main class="main-shell" id="main-content"><div>Unexpected leading content</div>'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
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
});

test('home section sequence rejects a hidden semantic section', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'index.html',
    '<section aria-labelledby="home-current-title"',
    '<section hidden="" aria-labelledby="home-current-title"'
  );
  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(`index.html: ${HOME_SECTION_SEQUENCE_ISSUE}`));
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
    '@media (max-width:833px){\n  .site-header,\n  .anchor-bar',
    '/* @media (max-width:833px){.site-nav{display:none}.menu-toggle{display:inline-flex}} */\n' +
      ':root{--media-decoy:"@media (max-width:833px){.site-nav{display:none}.menu-toggle{display:inline-flex}}"}\n' +
      '@media (max-width:832px){\n  .site-header,\n  .anchor-bar'
  );

  const result = validateRepository(rootDir);

  assert.ok(result.issues.includes(MOBILE_CSS_BREAKPOINT_ISSUE));
});

test('validateRepository rejects a mobile media block nested inside an outer supports rule', (t) => {
  const rootDir = createRepositoryFixture(t);
  replaceOnce(
    rootDir,
    'assets/css/site.css',
    '@media (max-width:833px){\n  .site-header,\n  .anchor-bar',
    '@supports (display:grid){\n@media (max-width:833px){\n  .site-header,\n  .anchor-bar'
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

test('validateRepository protects the shared mobile foundation and anchor follow behavior', (t) => {
  const mutations = [
    {
      file: 'index.html',
      search: 'width=device-width, initial-scale=1.0, viewport-fit=cover',
      replacement: 'width=device-width, initial-scale=1.0',
      issue: `index.html: ${MOBILE_BOOTSTRAP_ISSUE}`
    },
    {
      file: 'index.html',
      search: '<script src="./assets/js/site.js"></script>',
      replacement: '<script defer="" src="./assets/js/site.js"></script>',
      issue: `index.html: ${MOBILE_BOOTSTRAP_ISSUE}`
    },
    {
      file: 'assets/css/site.css',
      search: '  --safe-top:env(safe-area-inset-top, 0px);',
      replacement: '  --safe-top:0px;',
      issue: MOBILE_FOUNDATION_CSS_ISSUE
    },
    {
      file: 'assets/css/site.css',
      search: '  padding:48px max(24px, var(--safe-right), calc((100vw - 1180px) / 2))\n' +
        '    48px max(24px, var(--safe-left), calc((100vw - 1180px) / 2));',
      replacement: '  padding:48px max(24px, calc((100vw - 1180px) / 2));',
      issue: MOBILE_FOUNDATION_CSS_ISSUE
    },
    {
      file: 'assets/css/site.css',
      search: '  padding-left:max(24px, var(--safe-left), calc((100vw - var(--max-width)) / 2));\n' +
        '  padding-right:max(24px, var(--safe-right), calc((100vw - var(--max-width)) / 2));\n}\n\n.timeline-stage + .timeline-stage',
      replacement: '  padding-left:24px;\n  padding-right:24px;\n}\n\n.timeline-stage + .timeline-stage',
      issue: MOBILE_FOUNDATION_CSS_ISSUE
    },
    {
      file: 'assets/css/site.css',
      search: '.anchor-chip[aria-current="location"]',
      replacement: '.anchor-chip[aria-current="page"]',
      issue: MOBILE_FOUNDATION_CSS_ISSUE
    },
    {
      file: 'assets/js/site.js',
      search: "      var rail = current.closest('.anchor-bar');",
      replacement: "      var rail = current.closest('.anchor-scroll');",
      issue: ANCHOR_FOLLOW_ISSUE
    },
    {
      file: 'assets/js/site.js',
      search: '  initializeThemeBeforePaint();',
      replacement: '',
      issue: `assets/js/site.js: ${MOBILE_BOOTSTRAP_ISSUE}`
    },
    {
      file: 'assets/css/site.css',
      search: '@media (max-width:760px){\n  .resume-page .resume-sidebar .surface-inner{\n    display:flex;',
      replacement: '@media (max-width:760px){\n  .resume-page .resume-sidebar .surface-inner{\n    display:grid;',
      issue: MOBILE_FOUNDATION_CSS_ISSUE
    }
  ];

  for (const mutation of mutations) {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(
      rootDir,
      mutation.file,
      mutation.search,
      mutation.replacement
    );
    const result = validateRepository(rootDir);
    assert.ok(
      result.issues.includes(mutation.issue),
      `${mutation.file} mutation must report ${mutation.issue}`
    );
  }
});

test('validateRepository protects responsive resume portrait sources and budgets', (t) => {
  const markupMutations = [
    {
      file: 'resume.html',
      search: '<source sizes="(max-width: 419px) 88px, (max-width: 760px) 104px, (max-width: 1068px) 240px, 320px" srcset="./assets/profile/resume-photo-240.avif',
      replacement: '<source srcset="./assets/profile/resume-photo-240.avif'
    },
    {
      file: 'en/resume.html',
      search: 'type="image/webp"',
      replacement: 'type="image/jpeg"'
    },
    {
      file: 'resume.html',
      search: './assets/profile/resume-photo-480.avif 480w',
      replacement: './assets/profile/resume-photo-480.avif 240w'
    },
    {
      file: 'en/resume.html',
      search: 'sizes="(max-width: 419px) 88px, (max-width: 760px) 104px, (max-width: 1068px) 240px, 320px" src="../assets/profile/resume-photo.jpg"',
      replacement: 'sizes="100vw" src="../assets/profile/resume-photo.jpg"'
    }
  ];

  for (const mutation of markupMutations) {
    const rootDir = createRepositoryFixture(t);
    replaceOnce(rootDir, mutation.file, mutation.search, mutation.replacement);
    const result = validateRepository(rootDir);
    assert.ok(
      result.issues.includes(`${mutation.file}: ${RESUME_RESPONSIVE_IMAGE_ISSUE}`)
    );
  }

  const missingAssetRoot = createRepositoryFixture(t);
  fs.unlinkSync(path.join(
    missingAssetRoot,
    'assets',
    'profile',
    'resume-photo-240.avif'
  ));
  const missingAssetResult = validateRepository(missingAssetRoot);
  assert.ok(missingAssetResult.issues.includes(
    `resume.html: ${RESUME_RESPONSIVE_IMAGE_ISSUE}`
  ));

  const emptyAssetRoot = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(
      emptyAssetRoot,
      'assets',
      'profile',
      'resume-photo-480.avif'
    ),
    Buffer.alloc(0)
  );
  const emptyAssetResult = validateRepository(emptyAssetRoot);
  assert.ok(emptyAssetResult.issues.includes(
    `resume.html: ${RESUME_RESPONSIVE_IMAGE_ISSUE}`
  ));

  const oversizedAssetRoot = createRepositoryFixture(t);
  fs.writeFileSync(
    path.join(
      oversizedAssetRoot,
      'assets',
      'profile',
      'resume-photo-240.webp'
    ),
    Buffer.alloc(20 * 1024 + 1)
  );
  const oversizedAssetResult = validateRepository(oversizedAssetRoot);
  assert.ok(oversizedAssetResult.issues.includes(
    `en/resume.html: ${RESUME_RESPONSIVE_IMAGE_ISSUE}`
  ));
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
