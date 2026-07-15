const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SITE_ORIGIN = 'https://yan-shibo.github.io';
const PERSON_ID = `${SITE_ORIGIN}/#person`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
const PROJECT_IDS = [
  `${SITE_ORIGIN}/#project-persevere-study`,
  `${SITE_ORIGIN}/#project-mic-family`
];
const RESEARCH_IDS = [
  `${SITE_ORIGIN}/#research-controller-updates`,
  `${SITE_ORIGIN}/#research-pac-approximation`,
  `${SITE_ORIGIN}/#research-certificate-templates`,
  `${SITE_ORIGIN}/#research-complex-systems`
];
const EXPECTED_PROJECT_REPOSITORIES = new Map([
  [PROJECT_IDS[0], 'https://github.com/Yan-ShiBo/PersevereStudy'],
  [PROJECT_IDS[1], 'https://github.com/Yan-ShiBo/MicFamily']
]);

const PAGE_PAIRS = [
  { zhFile: 'index.html', enFile: 'en/index.html', zhRoute: '/', enRoute: '/en/', kind: 'profile', schemaType: 'ProfilePage' },
  { zhFile: 'profile.html', enFile: 'en/profile.html', zhRoute: '/profile.html', enRoute: '/en/profile.html', kind: 'profile', schemaType: 'ProfilePage' },
  { zhFile: 'research.html', enFile: 'en/research.html', zhRoute: '/research.html', enRoute: '/en/research.html', kind: 'research', schemaType: 'WebPage' },
  { zhFile: 'projects.html', enFile: 'en/projects.html', zhRoute: '/projects.html', enRoute: '/en/projects.html', kind: 'projects', schemaType: 'CollectionPage' },
  { zhFile: 'resume.html', enFile: 'en/resume.html', zhRoute: '/resume.html', enRoute: '/en/resume.html', kind: 'profile', schemaType: 'ProfilePage' },
  { zhFile: 'analytics.html', enFile: 'en/analytics.html', zhRoute: '/analytics.html', enRoute: '/en/analytics.html', kind: 'analytics', schemaType: 'WebPage' }
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
    enUrl: SITE_ORIGIN + pair.enRoute,
    kind: pair.kind,
    schemaType: pair.schemaType
  },
  {
    file: pair.enFile,
    lang: 'en',
    route: pair.enRoute,
    canonical: SITE_ORIGIN + pair.enRoute,
    zhUrl: SITE_ORIGIN + pair.zhRoute,
    enUrl: SITE_ORIGIN + pair.enRoute,
    kind: pair.kind,
    schemaType: pair.schemaType
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

const PERSON_ALLOWED_KEYS = [
  '@type',
  '@id',
  'name',
  'alternateName',
  'url',
  'image',
  'email',
  'alumniOf',
  'homeLocation'
];
const WEBSITE_ALLOWED_KEYS = [
  '@type',
  '@id',
  'url',
  'name',
  'inLanguage',
  'creator'
];
const PAGE_BASE_ALLOWED_KEYS = [
  '@type',
  '@id',
  'url',
  'name',
  'description',
  'inLanguage',
  'isPartOf'
];
const LIST_ALLOWED_KEYS = ['@type', '@id', 'numberOfItems', 'itemListElement'];
const LIST_ITEM_ALLOWED_KEYS = ['@type', 'position', 'item'];
const PROJECT_ALLOWED_KEYS = [
  '@type',
  '@id',
  'name',
  'description',
  'codeRepository',
  'keywords',
  'contributor'
];
const RESEARCH_ALLOWED_KEYS = ['@type', '@id', 'name', 'description'];

const EXPECTED_PROJECT_FACTS = {
  'zh-CN': [
    {
      name: '基于人脸识别技术的多端考勤系统',
      description: '通过摄像头拍照或上传照片识别到课学生，并生成出勤简表和阶段性报告。',
      keywords: ['uni-app', 'Spring Boot', 'MySQL', 'Python', 'Android / 小程序 / Web']
    },
    {
      name: '前后端分离的 KTV 管理系统',
      description: '前端使用 Vue、jQuery、Bootstrap、ACE、ElementUI 和 font-awesome；后端使用 Spring Boot，数据库使用 MySQL。',
      keywords: [
        'Vue',
        'jQuery',
        'Bootstrap',
        'Spring Boot 2.7.1',
        'MySQL 8.0.26',
        'Java 1.8'
      ]
    }
  ],
  en: [
    {
      name: 'Multi-terminal Attendance System Based on Face Recognition',
      description: 'The system recognizes students from camera capture or uploaded photos and generates attendance summaries and staged reports.',
      keywords: ['uni-app', 'Spring Boot', 'MySQL', 'Python', 'Android / Mini Program / Web']
    },
    {
      name: 'Front-end / Back-end Separated KTV Management System',
      description: 'The front end uses Vue, jQuery, Bootstrap, ACE, ElementUI, and font-awesome; the back end uses Spring Boot with MySQL.',
      keywords: [
        'Vue',
        'jQuery',
        'Bootstrap',
        'Spring Boot 2.7.1',
        'MySQL 8.0.26',
        'Java 1.8'
      ]
    }
  ]
};

const EXPECTED_RESEARCH_FACTS = {
  'zh-CN': [
    {
      name: '控制器更新',
      description: '在概率下界偏保守的区域继续改进策略，而不是停在第一次求解。'
    },
    {
      name: 'PAC 近似',
      description: '平衡多项式次数、样本规模与近似误差，降低后续求解压力。'
    },
    {
      name: '证书模板',
      description: '面对更复杂几何结构时，提高 stochastic barrier-like certificates 的表达能力。'
    },
    {
      name: '更复杂系统',
      description: '逐步考虑非多项式动力学、更高维系统和更自动化的学习—验证闭环。'
    }
  ],
  en: [
    {
      name: 'Controller updates',
      description: 'Improve policies in regions where the certified lower bound remains conservative.'
    },
    {
      name: 'PAC approximation',
      description: 'Balance polynomial degree, sample size, and approximation error to reduce solver pressure.'
    },
    {
      name: 'Certificate templates',
      description: 'Increase the expressiveness of stochastic barrier-like certificates for more complex geometries.'
    },
    {
      name: 'More complex systems',
      description: 'Move toward non-polynomial dynamics, higher-dimensional systems, and a more automated learning-verification loop.'
    }
  ]
};

const ANALYTICS_FORBIDDEN_TYPES = new Set(['Dataset', 'InteractionCounter']);
const ANALYTICS_FORBIDDEN_FIELDS = new Set([
  'interactionStatistic',
  'userInteractionCount',
  'localStorage',
  'localTotal',
  'localPage',
  'localDays',
  'firstVisit',
  'lastVisit',
  'visitTime',
  'visitorId',
  'browserId'
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function removeHtmlComments(html) {
  return String(html).replace(/<!--[\s\S]*?-->/g, '');
}

function findTagEnd(source, startIndex) {
  let quote = '';
  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index + 1;
    }
  }
  return -1;
}

function isHtmlWhitespace(character) {
  return character === '\t' ||
    character === '\n' ||
    character === '\f' ||
    character === '\r' ||
    character === ' ';
}

const RAW_TEXT_ELEMENT_NAMES = new Set(['script', 'style']);
const RCDATA_ELEMENT_NAMES = new Set(['textarea', 'title']);

function isScriptingEnabledRawTextElement(tagName) {
  return RAW_TEXT_ELEMENT_NAMES.has(tagName) || tagName === 'noscript';
}

function readHtmlTag(source, startIndex) {
  const match = source.slice(startIndex).match(/^<(\/?)([a-z][^\t\n\f\r />]*)/i);
  if (!match) return null;
  const end = findTagEnd(source, startIndex + match[0].length);
  if (end < 0) return null;
  return {
    end,
    isClosing: match[1] === '/',
    name: match[2].toLowerCase(),
    raw: source.slice(startIndex, end)
  };
}

function findHtmlClosingTag(source, tagName, startIndex) {
  const pattern = new RegExp(`<\\/${tagName}`, 'gi');
  pattern.lastIndex = startIndex;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const delimiterIndex = match.index + match[0].length;
    const delimiter = source[delimiterIndex];
    if (delimiter !== '>' && delimiter !== '/' && !isHtmlWhitespace(delimiter)) {
      continue;
    }
    const end = findTagEnd(source, delimiterIndex);
    if (end < 0) return null;
    return { index: match.index, end };
  }
  return null;
}

