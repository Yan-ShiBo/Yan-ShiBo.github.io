const {
  assert,
  fs,
  path,
  test,
  validateRepository,
  createRepositoryFixture,
  replaceOnce,
  replaceMatching,
  STRUCTURED_PERSON_ID,
  STRUCTURED_WEBSITE_ID,
  STRUCTURED_PROJECT_IDS,
  STRUCTURED_RESEARCH_IDS,
  STRUCTURED_SCRIPT_PATTERN,
  readStructuredData,
  mutateStructuredData,
  findStructuredNode,
  replaceStructuredMarkup,
  assertStructuredIssue,
} = require('./support');

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
    issue: 'project list numberOfItems must be 10',
    mutate(value) {
      findStructuredNode(value, 'https://yan-shibo.github.io/projects.html#project-list')
        .numberOfItems = 3;
    }
  },
  {
    name: 'rejects a missing project list element',
    issue: 'project list must contain exactly 10 elements',
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
    issue: 'project list positions must be 1 through 10',
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
    issue: 'research list numberOfItems must be 3',
    mutate(value) {
      findStructuredNode(value, 'https://yan-shibo.github.io/research.html#research-topics')
        .numberOfItems = 4;
    }
  },
  {
    name: 'rejects a missing research list element',
    issue: 'research list must contain exactly 3 elements',
    mutate(value) {
      findStructuredNode(value, 'https://yan-shibo.github.io/research.html#research-topics')
        .itemListElement.pop();
    }
  },
  {
    name: 'rejects the wrong research order',
    issue: 'research list item order must match the approved inventory',
    mutate(value) {
      const elements = findStructuredNode(
        value,
        'https://yan-shibo.github.io/research.html#research-topics'
      ).itemListElement;
      [elements[0].item, elements[1].item] = [elements[1].item, elements[0].item];
    }
  },
  {
    name: 'rejects duplicate research positions',
    issue: 'research list positions must be 1 through 3',
    mutate(value) {
      findStructuredNode(value, 'https://yan-shibo.github.io/research.html#research-topics')
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
  const projectName = 'Noscript-only project name';
  mutateStructuredData(rootDir, 'projects.html', (value) => {
    findStructuredNode(value, STRUCTURED_PROJECT_IDS[0]).name = projectName;
  });
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
  const researchName = 'Noscript-only research name';
  mutateStructuredData(rootDir, 'research.html', (value) => {
    findStructuredNode(value, STRUCTURED_RESEARCH_IDS[0]).name = researchName;
  });
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
