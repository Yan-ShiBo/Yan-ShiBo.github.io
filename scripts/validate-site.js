const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SITE_ORIGIN = 'https://yan-shibo.github.io';

const PAGE_PAIRS = [
  { zhFile: 'index.html', enFile: 'en/index.html', zhRoute: '/', enRoute: '/en/' },
  { zhFile: 'profile.html', enFile: 'en/profile.html', zhRoute: '/profile.html', enRoute: '/en/profile.html' },
  { zhFile: 'research.html', enFile: 'en/research.html', zhRoute: '/research.html', enRoute: '/en/research.html' },
  { zhFile: 'projects.html', enFile: 'en/projects.html', zhRoute: '/projects.html', enRoute: '/en/projects.html' },
  { zhFile: 'resume.html', enFile: 'en/resume.html', zhRoute: '/resume.html', enRoute: '/en/resume.html' },
  { zhFile: 'analytics.html', enFile: 'en/analytics.html', zhRoute: '/analytics.html', enRoute: '/en/analytics.html' }
];

const NOT_FOUND_PAGES = [
  { file: '404.html', lang: 'zh-CN' },
  { file: 'en/404.html', lang: 'en' }
];

const INDEXABLE_PAGES = PAGE_PAIRS.flatMap((pair) => [
  {
    file: pair.zhFile,
    lang: 'zh-CN',
    route: pair.zhRoute,
    canonical: SITE_ORIGIN + pair.zhRoute,
    zhUrl: SITE_ORIGIN + pair.zhRoute,
    enUrl: SITE_ORIGIN + pair.enRoute
  },
  {
    file: pair.enFile,
    lang: 'en',
    route: pair.enRoute,
    canonical: SITE_ORIGIN + pair.enRoute,
    zhUrl: SITE_ORIGIN + pair.zhRoute,
    enUrl: SITE_ORIGIN + pair.enRoute
  }
]);

const HTML_FILES = [
  ...INDEXABLE_PAGES.map((page) => page.file),
  ...NOT_FOUND_PAGES.map((page) => page.file)
];

const STATS_PAGES = new Set([
  'index.html',
  'analytics.html',
  'en/index.html',
  'en/analytics.html'
]);

const ANALYTICS_PAGES = new Set(['analytics.html', 'en/analytics.html']);

const PUBLIC_STATS_IDS = ['site-pv', 'site-uv', 'page-pv', 'stats-status'];
const PROVIDER_STATS_IDS = [
  'busuanzi_value_site_pv',
  'busuanzi_value_site_uv',
  'busuanzi_value_page_pv',
  'vercount_value_site_pv',
  'vercount_value_site_uv',
  'vercount_value_page_pv'
];
const LOCAL_STATS_IDS = [
  'local-total',
  'local-page',
  'local-days',
  'local-first',
  'local-last'
];

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function stripUrlDecorations(value) {
  const queryIndex = value.indexOf('?');
  const fragmentIndex = value.indexOf('#');
  const indexes = [queryIndex, fragmentIndex].filter((index) => index >= 0);
  const cutAt = indexes.length > 0 ? Math.min(...indexes) : value.length;
  return value.slice(0, cutAt);
}

function getFragment(value) {
  const fragmentIndex = value.indexOf('#');
  if (fragmentIndex < 0) return '';
  const fragment = value.slice(fragmentIndex + 1);
  try {
    return decodeURIComponent(fragment);
  } catch (_error) {
    return fragment;
  }
}

function isExternalReference(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
}

function hasExactPathCase(rootDir, targetAbsolutePath) {
  const relativePath = path.relative(path.resolve(rootDir), targetAbsolutePath);
  if (!relativePath) return true;

  let currentDirectory = path.resolve(rootDir);
  for (const segment of relativePath.split(path.sep)) {
    if (!fs.existsSync(currentDirectory) || !fs.statSync(currentDirectory).isDirectory()) {
      return false;
    }
    if (!fs.readdirSync(currentDirectory).includes(segment)) return false;
    currentDirectory = path.join(currentDirectory, segment);
  }
  return true;
}