function extractJsonLdBlocks(html) {
  const source = String(html);
  const blocks = [];
  let cursor = 0;
  let headSeen = false;
  let inHead = false;
  let templateDepth = 0;

  while (cursor < source.length) {
    const tagStart = source.indexOf('<', cursor);
    if (tagStart < 0) break;
    if (source.startsWith('<!--', tagStart)) {
      const commentEnd = source.indexOf('-->', tagStart + 4);
      cursor = commentEnd < 0 ? source.length : commentEnd + 3;
      continue;
    }

    const tag = readHtmlTag(source, tagStart);
    if (!tag) {
      cursor = tagStart + 1;
      continue;
    }
    const tagEnd = tag.end;
    const isClosing = tag.isClosing;
    const tagName = tag.name;

    if (isClosing) {
      if (tagName === 'template' && templateDepth > 0) {
        templateDepth -= 1;
      } else if (tagName === 'head' && templateDepth === 0) {
        inHead = false;
      }
      cursor = tagEnd;
      continue;
    }

    if (isScriptingEnabledRawTextElement(tagName) || RCDATA_ELEMENT_NAMES.has(tagName)) {
      const closingTag = findHtmlClosingTag(source, tagName, tagEnd);
      if (!closingTag) break;

      if (tagName === 'script' && templateDepth === 0) {
        const attributes = parseAttributes(tag.raw);
        if (String(attributes.type || '').toLowerCase() === 'application/ld+json') {
          blocks.push({
            raw: source.slice(tagStart, closingTag.end),
            content: source.slice(tagEnd, closingTag.index),
            inHead
          });
        }
      }
      cursor = closingTag.end;
      continue;
    }

    if (tagName === 'head' && templateDepth === 0 && !headSeen) {
      headSeen = true;
      inHead = true;
    } else if (tagName === 'body' && templateDepth === 0) {
      inHead = false;
    } else if (tagName === 'template') {
      templateDepth += 1;
    }
    cursor = tagEnd;
  }
  return blocks;
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    middot: '·',
    nbsp: ' ',
    quot: '"'
  };
  return String(value == null ? '' : value)
    .replace(/&(?:#x([0-9a-f]+)|#([0-9]+)|([a-z]+));/gi, (match, hex, decimal, name) => {
      if (hex || decimal) {
        const codePoint = Number.parseInt(hex || decimal, hex ? 16 : 10);
        try {
          return String.fromCodePoint(codePoint);
        } catch (_error) {
          return match;
        }
      }
      return Object.hasOwn(named, name.toLowerCase()) ? named[name.toLowerCase()] : match;
    });
}

