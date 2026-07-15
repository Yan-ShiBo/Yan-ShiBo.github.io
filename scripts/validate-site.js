const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

const STATS_PRECONNECT_ORIGINS = new Set([
  'https://busuanzi.icodeq.com',
  'https://cdn.jsdelivr.net',
  'https://events.vercount.one'
]);

const MANIFEST_CONTRACTS = [
  {
    file: 'manifest.webmanifest',
    lang: 'zh-CN',
    startUrl: '/',
    scope: '/'
  },
  {
    file: 'manifest.en.webmanifest',
    lang: 'en',
    startUrl: '/en/',
    scope: '/'
  }
];

const MANIFEST_BY_LANGUAGE = new Map(
  MANIFEST_CONTRACTS.map((contract) => [contract.lang, contract])
);

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
const STATS_INTEGER_CONTRACT_ISSUE =
  'public counters must accept only non-negative ASCII decimal integer text and fall back from invalid provider values';
const STATS_ZERO_CONTRACT_ISSUE = 'zero must remain a valid public counter';
const STATS_UNAVAILABLE_CONTRACT_ISSUE =
  'invalid public counters must render -- and end in warn state';
const STATS_LOCAL_DATE_CONTRACT_ISSUE =
  'local visit dates must remain formatted text';

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

  const expectedManifest = MANIFEST_BY_LANGUAGE.get(expectedLang).file;
  const activeHtml = html.replace(/<!--[\s\S]*?-->/g, '');
  const headMatch = activeHtml.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  const headHtml = headMatch ? headMatch[1] : '';
  const headLinks = extractTags(headHtml, 'link');
  const manifestLinks = headLinks.filter((tag) => (
    String(tag.attributes.rel || '').toLowerCase().split(/\s+/).includes('manifest')
  ));
  const allManifestLinks = extractTags(activeHtml, 'link').filter((tag) => (
    String(tag.attributes.rel || '').toLowerCase().split(/\s+/).includes('manifest')
  ));
  const hasExpectedManifest = allManifestLinks.length === 1 && manifestLinks.length === 1 && (() => {
    const resolved = resolveLocalReference(rootDir, file, manifestLinks[0].attributes.href);
    return resolved.kind === 'local' && resolved.relativePath === expectedManifest;
  })();
  if (!hasExpectedManifest) {
    addIssue(issues, file, `expected exactly one manifest link to ${expectedManifest}`);
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
  for (const link of links) {
    const relValues = String(link.attributes.rel || '').toLowerCase().split(/\s+/);
    if (!relValues.includes('preconnect')) continue;
    let origin;
    try {
      origin = new URL(link.attributes.href, SITE_ORIGIN).origin;
    } catch (_error) {
      continue;
    }
    if (STATS_PRECONNECT_ORIGINS.has(origin) && !STATS_PAGES.has(file)) {
      addIssue(
        issues,
        file,
        `stats-service preconnect ${origin} is limited to the four stats-enabled pages`
      );
    }
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

function sortImageSizes(sizes) {
  return [...sizes].sort((left, right) => {
    const [leftWidth, leftHeight] = left.split('x').map(Number);
    const [rightWidth, rightHeight] = right.split('x').map(Number);
    return leftWidth - rightWidth || leftHeight - rightHeight;
  });
}

function readIcoSizes(absolutePath) {
  const data = fs.readFileSync(absolutePath);
  if (data.length < 6) throw new Error('truncated icon directory');
  if (data.readUInt16LE(0) !== 0 || data.readUInt16LE(2) !== 1) {
    throw new Error('invalid icon directory header');
  }

  const count = data.readUInt16LE(4);
  if (count === 0) throw new Error('empty icon directory');
  const directoryEnd = 6 + count * 16;
  if (data.length < directoryEnd) throw new Error('truncated icon directory');

  const sizes = new Set();
  for (let index = 0; index < count; index += 1) {
    const entryOffset = 6 + index * 16;
    const width = data[entryOffset] || 256;
    const height = data[entryOffset + 1] || 256;
    const imageBytes = data.readUInt32LE(entryOffset + 8);
    const imageOffset = data.readUInt32LE(entryOffset + 12);
    if (imageOffset < directoryEnd) {
      throw new Error(`icon entry ${index} image data overlaps the icon directory`);
    }
    if (imageBytes === 0 || imageBytes > data.length - imageOffset) {
      throw new Error(`icon entry ${index} image data is outside the file`);
    }
    sizes.add(`${width}x${height}`);
  }

  return sortImageSizes(sizes);
}

function normalizeDeclaredSizes(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const sizes = value.trim().split(/\s+/);
  if (sizes.some((size) => !/^[1-9]\d*x[1-9]\d*$/.test(size))) return null;
  return sortImageSizes(new Set(sizes));
}

function validateManifest(rootDir, contract, issues, anchorCache) {
  const { file, lang, startUrl, scope } = contract;
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
  if (manifest.start_url !== startUrl) {
    addIssue(issues, file, `expected start_url "${startUrl}" for ${lang}`);
  }
  if (manifest.scope !== scope) {
    addIssue(issues, file, `expected scope "${scope}" for ${lang}`);
  }
  if (manifest.lang !== lang) {
    addIssue(issues, file, `expected lang "${lang}"`);
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

    const resolvedIcon = resolveLocalReference(rootDir, file, icon.src);
    if (
      resolvedIcon.kind !== 'local' ||
      !resolvedIcon.exists ||
      path.extname(resolvedIcon.absolutePath).toLowerCase() !== '.ico'
    ) {
      continue;
    }

    let icoSizes;
    try {
      icoSizes = readIcoSizes(resolvedIcon.absolutePath);
    } catch (error) {
      addIssue(
        issues,
        file,
        `icons[${index}] references invalid ICO ${resolvedIcon.relativePath}: ${error.message}`
      );
      continue;
    }

    const declaredSizes = normalizeDeclaredSizes(icon.sizes);
    if (!declaredSizes) {
      const hasSizes = Object.hasOwn(icon, 'sizes');
      const invalidValue = hasSizes ? ` (${JSON.stringify(icon.sizes)})` : '';
      const state = hasSizes ? `is invalid${invalidValue}` : 'is missing';
      addIssue(
        issues,
        file,
        `icons[${index}].sizes ${state}; ICO contains "${icoSizes.join(' ')}"`
      );
      continue;
    }
    if (
      declaredSizes.length !== icoSizes.length ||
      declaredSizes.some((size, sizeIndex) => size !== icoSizes[sizeIndex])
    ) {
      const declaredText = icon.sizes.trim().replace(/\s+/g, ' ');
      addIssue(
        issues,
        file,
        `icons[${index}].sizes declares "${declaredText}" but ICO contains "${icoSizes.join(' ')}"`
      );
    }
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

function runStatsScenario(source, options = {}) {
  const providerValues = options.providerValues || {};
  const storageSeed = options.storageSeed || {};
  const elementIds = [
    ...PUBLIC_STATS_IDS,
    ...PROVIDER_STATS_IDS,
    ...LOCAL_STATS_IDS
  ];
  const elements = new Map();
  for (const id of elementIds) {
    const element = {
      attributes: {},
      textContent: Object.hasOwn(providerValues, id) ? providerValues[id] : ''
    };
    element.setAttribute = function (name, value) {
      element.attributes[name] = String(value);
    };
    elements.set(id, element);
  }

  const storage = new Map(
    Object.entries(storageSeed).map(([key, value]) => [key, String(value)])
  );
  const documentEvents = {};
  const windowEvents = {};
  const intervalCallbacks = [];
  const localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    }
  };
  const document = {
    documentElement: { lang: 'en' },
    head: { appendChild() {} },
    addEventListener(type, callback) {
      documentEvents[type] = callback;
    },
    createElement() {
      return {};
    },
    getElementById(id) {
      return elements.get(id) || null;
    }
  };
  const window = {
    document,
    localStorage,
    location: { pathname: '/analytics.html' },
    addEventListener(type, callback) {
      windowEvents[type] = callback;
    },
    clearInterval() {},
    setInterval(callback) {
      intervalCallbacks.push(callback);
      return intervalCallbacks.length;
    }
  };
  const context = vm.createContext({
    __documentEvents: documentEvents,
    __intervalCallbacks: intervalCallbacks,
    __windowEvents: windowEvents,
    document,
    window
  });
  const script = new vm.Script(source, { filename: 'assets/js/stats.js' });
  script.runInContext(context, { timeout: 1000 });

  if (options.triggerDomContentLoaded) {
    vm.runInContext('__documentEvents.DOMContentLoaded()', context, { timeout: 1000 });
  }
  if (options.triggerLoad) {
    vm.runInContext('__windowEvents.load()', context, { timeout: 1000 });
  }
  for (let tick = 0; tick < (options.intervalTicks || 0); tick += 1) {
    vm.runInContext('__intervalCallbacks[0]()', context, { timeout: 1000 });
  }

  function readElement(id) {
    const element = elements.get(id);
    return {
      state: element.attributes['data-state'] || null,
      text: String(element.textContent == null ? '' : element.textContent).trim()
    };
  }

  return { readElement };
}

function validateStatsJavaScriptContracts(rootDir, issues) {
  const file = 'assets/js/stats.js';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return;

  let source;
  let fallbackScenario;
  let zeroScenario;
  let unavailableScenario;
  let localScenario;
  try {
    source = readUtf8(rootDir, file);
    fallbackScenario = runStatsScenario(source, {
      providerValues: {
        busuanzi_value_site_pv: '-1',
        vercount_value_site_pv: '900719925474099312345',
        busuanzi_value_site_uv: '1.5',
        vercount_value_site_uv: '43',
        busuanzi_value_page_pv: '１２',
        vercount_value_page_pv: '44'
      },
      triggerLoad: true,
      intervalTicks: 1
    });
    zeroScenario = runStatsScenario(source, {
      providerValues: {
        busuanzi_value_site_pv: ' 0 ',
        vercount_value_site_pv: '42',
        busuanzi_value_site_uv: '0007',
        vercount_value_site_uv: '43',
        busuanzi_value_page_pv: '00123',
        vercount_value_page_pv: '44'
      },
      triggerLoad: true,
      intervalTicks: 1
    });
    unavailableScenario = runStatsScenario(source, {
      providerValues: {
        busuanzi_value_site_pv: '-1',
        vercount_value_site_pv: '+1',
        busuanzi_value_site_uv: '1.5',
        vercount_value_site_uv: '1e3',
        busuanzi_value_page_pv: '1,000',
        vercount_value_page_pv: 'broken'
      },
      triggerLoad: true,
      intervalTicks: 24
    });
    localScenario = runStatsScenario(source, {
      storageSeed: {
        'ysb-visit-total': '3',
        'ysb-visit-first': '2026-01-02T03:04:05.000Z',
        'ysb-visit-days': '["2026-01-02"]',
        'ysb-page:/analytics.html': '2'
      },
      triggerDomContentLoaded: true
    });
  } catch (error) {
    addIssue(
      issues,
      file,
      `runtime counter contracts could not execute: ${error.message}`
    );
    return;
  }

  const fallbackValues = ['site-pv', 'site-uv', 'page-pv'].map(
    (id) => fallbackScenario.readElement(id).text
  );
  if (
    fallbackValues.join(' ') !== '900719925474099312345 43 44' ||
    fallbackScenario.readElement('stats-status').state !== 'ok'
  ) {
    addIssue(issues, file, STATS_INTEGER_CONTRACT_ISSUE);
  }

  const zeroValues = ['site-pv', 'site-uv', 'page-pv'].map(
    (id) => zeroScenario.readElement(id).text
  );
  if (
    zeroValues.join(' ') !== '0 0007 00123' ||
    zeroScenario.readElement('stats-status').state !== 'ok'
  ) {
    addIssue(issues, file, STATS_ZERO_CONTRACT_ISSUE);
  }

  const unavailableValues = ['site-pv', 'site-uv', 'page-pv'].map(
    (id) => unavailableScenario.readElement(id).text
  );
  if (
    unavailableValues.some((value) => value !== '--') ||
    unavailableScenario.readElement('stats-status').state !== 'warn'
  ) {
    addIssue(issues, file, STATS_UNAVAILABLE_CONTRACT_ISSUE);
  }

  const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
  if (
    !datePattern.test(localScenario.readElement('local-first').text) ||
    !datePattern.test(localScenario.readElement('local-last').text)
  ) {
    addIssue(issues, file, STATS_LOCAL_DATE_CONTRACT_ISSUE);
  }
}

const JAVASCRIPT_NON_CODE_PATTERN =
  /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|\/(?![/*])(?:\\[\s\S]|\[(?:\\[\s\S]|[^\]\\])*\]|[^/\\\r\n])+\/[dgimsuvy]*|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g;

function buildJavaScriptCodeMask(source) {
  const mask = new Uint8Array(source.length);
  mask.fill(1);

  const matcher = new RegExp(
    JAVASCRIPT_NON_CODE_PATTERN.source,
    JAVASCRIPT_NON_CODE_PATTERN.flags
  );
  let match = matcher.exec(source);
  while (match) {
    mask.fill(0, match.index, match.index + match[0].length);
    match = matcher.exec(source);
  }

  return mask;
}

function hasExecutableMatch(source, codeMask, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  let match = matcher.exec(source);

  while (match) {
    if (codeMask[match.index] === 1) return true;
    if (match[0] === '') matcher.lastIndex += 1;
    match = matcher.exec(source);
  }

  return false;
}

function extractNamedFunctionBody(source, codeMask, functionName) {
  const signature = new RegExp(
    `^[\\t ]*function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`,
    'gm'
  );
  let match = signature.exec(source);

  while (match) {
    if (codeMask[match.index] === 1) {
      const openingBrace = match.index + match[0].lastIndexOf('{');
      let depth = 1;

      for (let index = openingBrace + 1; index < source.length; index += 1) {
        if (codeMask[index] !== 1) continue;
        if (source[index] === '{') {
          depth += 1;
        } else if (source[index] === '}') {
          depth -= 1;
          if (depth === 0) {
            return {
              codeMask: codeMask.slice(openingBrace + 1, index),
              source: source.slice(openingBrace + 1, index)
            };
          }
        }
      }
    }
    match = signature.exec(source);
  }

  return null;
}

function validateSiteJavaScriptContracts(rootDir, issues) {
  const file = 'assets/js/site.js';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return;

  const source = readUtf8(rootDir, file);
  const codeMask = buildJavaScriptCodeMask(source);
  const handler = extractNamedFunctionBody(
    source,
    codeMask,
    'handleMenuBreakpointChange'
  );
  const hasDesktopMenuQuery = hasExecutableMatch(
    source,
    codeMask,
    /^[\t ]*var\s+desktopMenuQuery\s*=\s*window\.matchMedia\(\s*(['"])\(min-width:\s*834px\)\1\s*\)\s*;/m
  );
  const hasDesktopMenuHandler = handler !== null;
  const hasDesktopMenuListener = hasExecutableMatch(
    source,
    codeMask,
    /^[\t ]*desktopMenuQuery\.(?:addEventListener\(\s*['"]change['"]\s*,\s*handleMenuBreakpointChange\s*\)|addListener\(\s*handleMenuBreakpointChange\s*\))\s*;/m
  );
  const hasDesktopGate = handler !== null && hasExecutableMatch(
    handler.source,
    handler.codeMask,
    /^[\t ]*if\s*\(\s*!event\.matches\s*\|\|\s*!document\.body\.classList\.contains\(\s*(['"])menu-open\1\s*\)\s*\)\s*return\s*;/m
  );
  const closesWithoutHiddenToggleFocus = handler !== null && hasExecutableMatch(
    handler.source,
    handler.codeMask,
    /^[\t ]*closeMenu\(\s*false\s*\)\s*;/m
  );
  const hasVisibleDesktopFocusFallback = handler !== null &&
    hasExecutableMatch(
      handler.source,
      handler.codeMask,
      /^[\t ]*var\s+desktopTarget\s*=\s*document\.querySelector\(\s*(['"])\.site-nav \[aria-current=["']page["']\]\1\s*\)\s*\|\|\s*\r?\n[\t ]*document\.querySelector\(\s*(['"])\.site-nav a\2\s*\)\s*;/m
    ) &&
    hasExecutableMatch(
      handler.source,
      handler.codeMask,
      /^[\t ]*focusNode\(\s*desktopTarget\s*\)\s*;/m
    );

  if (
    !hasDesktopMenuQuery ||
    !hasDesktopMenuHandler ||
    !hasDesktopMenuListener ||
    !hasDesktopGate ||
    !closesWithoutHiddenToggleFocus ||
    !hasVisibleDesktopFocusFallback
  ) {
    addIssue(issues, file, 'missing 834px desktop breakpoint menu cleanup');
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
  for (const contract of MANIFEST_CONTRACTS) {
    validateManifest(absoluteRoot, contract, issues, anchorCache);
  }
  const sitemapUrls = validateSitemap(absoluteRoot, issues);
  validateRobots(absoluteRoot, issues);
  validateJavaScriptSyntax(absoluteRoot, issues);
  validateStatsJavaScriptContracts(absoluteRoot, issues);
  validateSiteJavaScriptContracts(absoluteRoot, issues);

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