function resolveLocalReference(rootDir, sourceRelativePath, reference) {
  const trimmed = String(reference || '').trim();
  if (!trimmed || isExternalReference(trimmed)) {
    return { kind: 'external', reference: trimmed };
  }

  const undecorated = stripUrlDecorations(trimmed);
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(undecorated);
  } catch (_error) {
    return { kind: 'invalid', reference: trimmed, reason: 'invalid URL encoding' };
  }

  const sourceAbsolutePath = path.resolve(rootDir, sourceRelativePath);
  let targetAbsolutePath;
  if (!decodedPath) {
    targetAbsolutePath = sourceAbsolutePath;
  } else if (decodedPath.startsWith('/')) {
    targetAbsolutePath = path.resolve(rootDir, decodedPath.replace(/^\/+/, ''));
  } else {
    targetAbsolutePath = path.resolve(path.dirname(sourceAbsolutePath), decodedPath);
  }

  const rootAbsolutePath = path.resolve(rootDir);
  const relativeFromRoot = path.relative(rootAbsolutePath, targetAbsolutePath);
  const insideRoot = relativeFromRoot === '' || (
    !relativeFromRoot.startsWith(`..${path.sep}`) &&
    relativeFromRoot !== '..' &&
    !path.isAbsolute(relativeFromRoot)
  );

  if (!insideRoot) {
    return {
      kind: 'invalid',
      reference: trimmed,
      reason: 'path escapes repository root'
    };
  }

  if (fs.existsSync(targetAbsolutePath) && fs.statSync(targetAbsolutePath).isDirectory()) {
    targetAbsolutePath = path.join(targetAbsolutePath, 'index.html');
  }

  return {
    kind: 'local',
    reference: trimmed,
    absolutePath: targetAbsolutePath,
    relativePath: toPosix(path.relative(rootAbsolutePath, targetAbsolutePath)),
    exists: fs.existsSync(targetAbsolutePath),
    exactCase: hasExactPathCase(rootAbsolutePath, targetAbsolutePath),
    fragment: getFragment(trimmed)
  };
}

function parseAttributes(tag) {
  const attributes = {};
  const body = tag
    .replace(/^<\/?\s*[^\s>]+/, '')
    .replace(/\/?>\s*$/, '');
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(body)) !== null) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}

function extractTags(html, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  return Array.from(html.matchAll(pattern), (match) => ({
    raw: match[0],
    attributes: parseAttributes(match[0])
  }));
}

function hasClass(attributes, className) {
  return String(attributes.class || '').split(/\s+/).includes(className);
}

function addIssue(issues, file, message) {
  issues.push(`${file}: ${message}`);
}

function readUtf8(rootDir, relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function ensureFile(rootDir, relativePath, issues) {
  const absolutePath = path.join(rootDir, relativePath);
  if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) return true;
  addIssue(issues, relativePath, 'expected file is missing');
  return false;
}

function listHtmlFiles(rootDir) {
  const files = [];
  const excludedDirectories = new Set(['.git', 'node_modules']);

  function walk(absoluteDirectory, relativeDirectory) {
    if (!fs.existsSync(absoluteDirectory) || !fs.statSync(absoluteDirectory).isDirectory()) return;
    for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const relativePath = path.join(relativeDirectory, entry.name);
      const absolutePath = path.join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) {
        if (!excludedDirectories.has(entry.name)) walk(absolutePath, relativePath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.html') {
        files.push(toPosix(relativePath));
      }
    }
  }

  walk(path.resolve(rootDir), '');
  return files.sort();
}