function normalizeStructuredText(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function normalizeHtmlText(value) {
  return normalizeStructuredText(decodeHtmlEntities(value));
}

function getDocumentTitle(html) {
  const match = removeHtmlComments(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return '';
  return normalizeHtmlText(match[1].replace(/<[^>]*>/g, ' '));
}

function getMetaDescription(html) {
  const meta = extractTags(removeHtmlComments(html), 'meta')
    .find((tag) => tag.attributes.name === 'description');
  return meta ? normalizeHtmlText(meta.attributes.content) : '';
}

function getVisibleBodyText(html) {
  const activeHtml = removeHtmlComments(html);
  const bodyStart = activeHtml.search(/<body(?=[\t\n\f\r />])/i);
  if (bodyStart < 0) return '';
  const bodyTag = readHtmlTag(activeHtml, bodyStart);
  if (!bodyTag || bodyTag.isClosing || bodyTag.name !== 'body') return '';
  const bodyClosingTag = findHtmlClosingTag(activeHtml, 'body', bodyTag.end);
  if (!bodyClosingTag) return '';

  const bodyHtml = activeHtml.slice(bodyTag.end, bodyClosingTag.index);
  const bodyAttributes = parseAttributes(bodyTag.raw);
  const visibleParts = [];
  const stack = [];
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);
  let hiddenDepth =
    Object.hasOwn(bodyAttributes, 'hidden') ||
    Object.hasOwn(bodyAttributes, 'inert') ||
    String(bodyAttributes['aria-hidden'] || '').toLowerCase() === 'true'
      ? 1
      : 0;
  let cursor = 0;

  while (cursor < bodyHtml.length) {
    const tagStart = bodyHtml.indexOf('<', cursor);
    if (tagStart < 0) break;
    if (hiddenDepth === 0) visibleParts.push(bodyHtml.slice(cursor, tagStart));

    const tag = readHtmlTag(bodyHtml, tagStart);
    if (!tag) {
      if (hiddenDepth === 0) visibleParts.push('<');
      cursor = tagStart + 1;
      continue;
    }
    const tagName = tag.name;

    if (!tag.isClosing && isScriptingEnabledRawTextElement(tagName)) {
      const closingTag = findHtmlClosingTag(bodyHtml, tagName, tag.end);
      cursor = closingTag ? closingTag.end : bodyHtml.length;
      continue;
    }

    if (tag.isClosing) {
      let matchingIndex = -1;
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].tagName === tagName) {
          matchingIndex = index;
          break;
        }
      }
      if (matchingIndex >= 0) {
        while (stack.length > matchingIndex) {
          if (stack.pop().suppressesText) hiddenDepth -= 1;
        }
      }
    } else if (!voidElements.has(tagName) && !/\/\s*>$/.test(tag.raw)) {
      const attributes = parseAttributes(tag.raw);
      const suppressesText =
        tagName === 'template' ||
        Object.hasOwn(attributes, 'hidden') ||
        Object.hasOwn(attributes, 'inert') ||
        String(attributes['aria-hidden'] || '').toLowerCase() === 'true';
      stack.push({ tagName, suppressesText });
      if (suppressesText) hiddenDepth += 1;
    }
    cursor = tag.end;
  }
  if (hiddenDepth === 0) visibleParts.push(bodyHtml.slice(cursor));
  return normalizeHtmlText(visibleParts.join(' '));
}

