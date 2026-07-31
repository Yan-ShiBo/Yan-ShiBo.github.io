const {
  assert,
  fs,
  path,
  test,
  runCli,
  validateRepository,
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
  snapshotFiles,
} = require('./support');

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

  const platformDiagnostics = new Set([
    'index.html: path casing mismatch for ./assets/profile/PHOTO.jpg',
    'index.html: missing local target ./assets/profile/PHOTO.jpg -> ' +
      'assets/profile/PHOTO.jpg'
  ]);
  assert.ok(
    result.issues.some((issue) => platformDiagnostics.has(issue)),
    result.issues.join('\n')
  );
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

test('fixture inventory is isolated and validation does not modify it', (t) => {
  const rootDir = createRepositoryFixture(t);
  for (const relativePath of [
    'assets/icons/site.ico',
    'assets/images/baidu-elite-certificate.png',
    'docs/Shibo-Yan-Resume.pdf',
    'scripts/run-validator-tests.js',
    'worker/src/index.mjs'
  ]) {
    assert.ok(
      fs.existsSync(path.join(rootDir, relativePath)),
      `${relativePath} must be present in the fixture inventory`
    );
  }
  for (const relativePath of [
    '.baoyu-skills',
    '.github',
    'README.md',
    'scripts/validate-site.test.js',
    'scripts/validate-site-tests',
    'worker/.wrangler'
  ]) {
    assert.ok(
      !fs.existsSync(path.join(rootDir, relativePath)),
      `${relativePath} must stay outside the fixture inventory`
    );
  }
  assert.equal(
    fs.statSync(
      path.join(rootDir, 'assets/images/baidu-elite-certificate.png')
    ).size,
    0
  );
  assert.ok(
    fs.statSync(path.join(rootDir, 'assets/icons/site.ico')).size > 0
  );

  const before = snapshotFiles(rootDir);

  const result = validateRepository(rootDir);
  const after = snapshotFiles(rootDir);

  assert.deepEqual(result.issues, []);
  assert.deepEqual(after, before);
});

test('the validator CLI exits with status 1 for an invalid repository', (t) => {
  const rootDir = createRepositoryFixture(t);
  fs.writeFileSync(path.join(rootDir, 'manifest.webmanifest'), 'null\n');
  const errors = [];

  const status = runCli(rootDir, {
    error(message) {
      errors.push(message);
    },
    log() {}
  });

  assert.equal(status, 1);
  assert.match(errors.join('\n'), /manifest root must be an object/);
});