function collectIds(html) {
  const counts = new Map();
  const tags = Array.from(html.matchAll(/<[a-z][^>]*>/gi), (match) => match[0]);
  for (const tag of tags) {
    const attributes = parseAttributes(tag);
    if (!Object.hasOwn(attributes, 'id') || !attributes.id) continue;
    const id = attributes.id;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return counts;
}

function validateReference(rootDir, sourceFile, reference, issues, anchorCache) {
  const result = resolveLocalReference(rootDir, sourceFile, reference);
  if (result.kind === 'external') return;
  if (result.kind === 'invalid') {
    addIssue(issues, sourceFile, `${reference}: ${result.reason}`);
    return;
  }
  if (!result.exists) {
    addIssue(issues, sourceFile, `missing local target ${reference} -> ${result.relativePath}`);
    return;
  }
  if (!result.exactCase) {
    addIssue(issues, sourceFile, `path casing mismatch for ${reference}`);
  }
  if (!result.fragment || path.extname(result.absolutePath).toLowerCase() !== '.html') return;

  if (!anchorCache.has(result.absolutePath)) {
    anchorCache.set(result.absolutePath, collectIds(fs.readFileSync(result.absolutePath, 'utf8')));
  }
  if (!anchorCache.get(result.absolutePath).has(result.fragment)) {
    addIssue(issues, sourceFile, `missing fragment #${result.fragment} in ${result.relativePath}`);
  }
}

function validateLocalReferences(rootDir, file, html, issues, anchorCache) {
  const referenceAttributes = [
    ['a', 'href'],
    ['link', 'href'],
    ['script', 'src'],
    ['img', 'src'],
    ['iframe', 'src'],
    ['source', 'src'],
    ['video', 'poster']
  ];

  for (const [tagName, attributeName] of referenceAttributes) {
    for (const tag of extractTags(html, tagName)) {
      if (Object.hasOwn(tag.attributes, attributeName)) {
        validateReference(
          rootDir,
          file,
          tag.attributes[attributeName],
          issues,
          anchorCache
        );
      }
    }
  }
}

function validateDocumentStructure(rootDir, file, html, expectedLang, issues) {
  const htmlTags = extractTags(html, 'html');
  if (htmlTags.length !== 1 || htmlTags[0].attributes.lang !== expectedLang) {
    addIssue(issues, file, `expected one html element with lang="${expectedLang}"`);
  }

  const duplicateIds = Array.from(collectIds(html).entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  if (duplicateIds.length > 0) {
    addIssue(issues, file, `duplicate ids: ${duplicateIds.join(', ')}`);
  }

  const mains = extractTags(html, 'main')
    .filter((tag) => tag.attributes.id === 'main-content');
  if (mains.length !== 1) {
    addIssue(issues, file, 'expected exactly one main#main-content');
  }

  const skipLinks = extractTags(html, 'a').filter((tag) => (
    hasClass(tag.attributes, 'skip-link') && tag.attributes.href === '#main-content'
  ));
  if (skipLinks.length !== 1) {
    addIssue(issues, file, 'expected one .skip-link targeting #main-content');
  }

  const titles = Array.from(html.matchAll(/<title\b[^>]*>[\s\S]*?<\/title>/gi));
  if (titles.length !== 1) addIssue(issues, file, 'expected exactly one title');

  const metaTags = extractTags(html, 'meta');
  const descriptions = metaTags.filter((tag) => tag.attributes.name === 'description');
  const viewports = metaTags.filter((tag) => tag.attributes.name === 'viewport');
  const charsets = metaTags.filter((tag) => Object.hasOwn(tag.attributes, 'charset'));
  if (descriptions.length !== 1) addIssue(issues, file, 'expected exactly one meta description');
  if (viewports.length !== 1) addIssue(issues, file, 'expected exactly one viewport meta');
  if (charsets.length !== 1) addIssue(issues, file, 'expected exactly one charset meta');

  const links = extractTags(html, 'link');
  const scripts = extractTags(html, 'script');
  const expectedResources = [
    'assets/icons/site.ico',
    'manifest.webmanifest',
    'assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css',
    'assets/css/site.css'
  ];
  const linkedResources = links
    .map((tag) => resolveLocalReference(rootDir, file, tag.attributes.href))
    .filter((result) => result.kind === 'local')
    .map((result) => result.relativePath);
  for (const resource of expectedResources) {
    if (!linkedResources.includes(resource)) {
      addIssue(issues, file, `missing required resource link ${resource}`);
    }
  }

  const scriptResources = scripts
    .map((tag) => resolveLocalReference(rootDir, file, tag.attributes.src))
    .filter((result) => result.kind === 'local')
    .map((result) => result.relativePath);
  if (!scriptResources.includes('assets/js/site.js')) {
    addIssue(issues, file, 'missing required script assets/js/site.js');
  }

  const loadsStats = scriptResources.includes('assets/js/stats.js');
  if (loadsStats !== STATS_PAGES.has(file)) {
    addIssue(issues, file, 'stats.js load scope does not match the four stats-enabled pages');
  }
  if (loadsStats) {
    const ids = collectIds(html);
    const requiredStatsIds = [
      ...PUBLIC_STATS_IDS,
      ...PROVIDER_STATS_IDS,
      ...(ANALYTICS_PAGES.has(file) ? LOCAL_STATS_IDS : [])
    ];
    for (const id of requiredStatsIds) {
      if (!ids.has(id)) addIssue(issues, file, `stats.js requires #${id}`);
    }
  }

  for (const image of extractTags(html, 'img')) {
    const attrs = image.attributes;
    if (!Object.hasOwn(attrs, 'alt') || !attrs.alt.trim()) {
      addIssue(issues, file, `image ${attrs.src || '(unknown)'} needs non-empty alt text`);
    }
    if (!attrs.width || !attrs.height) {
      addIssue(issues, file, `image ${attrs.src || '(unknown)'} needs width and height`);
    }
  }

  for (const anchor of extractTags(html, 'a')) {
    if (anchor.attributes.target !== '_blank') continue;
    const rel = new Set(String(anchor.attributes.rel || '').split(/\s+/));
    if (!rel.has('noopener') || !rel.has('noreferrer')) {
      addIssue(issues, file, `target="_blank" link ${anchor.attributes.href || ''} needs noopener noreferrer`);
    }
  }
}

function validateJsonLd(file, html, expectedLang, shouldExist, issues) {
  const blocks = Array.from(
    html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
    (match) => match[1]
  );
  if (shouldExist && blocks.length === 0) {
    addIssue(issues, file, 'missing JSON-LD');
    return;
  }
  for (const block of blocks) {
    try {
      const value = JSON.parse(block);
      if (value.inLanguage && value.inLanguage !== expectedLang) {
        addIssue(issues, file, `JSON-LD inLanguage should be ${expectedLang}`);
      }
    } catch (error) {
      addIssue(issues, file, `invalid JSON-LD: ${error.message}`);
    }
  }
}

function validateIndexableMetadata(page, html, issues) {
  const links = extractTags(html, 'link');
  const canonical = links.filter((tag) => tag.attributes.rel === 'canonical');
  if (canonical.length !== 1 || canonical[0].attributes.href !== page.canonical) {
    addIssue(issues, page.file, `canonical should be ${page.canonical}`);
  }

  const hreflangLinks = links.filter((tag) => tag.attributes.hreflang);
  for (const link of hreflangLinks) {
    if (!String(link.attributes.rel || '').split(/\s+/).includes('alternate')) {
      addIssue(
        issues,
        page.file,
        `hreflang ${link.attributes.hreflang} link must use rel="alternate"`
      );
    }
  }
  for (const link of links.filter((tag) => (
    String(tag.attributes.rel || '').split(/\s+/).includes('alternate')
  ))) {
    if (!link.attributes.hreflang) {
      addIssue(issues, page.file, 'alternate link is missing hreflang');
    }
  }
  const alternateLinks = hreflangLinks.filter((tag) => (
    String(tag.attributes.rel || '').split(/\s+/).includes('alternate')
  ));
  const expectedAlternates = {
    'zh-CN': page.zhUrl,
    en: page.enUrl,
    'x-default': page.zhUrl
  };
  for (const [language, expectedUrl] of Object.entries(expectedAlternates)) {
    const matches = alternateLinks.filter((tag) => tag.attributes.hreflang === language);
    if (matches.length !== 1) {
      addIssue(issues, page.file, `expected exactly one hreflang ${language} alternate`);
    } else if (matches[0].attributes.href !== expectedUrl) {
      addIssue(issues, page.file, `hreflang ${language} should be ${expectedUrl}`);
    }
  }
  for (const alternate of alternateLinks) {
    if (!Object.hasOwn(expectedAlternates, alternate.attributes.hreflang)) {
      addIssue(issues, page.file, `unexpected hreflang ${alternate.attributes.hreflang}`);
    }
  }

  const ogUrls = extractTags(html, 'meta')
    .filter((tag) => tag.attributes.property === 'og:url');
  if (ogUrls.length !== 1 || ogUrls[0].attributes.content !== page.canonical) {
    addIssue(issues, page.file, `og:url should be ${page.canonical}`);
  }
}

function validateNotFoundMetadata(page, html, issues) {
  const robots = extractTags(html, 'meta')
    .filter((tag) => tag.attributes.name === 'robots')
    .map((tag) => tag.attributes.content || '');
  if (!robots.some((content) => /\bnoindex\b/i.test(content))) {
    addIssue(issues, page.file, '404 page must contain noindex');
  }

  const links = extractTags(html, 'link');
  if (links.some((tag) => tag.attributes.rel === 'canonical')) {
    addIssue(issues, page.file, '404 page must not declare a canonical URL');
  }
  if (links.some((tag) => tag.attributes.rel === 'alternate' && tag.attributes.hreflang)) {
    addIssue(issues, page.file, '404 page must not declare hreflang alternates');
  }
}

function validateCssReferences(rootDir, issues, anchorCache) {
  const files = [
    'assets/css/site.css',
    'assets/vendor/font-awesome-4.7.0/css/font-awesome.min.css'
  ];
  for (const file of files) {
    if (!ensureFile(rootDir, file, issues)) continue;
    const css = readUtf8(rootDir, file);
    const pattern = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s][^)]*?))\s*\)/gi;
    let match;
    while ((match = pattern.exec(css)) !== null) {
      const reference = (match[1] || match[2] || match[3] || '').trim();
      validateReference(rootDir, file, reference, issues, anchorCache);
    }
  }
}