function isAbsoluteUrl(value) {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch (_error) {
    return false;
  }
}

function isExactIdReference(value, expectedId) {
  return isPlainObject(value) &&
    Object.keys(value).length === 1 &&
    value['@id'] === expectedId;
}

function validateAllowedKeys(value, allowedKeys, label, file, issues) {
  if (!isPlainObject(value)) return;
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) addIssue(issues, file, `${label} has unexpected key ${key}`);
  }
}

function collectInternalIdReferences(value, records = [], pathName = '$') {
  const stack = [{ path: pathName, value }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current.value)) {
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        const childPath = current.path.length < 500
          ? `${current.path}[${index}]`
          : `${current.path.slice(0, 497)}...`;
        stack.push({ path: childPath, value: current.value[index] });
      }
      continue;
    }
    if (!isPlainObject(current.value)) continue;
    if (Object.hasOwn(current.value, '@id')) {
      records.push({
        owner: current.value,
        path: `${current.path}.@id`,
        value: current.value['@id']
      });
    }
    const entries = Object.entries(current.value);
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, child] = entries[index];
      if (key === '@id') continue;
      const childPath = current.path.length < 500
        ? `${current.path}.${key}`
        : `${current.path.slice(0, 497)}...`;
      stack.push({ path: childPath, value: child });
    }
  }
  return records;
}

function stableCanonicalJson(value) {
  const output = [];
  const stack = [{ kind: 'value', value }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current.kind === 'text') {
      output.push(current.value);
    } else if (Array.isArray(current.value)) {
      output.push('[');
      stack.push({ kind: 'text', value: ']' });
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        stack.push({ kind: 'value', value: current.value[index] });
        if (index > 0) stack.push({ kind: 'text', value: ',' });
      }
    } else if (isPlainObject(current.value)) {
      output.push('{');
      stack.push({ kind: 'text', value: '}' });
      const keys = Object.keys(current.value).sort();
      for (let index = keys.length - 1; index >= 0; index -= 1) {
        const key = keys[index];
        stack.push({ kind: 'value', value: current.value[key] });
        stack.push({ kind: 'text', value: ':' });
        stack.push({ kind: 'text', value: JSON.stringify(key) });
        if (index > 0) stack.push({ kind: 'text', value: ',' });
      }
    } else {
      output.push(JSON.stringify(current.value) ?? 'undefined');
    }
  }
  return output.join('');
}

function hasSameStringSet(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((entry) => typeof entry === 'string') &&
    stableCanonicalJson([...actual].sort()) === stableCanonicalJson([...expected].sort());
}

function parseStructuredDataGraph(file, html, issues) {
  const blocks = extractJsonLdBlocks(html);
  const headBlocks = blocks.filter((block) => block.inHead);
  const outsideBlocks = blocks.filter((block) => !block.inHead);

  if (headBlocks.length !== 1) {
    addIssue(issues, file, 'expected exactly one active JSON-LD block in head');
  }
  if (outsideBlocks.length > 0) {
    addIssue(issues, file, 'JSON-LD blocks are not allowed outside head');
  }
  if (headBlocks.length === 0) return null;

  let root;
  try {
    root = JSON.parse(headBlocks[0].content);
  } catch (_error) {
    addIssue(issues, file, 'invalid structured data JSON');
    return null;
  }

  if (!isPlainObject(root)) {
    addIssue(issues, file, 'structured data root must be an object');
    return null;
  }
  validateAllowedKeys(root, ['@context', '@graph'], 'structured data root', file, issues);
  if (root['@context'] !== 'https://schema.org') {
    addIssue(issues, file, '@context must be exactly https://schema.org');
  }
  if (!Array.isArray(root['@graph'])) {
    addIssue(issues, file, '@graph must be an array');
    return { root, graph: [], nodesById: new Map() };
  }

  const graph = root['@graph'];
  const nodesById = new Map();
  const topLevelNodes = new Set();
  graph.forEach((node, index) => {
    if (!isPlainObject(node)) {
      addIssue(issues, file, `top-level graph node ${index + 1} must be an object`);
      return;
    }
    topLevelNodes.add(node);
    if (!Object.hasOwn(node, '@id')) {
      addIssue(issues, file, 'top-level graph node is missing @id');
      return;
    }
    if (!isAbsoluteUrl(node['@id'])) {
      addIssue(issues, file, `top-level @id must be an absolute URL: ${String(node['@id'])}`);
      return;
    }
    if (nodesById.has(node['@id'])) {
      addIssue(issues, file, `duplicate top-level @id ${node['@id']}`);
      return;
    }
    nodesById.set(node['@id'], node);
  });

  for (const reference of collectInternalIdReferences(root)) {
    if (topLevelNodes.has(reference.owner)) continue;
    if (!isAbsoluteUrl(reference.value)) {
      addIssue(
        issues,
        file,
        `nested @id must be an absolute URL at ${reference.path}`
      );
      continue;
    }
    let url;
    try {
      url = new URL(reference.value);
    } catch (_error) {
      continue;
    }
    if (url.origin === SITE_ORIGIN && !nodesById.has(reference.value)) {
      addIssue(
        issues,
        file,
        `unresolved same-origin @id reference ${reference.value}`
      );
    }
  }

  return { root, graph, nodesById };
}

function expectedGraphIds(page) {
  const ids = [`${page.canonical}#webpage`, WEBSITE_ID, PERSON_ID];
  if (page.kind === 'projects') {
    ids.push(`${page.canonical}#project-list`, ...PROJECT_IDS);
  } else if (page.kind === 'research') {
    ids.push(`${page.canonical}#research-directions`, ...RESEARCH_IDS);
  }
  return ids;
}

function validateExactValue(actual, expected, file, message, issues) {
  if (stableCanonicalJson(actual) !== stableCanonicalJson(expected)) {
    addIssue(issues, file, message);
  }
}

function validateCommonStructuredData(page, html, parsed, issues) {
  const expectedIds = expectedGraphIds(page);
  for (const id of expectedIds) {
    if (!parsed.nodesById.has(id)) addIssue(issues, page.file, `missing graph node ${id}`);
  }
  for (const id of parsed.nodesById.keys()) {
    if (!expectedIds.includes(id)) addIssue(issues, page.file, `unexpected graph node ${id}`);
  }
  const pageId = `${page.canonical}#webpage`;
  const pageNode = parsed.nodesById.get(pageId);
  const website = parsed.nodesById.get(WEBSITE_ID) ||
    parsed.graph.find((node) => isPlainObject(node) && node['@type'] === 'WebSite');
  const person = parsed.nodesById.get(PERSON_ID) ||
    parsed.graph.find((node) => isPlainObject(node) && node['@type'] === 'Person');

  if (pageNode) {
    const relationKeys = page.kind === 'profile'
      ? ['mainEntity']
      : page.kind === 'analytics'
        ? ['about']
        : ['mainEntity', 'about'];
    validateAllowedKeys(
      pageNode,
      [...PAGE_BASE_ALLOWED_KEYS, ...relationKeys],
      'page',
      page.file,
      issues
    );
    if (pageNode['@type'] !== page.schemaType) {
      addIssue(issues, page.file, `page @type must be ${page.schemaType}`);
    }
    if (pageNode.url !== page.canonical) {
      addIssue(issues, page.file, 'page url must match canonical');
    }
    if (normalizeStructuredText(pageNode.name) !== getDocumentTitle(html)) {
      addIssue(issues, page.file, 'page name must match the document title');
    }
    if (normalizeStructuredText(pageNode.description) !== getMetaDescription(html)) {
      addIssue(issues, page.file, 'page description must match the meta description');
    }
    if (pageNode.inLanguage !== page.lang) {
      addIssue(issues, page.file, `page inLanguage must be ${page.lang}`);
    }
    if (!isExactIdReference(pageNode.isPartOf, WEBSITE_ID)) {
      addIssue(issues, page.file, 'isPartOf must be an @id-only object referencing WebSite');
    }

    if (page.kind === 'profile') {
      if (!isExactIdReference(pageNode.mainEntity, PERSON_ID)) {
        addIssue(issues, page.file, 'mainEntity must be an @id-only object referencing Person');
      }
    } else if (page.kind === 'analytics') {
      if (!isExactIdReference(pageNode.about, WEBSITE_ID)) {
        addIssue(issues, page.file, 'analytics about must reference WebSite');
      }
    } else {
      const suffix = page.kind === 'projects' ? '#project-list' : '#research-directions';
      if (!isExactIdReference(pageNode.mainEntity, `${page.canonical}${suffix}`)) {
        addIssue(issues, page.file, 'mainEntity must reference the page ItemList');
      }
      if (!isExactIdReference(pageNode.about, PERSON_ID)) {
        addIssue(issues, page.file, 'about must be an @id-only object referencing Person');
      }
    }
  }

  if (website) {
    validateAllowedKeys(website, WEBSITE_ALLOWED_KEYS, 'WebSite', page.file, issues);
    if (website['@type'] !== 'WebSite') addIssue(issues, page.file, 'WebSite @type must be WebSite');
    if (website['@id'] !== WEBSITE_ID) addIssue(issues, page.file, `WebSite @id must be ${WEBSITE_ID}`);
    if (website.url !== `${SITE_ORIGIN}/`) addIssue(issues, page.file, 'WebSite url must be the site root');
    const expectedName = page.lang === 'zh-CN' ? '闫士博' : 'ShiBo Yan';
    if (website.name !== expectedName) {
      addIssue(issues, page.file, `WebSite name must be ${expectedName}`);
    }
    if (!hasSameStringSet(website.inLanguage, ['zh-CN', 'en'])) {
      addIssue(issues, page.file, 'WebSite inLanguage must contain zh-CN and en');
    }
    if (!isExactIdReference(website.creator, PERSON_ID)) {
      addIssue(issues, page.file, 'WebSite creator must reference Person');
    }
  }

  if (person) {
    if (Object.hasOwn(person, 'inLanguage')) {
      addIssue(issues, page.file, 'Person must not contain inLanguage');
    }
    validateAllowedKeys(person, PERSON_ALLOWED_KEYS, 'Person', page.file, issues);
    if (person['@type'] !== 'Person') addIssue(issues, page.file, 'Person @type must be Person');
    if (person['@id'] !== PERSON_ID) addIssue(issues, page.file, `Person @id must be ${PERSON_ID}`);
    const expectedPerson = {
      name: page.lang === 'zh-CN' ? '闫士博' : 'ShiBo Yan',
      alternateName: page.lang === 'zh-CN' ? 'ShiBo Yan' : '闫士博',
      url: `${SITE_ORIGIN}/`,
      image: `${SITE_ORIGIN}/assets/profile/photo.jpg`,
      email: 'mailto:y423314860@163.com',
      alumniOf: { '@type': 'CollegeOrUniversity', name: 'Southwest University' },
      homeLocation: { '@type': 'Place', name: 'Chongqing, China' }
    };
    for (const [key, expected] of Object.entries(expectedPerson)) {
      validateExactValue(
        person[key],
        expected,
        page.file,
        `Person ${key} must match the approved fact`,
        issues
      );
    }
  }

  return { pageNode, website, person };
}