function validateManifest(rootDir, issues, anchorCache) {
  const file = 'manifest.webmanifest';
  if (!ensureFile(rootDir, file, issues)) return;
  let manifest;
  try {
    manifest = JSON.parse(readUtf8(rootDir, file));
  } catch (error) {
    addIssue(issues, file, `invalid JSON: ${error.message}`);
    return;
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    addIssue(issues, file, 'manifest root must be an object');
    return;
  }
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
    addIssue(issues, file, 'expected at least one icon');
    return;
  }
  for (let index = 0; index < manifest.icons.length; index += 1) {
    const icon = manifest.icons[index];
    if (
      !icon ||
      typeof icon !== 'object' ||
      Array.isArray(icon) ||
      typeof icon.src !== 'string' ||
      !icon.src.trim()
    ) {
      addIssue(issues, file, `icons[${index}] must be an object with a non-empty src`);
      continue;
    }
    validateReference(rootDir, file, icon.src, issues, anchorCache);
  }
}

function validateSitemap(rootDir, issues) {
  const file = 'sitemap.xml';
  if (!ensureFile(rootDir, file, issues)) return 0;
  const xml = readUtf8(rootDir, file);
  const envelopeMatch = xml.match(
    /^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset\b([^>]*)>[\s\S]*<\/urlset>\s*$/
  );
  const openingRoots = Array.from(xml.matchAll(/<urlset\b[^>]*>/g));
  const closingRoots = Array.from(xml.matchAll(/<\/urlset\s*>/g));
  const rootAttributes = envelopeMatch
    ? parseAttributes(`<urlset${envelopeMatch[1]}>`)
    : {};
  const validEnvelope = (
    Boolean(envelopeMatch) &&
    openingRoots.length === 1 &&
    closingRoots.length === 1 &&
    rootAttributes.xmlns === 'http://www.sitemaps.org/schemas/sitemap/0.9' &&
    rootAttributes['xmlns:xhtml'] === 'http://www.w3.org/1999/xhtml'
  );
  if (!validEnvelope) {
    addIssue(issues, file, 'invalid urlset envelope or namespaces');
  }
  const blocks = Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/g), (match) => match[1]);
  const records = [];

  for (const block of blocks) {
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    const lastmodMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/);
    const xhtmlLinks = extractTags(block, 'xhtml:link');
    const alternateLinks = xhtmlLinks.filter((tag) => (
      String(tag.attributes.rel || '').split(/\s+/).includes('alternate') &&
      tag.attributes.hreflang
    ));
    if (!locMatch) {
      addIssue(issues, file, 'url entry is missing loc');
      continue;
    }
    if (!lastmodMatch || !/^\d{4}-\d{2}-\d{2}$/.test(lastmodMatch[1])) {
      addIssue(issues, file, `${locMatch[1]} has an invalid lastmod`);
    }
    records.push({ loc: locMatch[1], alternateLinks, xhtmlLinks });
  }

  const expectedByUrl = new Map(INDEXABLE_PAGES.map((page) => [page.canonical, page]));
  const actualUrls = records.map((record) => record.loc);
  if (new Set(actualUrls).size !== actualUrls.length) {
    addIssue(issues, file, 'contains duplicate loc entries');
  }
  if (records.length !== expectedByUrl.size) {
    addIssue(issues, file, `expected ${expectedByUrl.size} URLs, found ${records.length}`);
  }

  for (const record of records) {
    const expected = expectedByUrl.get(record.loc);
    if (!expected) {
      addIssue(issues, file, `unexpected URL ${record.loc}`);
      continue;
    }
    for (const link of record.xhtmlLinks) {
      if (!link.attributes.hreflang) {
        addIssue(issues, file, `${record.loc} has an xhtml:link without hreflang`);
      }
      if (!String(link.attributes.rel || '').split(/\s+/).includes('alternate')) {
        addIssue(
          issues,
          file,
          `${record.loc} has a hreflang ${link.attributes.hreflang || '(missing)'} link without rel="alternate"`
        );
      }
      if (!link.attributes.href) {
        addIssue(issues, file, `${record.loc} has an xhtml:link without href`);
      }
    }
    const expectedAlternates = {
      'zh-CN': expected.zhUrl,
      en: expected.enUrl,
      'x-default': expected.zhUrl
    };
    for (const [language, expectedUrl] of Object.entries(expectedAlternates)) {
      const matches = record.alternateLinks
        .filter((tag) => tag.attributes.hreflang === language);
      if (matches.length !== 1) {
        addIssue(
          issues,
          file,
          `${record.loc} must contain exactly one alternate hreflang ${language}`
        );
      } else if (matches[0].attributes.href !== expectedUrl) {
        addIssue(issues, file, `${record.loc} has incorrect ${language} alternate`);
      }
    }
    for (const alternate of record.alternateLinks) {
      if (!Object.hasOwn(expectedAlternates, alternate.attributes.hreflang)) {
        addIssue(
          issues,
          file,
          `${record.loc} has unexpected hreflang ${alternate.attributes.hreflang}`
        );
      }
    }
  }

  for (const expectedUrl of expectedByUrl.keys()) {
    if (!actualUrls.includes(expectedUrl)) {
      addIssue(issues, file, `missing URL ${expectedUrl}`);
    }
  }

  return records.length;
}