function validateListContract(page, list, ids, kind, issues) {
  if (!list) return;
  validateAllowedKeys(list, LIST_ALLOWED_KEYS, `${kind} ItemList`, page.file, issues);
  if (list['@type'] !== 'ItemList') {
    addIssue(issues, page.file, `${kind} list @type must be ItemList`);
  }
  if (list.numberOfItems !== ids.length) {
    addIssue(issues, page.file, `${kind} list numberOfItems must be ${ids.length}`);
  }
  if (!Array.isArray(list.itemListElement) || list.itemListElement.length !== ids.length) {
    addIssue(
      issues,
      page.file,
      `${kind} list must contain exactly ${ids.length} elements`
    );
  }
  if (!Array.isArray(list.itemListElement)) return;

  list.itemListElement.forEach((entry, index) => {
    if (!isPlainObject(entry)) {
      addIssue(issues, page.file, `${kind} ListItem ${index + 1} must be an object`);
      return;
    }
    validateAllowedKeys(entry, LIST_ITEM_ALLOWED_KEYS, 'ListItem', page.file, issues);
    if (entry['@type'] !== 'ListItem') {
      addIssue(issues, page.file, `${kind} list entries must use @type ListItem`);
    }
    if (!isExactIdReference(entry.item, ids[index])) {
      addIssue(
        issues,
        page.file,
        `${kind} list item order must match the approved inventory`
      );
    }
  });

  const positions = list.itemListElement.map((entry) => (
    isPlainObject(entry) ? entry.position : undefined
  ));
  const expectedPositions = ids.map((_id, index) => index + 1);
  if (stableCanonicalJson(positions) !== stableCanonicalJson(expectedPositions)) {
    addIssue(
      issues,
      page.file,
      kind === 'project'
        ? 'project list positions must be 1 and 2'
        : 'research list positions must be 1 through 4'
    );
  }
}

function valueAppearsInVisibleText(visibleText, value) {
  const normalizedValue = normalizeStructuredText(value);
  return normalizedValue.length > 0 && visibleText.includes(normalizedValue);
}

function validateProjectStructuredData(page, html, parsed, issues) {
  const list = parsed.nodesById.get(`${page.canonical}#project-list`);
  validateListContract(page, list, PROJECT_IDS, 'project', issues);
  const visibleText = getVisibleBodyText(html);
  const expectedFacts = EXPECTED_PROJECT_FACTS[page.lang];

  PROJECT_IDS.forEach((id, index) => {
    const project = parsed.nodesById.get(id);
    if (!project) return;
    validateAllowedKeys(project, PROJECT_ALLOWED_KEYS, 'SoftwareSourceCode', page.file, issues);
    if (project['@type'] !== 'SoftwareSourceCode') {
      addIssue(issues, page.file, 'project @type must be SoftwareSourceCode');
    }
    const expected = expectedFacts[index];
    validateExactValue(
      project.name,
      expected.name,
      page.file,
      'project name must match the approved localized value',
      issues
    );
    validateExactValue(
      project.description,
      expected.description,
      page.file,
      'project description must match the approved localized value',
      issues
    );
    validateExactValue(
      project.keywords,
      expected.keywords,
      page.file,
      'project keywords must match the approved inventory',
      issues
    );
    if (project.codeRepository !== EXPECTED_PROJECT_REPOSITORIES.get(id)) {
      addIssue(
        issues,
        page.file,
        'project codeRepository must match the approved repository'
      );
    }
    if (!isExactIdReference(project.contributor, PERSON_ID)) {
      addIssue(issues, page.file, 'project contributor must reference Person');
    }
    if (!valueAppearsInVisibleText(visibleText, project.name)) {
      addIssue(issues, page.file, 'project name must appear in visible page text');
    }
    if (!valueAppearsInVisibleText(visibleText, project.description)) {
      addIssue(issues, page.file, 'project description must appear in visible page text');
    }
    if (Array.isArray(project.keywords)) {
      for (const keyword of project.keywords) {
        if (!valueAppearsInVisibleText(visibleText, keyword)) {
          addIssue(issues, page.file, 'project keyword must appear in visible page text');
        }
      }
    }
  });
}

function validateResearchStructuredData(page, html, parsed, issues) {
  const list = parsed.nodesById.get(`${page.canonical}#research-directions`);
  validateListContract(page, list, RESEARCH_IDS, 'research', issues);
  const visibleText = getVisibleBodyText(html);
  const expectedFacts = EXPECTED_RESEARCH_FACTS[page.lang];

  RESEARCH_IDS.forEach((id, index) => {
    const item = parsed.nodesById.get(id);
    if (!item) return;
    validateAllowedKeys(item, RESEARCH_ALLOWED_KEYS, 'research Thing', page.file, issues);
    if (item['@type'] !== 'Thing') {
      addIssue(issues, page.file, 'research item @type must be Thing');
    }
    const expected = expectedFacts[index];
    validateExactValue(
      item.name,
      expected.name,
      page.file,
      'research name must match the approved localized value',
      issues
    );
    validateExactValue(
      item.description,
      expected.description,
      page.file,
      'research description must match the approved localized value',
      issues
    );
    if (!valueAppearsInVisibleText(visibleText, item.name)) {
      addIssue(issues, page.file, 'research name must appear in visible page text');
    }
    if (!valueAppearsInVisibleText(visibleText, item.description)) {
      addIssue(issues, page.file, 'research description must appear in visible page text');
    }
  });
}