function validateRobots(rootDir, issues) {
  const file = 'robots.txt';
  if (!ensureFile(rootDir, file, issues)) return;
  const robots = readUtf8(rootDir, file);
  const expected = `Sitemap: ${SITE_ORIGIN}/sitemap.xml`;
  const lines = robots
    .split(/\r?\n/)
    .map((line) => line.replace(/\s*#.*$/, '').trim())
    .filter(Boolean);
  if (!lines.includes(expected)) {
    addIssue(issues, file, `expected ${expected}`);
  }

  const groups = [];
  let agents = [];
  let rules = [];
  function flushGroup() {
    if (agents.length > 0) groups.push({ agents, rules });
    agents = [];
    rules = [];
  }
  for (const line of lines) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (name === 'user-agent') {
      if (rules.length > 0) flushGroup();
      agents.push(value.toLowerCase());
    } else if (agents.length > 0 && (name === 'allow' || name === 'disallow')) {
      rules.push({ name, value });
    }
  }
  flushGroup();

  const wildcardRules = groups
    .filter((group) => group.agents.includes('*'))
    .flatMap((group) => group.rules);
  const allowsRoot = wildcardRules.some((rule) => (
    rule.name === 'allow' && rule.value === '/'
  ));
  const blocksRoot = wildcardRules.some((rule) => (
    rule.name === 'disallow' && (rule.value === '/' || rule.value === '/*')
  ));
  if (!allowsRoot || blocksRoot) {
    addIssue(issues, file, 'User-agent * must allow / and must not disallow /');
  }
}

function validateJavaScriptSyntax(rootDir, issues) {
  const files = [
    'assets/js/site.js',
    'assets/js/stats.js',
    'scripts/generate-sitemap.js',
    'scripts/validate-site.js'
  ];
  for (const file of files) {
    if (!ensureFile(rootDir, file, issues)) continue;
    const result = childProcess.spawnSync(
      process.execPath,
      ['--check', path.join(rootDir, file)],
      { encoding: 'utf8' }
    );
    if (result.status !== 0) {
      addIssue(issues, file, (result.stderr || result.stdout || 'syntax check failed').trim());
    }
  }
}

function validateRepository(rootDir) {
  const absoluteRoot = path.resolve(rootDir);
  const issues = [];
  const anchorCache = new Map();
  const actualHtmlFiles = listHtmlFiles(absoluteRoot);
  const existingHtml = new Set(actualHtmlFiles);
  const expectedHtml = new Set(HTML_FILES);

  for (const file of HTML_FILES) {
    if (!existingHtml.has(file)) addIssue(issues, file, 'expected HTML file is missing');
  }
  for (const file of actualHtmlFiles) {
    if (!expectedHtml.has(file)) {
      addIssue(issues, file, 'unexpected HTML file; update the bilingual page inventory');
    }
  }

  for (const page of INDEXABLE_PAGES) {
    if (!existingHtml.has(page.file)) continue;
    const html = readUtf8(absoluteRoot, page.file);
    validateDocumentStructure(absoluteRoot, page.file, html, page.lang, issues);
    validateLocalReferences(absoluteRoot, page.file, html, issues, anchorCache);
    validateJsonLd(page.file, html, page.lang, true, issues);
    validateIndexableMetadata(page, html, issues);
  }

  for (const page of NOT_FOUND_PAGES) {
    if (!existingHtml.has(page.file)) continue;
    const html = readUtf8(absoluteRoot, page.file);
    validateDocumentStructure(absoluteRoot, page.file, html, page.lang, issues);
    validateLocalReferences(absoluteRoot, page.file, html, issues, anchorCache);
    validateJsonLd(page.file, html, page.lang, false, issues);
    validateNotFoundMetadata(page, html, issues);
  }

  validateCssReferences(absoluteRoot, issues, anchorCache);
  validateManifest(absoluteRoot, issues, anchorCache);
  const sitemapUrls = validateSitemap(absoluteRoot, issues);
  validateRobots(absoluteRoot, issues);
  validateJavaScriptSyntax(absoluteRoot, issues);

  return {
    issues,
    summary: {
      htmlFiles: actualHtmlFiles.length,
      indexablePages: INDEXABLE_PAGES.length,
      sitemapUrls
    }
  };
}

function runCli() {
  const rootDir = path.resolve(__dirname, '..');
  const result = validateRepository(rootDir);
  if (result.issues.length > 0) {
    console.error(`Site validation failed with ${result.issues.length} issue(s):`);
    for (const issue of result.issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `Site validation passed: ${result.summary.htmlFiles} HTML files, ` +
    `${result.summary.indexablePages} indexable pages, ` +
    `${result.summary.sitemapUrls} sitemap URLs.`
  );
}

if (require.main === module) runCli();

module.exports = {
  resolveLocalReference,
  stripUrlDecorations,
  validateRepository
};