function validateAnalyticsStructuredData(page, parsed, common, issues) {
  if (common.pageNode && Object.hasOwn(common.pageNode, 'mainEntity')) {
    addIssue(issues, page.file, 'analytics page must not contain mainEntity');
  }

  const seenTypes = new Set();
  const seenFields = new Set();
  const stack = [parsed.root];
  while (stack.length > 0) {
    const value = stack.pop();
    if (Array.isArray(value)) {
      stack.push(...value);
      continue;
    }
    if (!isPlainObject(value)) continue;
    const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
    for (const type of types) {
      if (ANALYTICS_FORBIDDEN_TYPES.has(type) && !seenTypes.has(type)) {
        seenTypes.add(type);
        addIssue(
          issues,
          page.file,
          `analytics structured data must not contain @type ${type}`
        );
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (ANALYTICS_FORBIDDEN_FIELDS.has(key) && !seenFields.has(key)) {
        seenFields.add(key);
        addIssue(
          issues,
          page.file,
          `analytics structured data must not contain field ${key}`
        );
      }
      stack.push(child);
    }
  }
}

function validateStructuredDataPage(page, html, issues) {
  let parsed;
  try {
    parsed = parseStructuredDataGraph(page.file, html, issues);
    if (!parsed) return null;
    const common = validateCommonStructuredData(page, html, parsed, issues);
    if (page.kind === 'projects') {
      validateProjectStructuredData(page, html, parsed, issues);
    } else if (page.kind === 'research') {
      validateResearchStructuredData(page, html, parsed, issues);
    } else if (page.kind === 'analytics') {
      validateAnalyticsStructuredData(page, parsed, common, issues);
    }
    return { page, parsed, ...common };
  } catch (error) {
    addIssue(
      issues,
      page.file,
      `structured data validation could not continue: ${error.message}`
    );
    return { page, parsed };
  }
}

function validateNotFoundStructuredData(page, html, issues) {
  if (extractJsonLdBlocks(html).length > 0) {
    addIssue(issues, page.file, '404 pages must not contain active JSON-LD');
  }
}

function validateStructuredDataConsistency(records, issues) {
  const personRecords = records
    .map((record) => ({
      page: record.page,
      node: record.parsed.graph.find((node) => (
        isPlainObject(node) && node['@type'] === 'Person'
      ))
    }))
    .filter((record) => record.node);
  const websiteRecords = records
    .map((record) => ({
      page: record.page,
      node: record.parsed.graph.find((node) => (
        isPlainObject(node) && node['@type'] === 'WebSite'
      ))
    }))
    .filter((record) => record.node);

  if (personRecords.length > 0) {
    const baseline = personRecords[0].node;
    const baselineNames = [baseline.name, baseline.alternateName].sort();
    const baselineFacts = {
      '@type': baseline['@type'],
      url: baseline.url,
      image: baseline.image,
      email: baseline.email,
      alumniOf: baseline.alumniOf,
      homeLocation: baseline.homeLocation
    };
    for (const record of personRecords.slice(1)) {
      if (record.node['@id'] !== baseline['@id']) {
        addIssue(issues, record.page.file, 'Person @id must be consistent across pages');
      }
      if (stableCanonicalJson([record.node.name, record.node.alternateName].sort()) !==
          stableCanonicalJson(baselineNames)) {
        addIssue(issues, record.page.file, 'Person name set must be consistent across pages');
      }
      const facts = {
        '@type': record.node['@type'],
        url: record.node.url,
        image: record.node.image,
        email: record.node.email,
        alumniOf: record.node.alumniOf,
        homeLocation: record.node.homeLocation
      };
      if (stableCanonicalJson(facts) !== stableCanonicalJson(baselineFacts)) {
        addIssue(issues, record.page.file, 'Person stable facts must be consistent across pages');
      }
    }
  }

  if (websiteRecords.length > 0) {
    const baseline = websiteRecords[0].node;
    const baselineFacts = {
      '@type': baseline['@type'],
      url: baseline.url,
      creator: baseline.creator
    };
    const baselineLanguages = Array.isArray(baseline.inLanguage)
      ? [...baseline.inLanguage].sort()
      : baseline.inLanguage;
    const namesByLanguage = new Map();
    for (const record of websiteRecords) {
      if (record.node['@id'] !== baseline['@id']) {
        addIssue(issues, record.page.file, 'WebSite @id must be consistent across pages');
      }
      const facts = {
        '@type': record.node['@type'],
        url: record.node.url,
        creator: record.node.creator
      };
      if (stableCanonicalJson(facts) !== stableCanonicalJson(baselineFacts)) {
        addIssue(issues, record.page.file, 'WebSite stable facts must be consistent across pages');
      }
      const languages = Array.isArray(record.node.inLanguage)
        ? [...record.node.inLanguage].sort()
        : record.node.inLanguage;
      if (stableCanonicalJson(languages) !== stableCanonicalJson(baselineLanguages)) {
        addIssue(issues, record.page.file, 'WebSite language set must be consistent across pages');
      }
      if (!namesByLanguage.has(record.page.lang)) {
        namesByLanguage.set(record.page.lang, record.node.name);
      } else if (namesByLanguage.get(record.page.lang) !== record.node.name) {
        addIssue(
          issues,
          record.page.file,
          `WebSite name must be consistent across ${record.page.lang} pages`
        );
      }
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
  const structuredDataRecords = [];
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
    const structuredData = validateStructuredDataPage(page, html, issues);
    if (structuredData) structuredDataRecords.push(structuredData);
    validateIndexableMetadata(page, html, issues);
  }

  validateStructuredDataConsistency(structuredDataRecords, issues);

  for (const page of NOT_FOUND_PAGES) {
    if (!existingHtml.has(page.file)) continue;
    const html = readUtf8(absoluteRoot, page.file);
    validateDocumentStructure(absoluteRoot, page.file, html, page.lang, issues);
    validateLocalReferences(absoluteRoot, page.file, html, issues, anchorCache);
    validateNotFoundStructuredData(page, html, issues);
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
