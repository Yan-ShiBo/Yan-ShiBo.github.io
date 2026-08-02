const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');

const SITE_ORIGIN = 'https://yan-shibo.github.io';
const PERSON_ID = `${SITE_ORIGIN}/#person`;
const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
const PROJECT_IDS = [
  `${SITE_ORIGIN}/#project-persevere-study`,
  `${SITE_ORIGIN}/#project-mic-family`,
  `${SITE_ORIGIN}/#project-vision-obstacle-avoidance-rover`,
  `${SITE_ORIGIN}/#project-local-read-translate`,
  `${SITE_ORIGIN}/#project-bilingual-subtitle-pipeline`,
  `${SITE_ORIGIN}/#project-photo-selector`,
  `${SITE_ORIGIN}/#project-biliclaw-extended`,
  `${SITE_ORIGIN}/#project-personal-knowledge-base`,
  `${SITE_ORIGIN}/#project-codex-skills-kit`,
  `${SITE_ORIGIN}/#project-portfolio`
];
const RESEARCH_IDS = [
  `${SITE_ORIGIN}/#research-stochastic-reach-avoid-control`,
  `${SITE_ORIGIN}/#research-formal-probabilistic-guarantees`,
  `${SITE_ORIGIN}/#research-learning-enabled-formal-verification`
];
const EXPECTED_PROJECT_REPOSITORIES = new Map([
  [
    'https://yan-shibo.github.io/#project-persevere-study',
    'https://github.com/Yan-ShiBo/PersevereStudy'
  ],
  [
    'https://yan-shibo.github.io/#project-mic-family',
    'https://github.com/Yan-ShiBo/MicFamily'
  ],
  [
    'https://yan-shibo.github.io/#project-local-read-translate',
    'https://github.com/Yan-ShiBo/LocalReadTranslate'
  ],
  [
    'https://yan-shibo.github.io/#project-bilingual-subtitle-pipeline',
    'https://github.com/Yan-ShiBo/bilingual-subtitle-pipeline'
  ],
  [
    'https://yan-shibo.github.io/#project-photo-selector',
    'https://github.com/Yan-ShiBo/photo-selector'
  ],
  [
    'https://yan-shibo.github.io/#project-biliclaw-extended',
    'https://github.com/Yan-ShiBo/BiliClaw-Extended'
  ],
  [
    'https://yan-shibo.github.io/#project-personal-knowledge-base',
    'https://github.com/Yan-ShiBo/PersonalKnowledgeBase'
  ],
  [
    'https://yan-shibo.github.io/#project-codex-skills-kit',
    'https://github.com/Yan-ShiBo/codex-skills-kit'
  ],
  [
    'https://yan-shibo.github.io/#project-portfolio',
    'https://github.com/Yan-ShiBo/Yan-ShiBo.github.io'
  ]
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
  'analytics.html',
  'en/analytics.html'
]);

const STATS_API_ORIGIN = 'https://yan-shibo-site-stats.yan-shibo.workers.dev';
const STATS_API_ENDPOINT = `${STATS_API_ORIGIN}/v1/visit`;
const STATS_PRECONNECT_ORIGINS = new Set([
  STATS_API_ORIGIN
]);
const LEGACY_STATS_MARKERS = [
  ['busu', 'anzi'].join(''),
  ['ver', 'count'].join('')
];

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
const MANIFEST_ICON_KEYS = ['purpose', 'sizes', 'src', 'type'];
const MANIFEST_ICON_INVENTORY_ISSUE =
  'icons must exactly match the install icon inventory by src';
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const BRAND_MARK_FILE = 'assets/icons/brand-mark.png';
const BRAND_MARK_SIZE = '64x64';
const BRAND_MARK_MAX_BYTES = 16 * 1024;
const FAVICON_FILE = 'assets/icons/site.ico';
const FAVICON_SIZES = ['16x16', '32x32', '48x48', '256x256'];

const MANIFEST_BY_LANGUAGE = new Map(
  MANIFEST_CONTRACTS.map((contract) => [contract.lang, contract])
);

const ANALYTICS_PAGES = new Set(['analytics.html', 'en/analytics.html']);

const PUBLIC_STATS_IDS = [
  'site-pv',
  'month-unique-devices',
  'page-pv',
  'stats-status'
];
const MOBILE_BREAKPOINT_PX = 833;
const MOBILE_MENU_CLEANUP_ISSUE =
  `mobile menu cleanup must share the (max-width: ${MOBILE_BREAKPOINT_PX}px) breakpoint predicate`;
const MOBILE_CSS_BREAKPOINT_ISSUE =
  `mobile navigation and 44px touch-target rules must share one (max-width: ${MOBILE_BREAKPOINT_PX}px) media block`;
const RESUME_OVERFLOW_CSS_ISSUE =
  'resume cards, contact values, keyword tags, and long actions must remain shrinkable on narrow viewports';
const PROFILE_CONTACT_FILES = ['profile.html', 'en/profile.html'];
const PROFILE_CONTACT_EMAILS = [
  'y423314860@163.com',
  'yan3425@email.swu.edu.cn'
];
const PROFILE_CONTACTS_ISSUE =
  'profile contact panel must list both approved email links and exclude phone and WeChat details';
const PROFILE_MODELING_AWARD_ISSUE =
  'profile must identify the 2020 modeling honor as the Certificate Authority Cup, never MCM/ICM';
const PROFILE_KTV_CONTRACT_ISSUE =
  'profile KTV record must bind uni-app, the internship period, and the project-development period to the same experience';
const PROFILE_CONTACT_CSS_ISSUE =
  'profile email links and summary tags must remain shrinkable and wrappable on narrow viewports';
const RESUME_ANCHOR_CONTRACT_ISSUE =
  'resume anchor bar must link once, in order, to the six stable heading IDs';
const RESUME_MATERIALS_CONTRACT_ISSUE =
  'resume materials must expose only the PDF resume, transcript PDF, and profile links without previews or lightbox media';
const RESUME_ACADEMIC_FACTS_ISSUE =
  'resume must show degree GPA 3.95 / 5.00 and degree-required course rank 8 / 120, never 8 / 124';
const RESUME_KTV_CONTRACT_ISSUE =
  'resume KTV entry must match the approved concise internship summary and visibly include Spring Boot, MySQL, and uni-app';
const RESUME_CBF_ROVER_CONTRACT_ISSUE =
  'resume CBF-Rover entry must name exact and Gazebo validation and state that fixed-geometry q-SBC is not ready';
const RESUME_AWARDS_CONTRACT_ISSUE =
  'resume awards must preserve the approved PDF-aligned selection, order, and Certificate Authority Cup identity';
const RESUME_CCF_A_CONTRACT_ISSUE =
  'resume CCF Class A entry must preserve the full title, author order, and submitted status';
const RESUME_SERVICE_CONTRACT_ISSUE =
  'resume organization and practice section must preserve the five approved entries, dates, roles, and PDF order';
const RESUME_TYPOGRAPHY_CSS_ISSUE =
  'resume typography must use the smaller page scale and normal-weight organization and practice entries';
const RESUME_PDF_SOURCE_CONTRACT_ISSUE =
  'downloadable resume PDF must remain byte-identical to the user-provided one-page source file';
const RESUME_PDF_SOURCE_SHA256 =
  '0656540eecf90265d7bb451d4e91b337d34d2988c7922d3f3bd3d01da9b12f36';
const RESUME_HEADING_IDS = [
  'resume-education-title',
  'resume-research-title',
  'resume-projects-title',
  'resume-awards-title',
  'resume-service-title',
  'resume-materials-title'
];
const RESUME_PAGE_CONTRACTS = [
  {
    file: 'resume.html',
    materials: [
      './docs/Shibo-Yan-Resume.pdf',
      './docs/Shibo-Yan-Undergraduate-Transcript.pdf',
      'profile.html#graduate'
    ],
    serviceHeading: '组织与实践经历',
    serviceEntries: [
      ['2022.05—2024.05', '清华社全国高等学校计算机与产业实践资源建设专家委员会（TIPCC）', '聘请志愿者'],
      ['2021.09—2022.08', '沙坪坝区基层服务青年优才', '宣传策划组组长', '校级 2021—2022 年度优秀项目'],
      ['2019.09—2020.05', '计算机与信息科学学院 软件学院学生会', '学习科技部', '干事'],
      ['2023.06—2024.06', '西南大学计算机与信息科学学院 软件学院', '科研助理'],
      ['2021.09—2022.12', '百度松果菁英班', '优秀结课学员', '总积分排名第 2']
    ],
    gpaPattern: /学位(?:平均分)?绩点\s*3\.95\s*\/\s*5\.00/,
    rankPattern: /学位课程排名\s*8\s*\/\s*120/,
    ccfAStatus: '在投',
    ccfAVenue: 'CCF A 类会议',
    ccfAAuthor: '第二作者（导师第一作者）',
    ktvDate: '2022.06—2022.08',
    ktvSummaryFragments: ['协调团队完成系统开发与联调', 'Spring Boot', 'MySQL', 'uni-app', '实习评分 94 分'],
    cbfReadiness: '固定几何 q-SBC 仍处于未就绪状态',
    cbfForbiddenPatterns: [
      /完成(?:了)?(?:固定几何\s*)?q-SBC/i,
      /q-SBC\s*(?:已)?(?:完成|就绪)/i,
      /完成障碍证书合成/
    ],
    modelingAward: '第九届“认证杯”国际数学建模竞赛',
    forbiddenAwards: [
      ['2024', '研究生学业奖学金二等奖']
    ],
    awards: [
      ['2024', '“华为杯”', '第二十一届', '二等奖'],
      ['2020', '“认证杯”', 'Honorable Mention'],
      ['2021—2022', '第十三、十四届', '二等奖'],
      ['2019—2022', '本科期间其他荣誉', '本科二等奖学金', '三好学生', '精神文明奖', '优秀共青团员'],
      ['2024—2025', '研究生期间其他荣誉', '学术科技创新先进个人', '研究生学业奖学金一等奖']
    ]
  },
  {
    file: 'en/resume.html',
    materials: [
      '../docs/Shibo-Yan-Resume.pdf',
      '../docs/Shibo-Yan-Undergraduate-Transcript.pdf',
      'profile.html#graduate'
    ],
    serviceHeading: 'Organizational and practical experience',
    serviceEntries: [
      ['2022.05—2024.05', 'Tsinghua University Press National Expert Committee for University Computing and Industry Practice Resources (TIPCC)', 'Invited volunteer'],
      ['2021.09—2022.08', 'Shapingba District Grassroots Service Young Talent Program', 'Publicity planning team lead', 'University-level outstanding project, 2021—2022'],
      ['2019.09—2020.05', 'Student Union, School of Computer and Information Science / School of Software', 'Learning and Technology Department', 'Officer'],
      ['2023.06—2024.06', 'School of Computer and Information Science / School of Software, Southwest University', 'Research assistant'],
      ['2021.09—2022.12', 'Baidu Pinecone Elite Program', 'Outstanding graduate', 'Ranked 2nd overall']
    ],
    gpaPattern: /Degree GPA\s*:?\s*3\.95\s*\/\s*5\.00/i,
    rankPattern: /Degree-required course rank\s*:?\s*8\s*\/\s*120/i,
    ccfAStatus: 'Submitted',
    ccfAVenue: 'CCF Class A conference',
    ccfAAuthor: 'Second author (advisor first)',
    ktvDate: '2022.06—2022.08',
    ktvSummaryFragments: ['Coordinated the team through system development and integration', 'Spring Boot', 'MySQL', 'uni-app', 'internship score of 94'],
    cbfReadiness: 'the fixed-geometry q-SBC remains not ready',
    cbfForbiddenPatterns: [
      /completed (?:the )?(?:fixed-geometry )?q-SBC/i,
      /q-SBC (?:is )?(?:complete|ready)/i,
      /completed barrier-certificate synthesis/i
    ],
    modelingAward: 'Certificate Authority Cup International Mathematical Contest in Modeling',
    forbiddenAwards: [
      ['2024', 'Second-Class Graduate Academic Scholarship']
    ],
    awards: [
      ['2024', '21st', '“Huawei Cup”', 'Second Prize'],
      ['2020', 'Certificate Authority Cup', 'Honorable Mention'],
      ['2021—2022', '13th and 14th', 'Second Prize'],
      ['2019—2022', 'Additional undergraduate honors', 'Second-Class Scholarship', 'Merit Student', 'Spiritual Civilization Award', 'Outstanding Communist Youth League Member'],
      ['2024—2025', 'Additional graduate honors', 'Outstanding Individual in Academic, Scientific, and Technological Innovation', 'First-Class Graduate Academic Scholarship']
    ]
  }
];
const PROOF_RAIL_CSS_ISSUE =
  'proof rails must use one card size and expose grab and dragging states';
const PROOF_RAIL_DRAG_ISSUE =
  'proof rails must support mouse drag scrolling without opening evidence after a drag';
const HOME_HERO_MOBILE_CSS_ISSUE =
  'mobile home hero cards must use the unified full-width dossier rail with wrappable summaries and quick links';
const PROJECT_GRID_CSS_ISSUE =
  'project grids must use stable auto-fit columns while one- and two-card groups fill available width';
const HOME_QUOTE_CSS_ISSUE =
  'home quotation must keep primary quote text brighter than its source';
const NOT_FOUND_LOCALIZATION_ISSUE =
  'root 404 must localize /en/... missing routes in place with root-absolute links and shared five-second redirects';
const HOME_QUOTE_INVENTORY_ISSUE =
  'home quotation must include exactly one quote-text and no duplicate poem-note';
const HOME_HERO_STRUCTURE_ISSUE =
  'home hero must include one semantic side surface containing one ordered four-card hero-side rail whose direct home-quick-card wraps ordered research, projects, profile, and GitHub links, without legacy hero stats';
const HOME_SECTION_SEQUENCE_ISSUE =
  'home sections after the hero must be muted current, plain updates, muted beyond, and one tile-dark quote band with alternating tones and visible referenced h2 headings';
const ENGLISH_COPY_FILES = [
  'en/index.html',
  'en/profile.html',
  'en/research.html',
  'en/projects.html',
  'en/resume.html',
  'en/analytics.html',
  'en/404.html'
];
const LEGACY_ENGLISH_TERMINOLOGY = [
  {
    pattern: /\bgraduation design\b/i,
    legacy: 'graduation design',
    preferred: 'undergraduate capstone project'
  },
  {
    pattern: /\bmulti-terminal\b/i,
    legacy: 'multi-terminal',
    preferred: 'multi-platform'
  },
  {
    pattern: /\bdegree-course\b/i,
    legacy: 'degree-course',
    preferred: 'degree-required course'
  },
  {
    pattern: /\bproof photo\b/i,
    legacy: 'Proof photo',
    preferred: 'Supporting evidence'
  },
  {
    pattern: /\bHonourable Mention\b/i,
    legacy: 'Honourable Mention',
    preferred: 'Honorable Mention'
  },
  {
    pattern: /\bfront-end\s*\/\s*back-end\s+(?:separated|separation)\b/i,
    legacy: 'front-end / back-end separated',
    preferred: 'decoupled front-end/back-end architecture'
  },
  {
    pattern: /\bdelivery rhythm\b/i,
    legacy: 'delivery rhythm',
    preferred: 'project scheduling'
  },
  {
    pattern: /\bstaged reports\b/i,
    legacy: 'staged reports',
    preferred: 'periodic reports'
  },
  {
    pattern: /\bproject proof\b/i,
    legacy: 'project proof',
    preferred: 'supporting evidence'
  },
  {
    pattern: /\bprobability bounds?\b/i,
    legacy: 'probability bound',
    preferred: 'probability lower bound'
  },
  {
    pattern: /\bprobability guarantees?\b/i,
    legacy: 'probability guarantee',
    preferred: 'probabilistic guarantee'
  }
];
const LOCAL_STATS_IDS = [
  'local-total',
  'local-page',
  'local-days',
  'local-first',
  'local-last'
];
const STATS_INTEGER_CONTRACT_ISSUE =
  'Worker responses must expose non-negative ASCII decimal strings plus the approved period and start date';
const STATS_ZERO_CONTRACT_ISSUE = 'zero must remain a valid public counter';
const STATS_UNAVAILABLE_CONTRACT_ISSUE =
  'invalid or unavailable Worker responses must render -- and end in warn state';
const STATS_STATUS_MARKUP_ISSUE =
  'stats status must start in loading state and expose a polite atomic status live region';
const STATS_LOADING_CONTRACT_ISSUE =
  'public statistics must make one JSON POST with a five-second abort deadline and loading, ok, and warn states';
const STATS_ENDPOINT_MARKUP_ISSUE =
  'stats pages must expose exactly one approved API endpoint meta and preconnect';
const STATS_LEGACY_RUNTIME_ISSUE =
  'legacy public-counter runtime references are forbidden';
const STATS_LOCAL_DATE_CONTRACT_ISSUE =
  'local visit dates must remain formatted text';
const STATS_LOCAL_HISTORY_CONTRACT_ISSUE =
  'canonical local visit history must share one current timestamp, use exact ISO values, unique real days ending today, a 365-day cap, and matching rendered values';
const STATS_LOCAL_COUNT_CONTRACT_ISSUE =
  'canonical local visit counters must use exact non-negative ASCII decimals, lossless increment, and invalid-state recovery';
const STATS_LOCAL_COUNTER_VM_TIMEOUT_MS = 100;
const STATS_LEGACY_STORAGE_CONTRACT_ISSUE =
  'legacy local history must transition safely without overriding canonical values, deleting legacy keys, or activating invalid data';

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

function getFileSystemEntry(absolutePath, fileSystemCache) {
  const normalizedPath = path.resolve(absolutePath);
  if (fileSystemCache && fileSystemCache.entries.has(normalizedPath)) {
    return fileSystemCache.entries.get(normalizedPath);
  }

  const exists = fs.existsSync(normalizedPath);
  const entry = {
    exists,
    isDirectory: exists && fs.statSync(normalizedPath).isDirectory()
  };
  if (fileSystemCache) fileSystemCache.entries.set(normalizedPath, entry);
  return entry;
}

function getDirectoryNames(absolutePath, fileSystemCache) {
  const normalizedPath = path.resolve(absolutePath);
  if (fileSystemCache && fileSystemCache.directoryNames.has(normalizedPath)) {
    return fileSystemCache.directoryNames.get(normalizedPath);
  }

  const names = new Set(fs.readdirSync(normalizedPath));
  if (fileSystemCache) fileSystemCache.directoryNames.set(normalizedPath, names);
  return names;
}

function hasExactPathCase(rootDir, targetAbsolutePath, fileSystemCache) {
  const relativePath = path.relative(path.resolve(rootDir), targetAbsolutePath);
  if (!relativePath) return true;

  let currentDirectory = path.resolve(rootDir);
  for (const segment of relativePath.split(path.sep)) {
    const entry = getFileSystemEntry(currentDirectory, fileSystemCache);
    if (!entry.exists || !entry.isDirectory) return false;
    if (!getDirectoryNames(currentDirectory, fileSystemCache).has(segment)) return false;
    currentDirectory = path.join(currentDirectory, segment);
  }
  return true;
}

function resolveLocalReference(rootDir, sourceRelativePath, reference, fileSystemCache) {
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

  if (getFileSystemEntry(targetAbsolutePath, fileSystemCache).isDirectory) {
    targetAbsolutePath = path.join(targetAbsolutePath, 'index.html');
  }
  const targetEntry = getFileSystemEntry(targetAbsolutePath, fileSystemCache);

  return {
    kind: 'local',
    reference: trimmed,
    absolutePath: targetAbsolutePath,
    relativePath: toPosix(path.relative(rootAbsolutePath, targetAbsolutePath)),
    exists: targetEntry.exists,
    exactCase: hasExactPathCase(rootAbsolutePath, targetAbsolutePath, fileSystemCache),
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

function validateReference(
  rootDir,
  sourceFile,
  reference,
  issues,
  anchorCache,
  fileSystemCache
) {
  const result = resolveLocalReference(rootDir, sourceFile, reference, fileSystemCache);
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

function validateLocalReferences(
  rootDir,
  file,
  html,
  issues,
  anchorCache,
  fileSystemCache
) {
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
          anchorCache,
          fileSystemCache
        );
      }
    }
  }
}

function validateDocumentStructure(
  rootDir,
  file,
  html,
  expectedLang,
  issues,
  fileSystemCache
) {
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
    .map((tag) => resolveLocalReference(
      rootDir,
      file,
      tag.attributes.href,
      fileSystemCache
    ))
    .filter((result) => result.kind === 'local')
    .map((result) => result.relativePath);
  for (const resource of expectedResources) {
    if (!linkedResources.includes(resource)) {
      addIssue(issues, file, `missing required resource link ${resource}`);
    }
  }

  const expectedManifest = MANIFEST_BY_LANGUAGE.get(expectedLang).file;
  const activeHtml = html.replace(/<!--[\s\S]*?-->/g, '');
  const headLinks = extractHeadTags(html, 'link');
  const manifestLinks = headLinks.filter((tag) => (
    String(tag.attributes.rel || '').toLowerCase().split(/\s+/).includes('manifest')
  ));
  const allManifestLinks = extractTags(activeHtml, 'link').filter((tag) => (
    String(tag.attributes.rel || '').toLowerCase().split(/\s+/).includes('manifest')
  ));
  const hasExpectedManifest = allManifestLinks.length === 1 && manifestLinks.length === 1 && (() => {
    const resolved = resolveLocalReference(
      rootDir,
      file,
      manifestLinks[0].attributes.href,
      fileSystemCache
    );
    return resolved.kind === 'local' && resolved.relativePath === expectedManifest;
  })();
  if (!hasExpectedManifest) {
    addIssue(issues, file, `expected exactly one manifest link to ${expectedManifest}`);
  }

  const scriptResources = scripts
    .map((tag) => resolveLocalReference(
      rootDir,
      file,
      tag.attributes.src,
      fileSystemCache
    ))
    .filter((result) => result.kind === 'local')
    .map((result) => result.relativePath);
  if (!scriptResources.includes('assets/js/site.js')) {
    addIssue(issues, file, 'missing required script assets/js/site.js');
  }

  const loadsStats = scriptResources.includes('assets/js/stats.js');
  if (loadsStats !== STATS_PAGES.has(file)) {
    addIssue(issues, file, 'stats.js load scope does not match the stats-enabled pages');
  }
  const statsEndpointMetas = extractHeadTags(html, 'meta').filter((tag) => (
    String(tag.attributes.name || '').toLowerCase() === 'stats-api-endpoint'
  ));
  const statsPreconnects = [];
  for (const link of headLinks) {
    const relValues = String(link.attributes.rel || '').toLowerCase().split(/\s+/);
    if (!relValues.includes('preconnect')) continue;
    let origin;
    try {
      origin = new URL(link.attributes.href, SITE_ORIGIN).origin;
    } catch (_error) {
      continue;
    }
    if (origin === STATS_API_ORIGIN) statsPreconnects.push(link);
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
        `stats-service preconnect ${origin} is limited to the stats-enabled pages`
      );
    }
  }
  const hasApprovedStatsMarkup =
    statsEndpointMetas.length === 1 &&
    statsEndpointMetas[0].attributes.content === STATS_API_ENDPOINT &&
    statsPreconnects.length === 1;
  if (STATS_PAGES.has(file) ? !hasApprovedStatsMarkup : statsEndpointMetas.length > 0) {
    addIssue(issues, file, STATS_ENDPOINT_MARKUP_ISSUE);
  }
  const normalizedHtml = activeHtml.toLowerCase();
  if (LEGACY_STATS_MARKERS.some((marker) => normalizedHtml.includes(marker))) {
    addIssue(issues, file, STATS_LEGACY_RUNTIME_ISSUE);
  }
  if (loadsStats) {
    const ids = collectIds(html);
    const requiredStatsIds = [
      ...PUBLIC_STATS_IDS,
      ...(ANALYTICS_PAGES.has(file) ? LOCAL_STATS_IDS : [])
    ];
    for (const id of requiredStatsIds) {
      if (!ids.has(id)) addIssue(issues, file, `stats.js requires #${id}`);
    }

    const statusTags = extractTags(activeHtml, 'div').filter((tag) => (
      tag.attributes.id === 'stats-status'
    ));
    const statusAttributes = statusTags.length === 1 ? statusTags[0].attributes : {};
    if (
      statusTags.length !== 1 ||
      statusAttributes['data-state'] !== 'loading' ||
      String(statusAttributes.role || '').toLowerCase() !== 'status' ||
      String(statusAttributes['aria-live'] || '').toLowerCase() !== 'polite' ||
      String(statusAttributes['aria-atomic'] || '').toLowerCase() !== 'true'
    ) {
      addIssue(issues, file, STATS_STATUS_MARKUP_ISSUE);
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
      description: '前端使用 Vue、jQuery、Bootstrap、ACE、ElementUI、font-awesome 和 uni-app；后端使用 Spring Boot，数据库使用 MySQL。',
      keywords: [
        'Vue',
        'jQuery',
        'Bootstrap',
        'uni-app',
        'Spring Boot 2.7.1',
        'MySQL 8.0.26',
        'Java 1.8'
      ]
    },
    {
      name: 'CBF-Rover：面向移动机器人的障碍证书与安全控制仿真',
      description: '构建移动机器人系统模型、分层仿真架构与在线 CBF 安全过滤，并在 exact 与 Gazebo 环境中完成闭环仿真和经验验证；固定几何 q-SBC 仍处于未就绪状态。',
      keywords: ['移动机器人', '在线 CBF', 'exact', 'Gazebo', 'q-SBC（未就绪）']
    },
    {
      name: '本地划词听译助手',
      description: '面向浏览器与文档应用的本地朗读、翻译和公式处理工具，结合 Kokoro TTS 与 Ollama，并由本地服务统一管理运行边界。',
      keywords: [
        'Python',
        'FastAPI',
        'Kokoro-82M',
        'Ollama',
        'Browser Extension',
        'Word / WPS'
      ]
    },
    {
      name: '双语字幕生成流水线',
      description: '从外挂或内封字幕、PGS 图像字幕和 Whisper 语音识别结果生成中英双语 ASS 字幕，并使用 Ollama 完成纠错与翻译。',
      keywords: ['Python', 'ASS', 'Whisper', 'PGS OCR', 'Ollama', '本地工作流']
    },
    {
      name: '本地 AI 选片工作台',
      description: '通过本地质量分析与视觉模型完成废片初筛、相似照片分组和双图比较，并把最终取舍保留给用户。',
      keywords: ['Python', 'Flask', 'Ollama', 'Qwen3-VL', 'DINOv2', 'RAW / HEIC']
    },
    {
      name: 'BiliClaw Extended：本地内容发现系统',
      description: '基于 OpenBiliClaw 深度定制的本地优先内容理解与推荐系统，将用户可见的多平台信号用于本地画像、检索与推荐。',
      keywords: [
        'Python',
        'FastAPI',
        'Browser Extension',
        'ChromaDB',
        'Ollama',
        '定制分支'
      ]
    },
    {
      name: 'Research Memory：本地科研知识检索',
      description: '将结构化资料、论文笔记、代码记录与实验溯源组织为本地可检索知识层，并通过只读接口连接 Codex 与 uTools。',
      keywords: ['Python', 'SQLite FTS5', 'OpenVINO', 'MCP', 'uTools', '隐私优先']
    },
    {
      name: 'Codex Skills 可复现配置工具包',
      description: '记录 Codex Skills 与插件的来源、锁定版本和状态，并提供跨平台安装、校验与恢复流程。',
      keywords: ['Python', 'PowerShell', 'Codex Skills', '可复现性', '安装器', 'CI']
    },
    {
      name: '中英双语个人学术主页',
      description: '使用原生 HTML、CSS 和 JavaScript 构建的双语学术主页，包含响应式交互、双语 SEO、访问统计和零依赖站点验证。',
      keywords: [
        'HTML',
        'CSS',
        'JavaScript',
        'GitHub Pages',
        'Cloudflare Workers / D1',
        '双语 SEO'
      ]
    }
  ],
  en: [
    {
      name: 'Multi-Platform Attendance System Using Face Recognition',
      description: 'The system identifies students in attendance from camera-captured or uploaded images and generates attendance summaries and periodic reports.',
      keywords: [
        'uni-app',
        'Spring Boot',
        'MySQL',
        'Python',
        'Android / WeChat Mini Program / Web'
      ]
    },
    {
      name: 'KTV Management System with a Decoupled Front-End/Back-End Architecture',
      description: 'The front end uses Vue, jQuery, Bootstrap, ACE, Element UI, Font Awesome, and uni-app; the back end uses Spring Boot with MySQL.',
      keywords: [
        'Vue',
        'jQuery',
        'Bootstrap',
        'uni-app',
        'Spring Boot 2.7.1',
        'MySQL 8.0.26',
        'Java 1.8'
      ]
    },
    {
      name: 'CBF-Rover: Barrier-Certificate and Safe-Control Simulation for Mobile Robots',
      description: 'Built the mobile-robot system model, layered simulation architecture, and online CBF safety filter, with closed-loop simulation and empirical validation in exact and Gazebo environments; the fixed-geometry q-SBC remains not ready.',
      keywords: ['Mobile Robots', 'Online CBF', 'exact', 'Gazebo', 'q-SBC (not ready)']
    },
    {
      name: 'Local Selection Read & Translate',
      description: 'A local reading, translation, and formula-processing tool for browsers and document apps, combining Kokoro TTS with Ollama behind a locally managed service.',
      keywords: [
        'Python',
        'FastAPI',
        'Kokoro-82M',
        'Ollama',
        'Browser Extension',
        'Word / WPS'
      ]
    },
    {
      name: 'Bilingual Subtitle Pipeline',
      description: 'Generates Chinese–English ASS subtitles from sidecar or embedded subtitles, PGS OCR, or Whisper transcription, followed by Ollama-assisted correction and translation.',
      keywords: ['Python', 'ASS', 'Whisper', 'PGS OCR', 'Ollama', 'Local workflow']
    },
    {
      name: 'Local AI Photo Selection Workbench',
      description: 'Uses local image analysis and vision models to reject clear failures, group similar photos, and support side-by-side human selection.',
      keywords: ['Python', 'Flask', 'Ollama', 'Qwen3-VL', 'DINOv2', 'RAW / HEIC']
    },
    {
      name: 'BiliClaw Extended: Local-First Content Discovery',
      description: 'A customized fork of OpenBiliClaw for local-first multi-platform content understanding, profile building, retrieval, and recommendation.',
      keywords: [
        'Python',
        'FastAPI',
        'Browser Extension',
        'ChromaDB',
        'Ollama',
        'Customized fork'
      ]
    },
    {
      name: 'Research Memory: Local Research Evidence & Knowledge Retrieval',
      description: 'Organizes structured sources, paper notes, code records, and experiment provenance into a searchable local knowledge layer exposed to Codex and uTools through read-only interfaces.',
      keywords: ['Python', 'SQLite FTS5', 'OpenVINO', 'MCP', 'uTools', 'Privacy-first']
    },
    {
      name: 'Reproducible Codex Skills Kit',
      description: 'Tracks Codex Skill and plugin provenance, pinned versions, and states, with cross-platform installation, validation, and recovery workflows.',
      keywords: ['Python', 'PowerShell', 'Codex Skills', 'Reproducibility', 'Installer', 'CI']
    },
    {
      name: 'Bilingual Academic Portfolio',
      description: 'A bilingual academic portfolio built with vanilla web technologies, including responsive interaction, bilingual SEO, analytics, and zero-dependency site validation.',
      keywords: [
        'HTML',
        'CSS',
        'JavaScript',
        'GitHub Pages',
        'Cloudflare Workers / D1',
        'Bilingual SEO'
      ]
    }
  ]
};

const EXPECTED_RESEARCH_FACTS = {
  'zh-CN': [
    {
      name: '随机系统可达—规避控制',
      description: '面向非线性随机系统，研究怎样设计控制策略，使闭环系统在随机扰动下获得良好的可达—规避性能。'
    },
    {
      name: '形式化概率保证',
      description: '研究怎样为整个初始集合证明控制器满足可达—规避要求，并计算具有实际意义的概率下界。'
    },
    {
      name: '学习型控制的形式化验证',
      description: '研究怎样协调学习型控制器的表达能力与后续形式化验证的可计算性。'
    }
  ],
  en: [
    {
      name: 'Reach-Avoid Control for Stochastic Systems',
      description: 'Design control policies for nonlinear stochastic systems so that the closed-loop system achieves strong reach-avoid performance under stochastic disturbances.'
    },
    {
      name: 'Formal Probabilistic Guarantees',
      description: 'Certify meaningful lower bounds on reach-avoid satisfaction probabilities for every state in the initial set.'
    },
    {
      name: 'Formal Verification of Learning-Enabled Control',
      description: 'Balance the expressive power of learning-enabled controllers with the computational tractability of subsequent formal verification.'
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
const VOID_ELEMENT_NAMES = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

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

function collectActiveHtmlElements(html) {
  const source = String(html);
  const elements = [];
  const stack = [];
  let cursor = 0;
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

    if (tag.isClosing) {
      if (tag.name === 'template' && templateDepth > 0) {
        templateDepth -= 1;
      } else if (templateDepth === 0) {
        const matchingIndex = stack.findLastIndex((element) => element.name === tag.name);
        if (matchingIndex >= 0) stack.length = matchingIndex;
      }
      cursor = tag.end;
      continue;
    }

    const selfClosing = /\/\s*>$/.test(tag.raw) || VOID_ELEMENT_NAMES.has(tag.name);
    if (tag.name === 'template') {
      if (!selfClosing) templateDepth += 1;
      cursor = tag.end;
      continue;
    }
    if (templateDepth > 0) {
      cursor = tag.end;
      continue;
    }
    if (isScriptingEnabledRawTextElement(tag.name) || RCDATA_ELEMENT_NAMES.has(tag.name)) {
      const closingTag = findHtmlClosingTag(source, tag.name, tag.end);
      cursor = closingTag ? closingTag.end : source.length;
      continue;
    }

    const element = {
      attributes: parseAttributes(tag.raw),
      end: tag.end,
      name: tag.name,
      parent: stack.length > 0 ? stack[stack.length - 1] : null,
      start: tagStart
    };
    elements.push(element);
    if (!selfClosing) stack.push(element);
    cursor = tag.end;
  }

  return elements;
}

function hasHtmlAncestor(element, ancestor) {
  for (let parent = element && element.parent; parent; parent = parent.parent) {
    if (parent === ancestor) return true;
  }
  return false;
}

function hasHtmlAncestorClass(element, className) {
  for (let parent = element && element.parent; parent; parent = parent.parent) {
    if (hasClass(parent.attributes, className)) return true;
  }
  return false;
}

function extractHeadTags(html, expectedTagName) {
  const source = String(html);
  const targetName = String(expectedTagName).toLowerCase();
  const tags = [];
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

    if (tag.isClosing) {
      if (tag.name === 'template' && templateDepth > 0) {
        templateDepth -= 1;
      } else if (tag.name === 'head' && templateDepth === 0) {
        inHead = false;
      }
      cursor = tag.end;
      continue;
    }

    if (tag.name === 'head' && templateDepth === 0 && !headSeen) {
      headSeen = true;
      inHead = true;
    } else if (tag.name === 'body' && templateDepth === 0) {
      inHead = false;
    }

    if (inHead && templateDepth === 0 && tag.name === targetName) {
      tags.push({
        raw: tag.raw,
        attributes: parseAttributes(tag.raw)
      });
    }

    if (isScriptingEnabledRawTextElement(tag.name) || RCDATA_ELEMENT_NAMES.has(tag.name)) {
      const closingTag = findHtmlClosingTag(source, tag.name, tag.end);
      if (!closingTag) break;
      cursor = closingTag.end;
      continue;
    }

    if (tag.name === 'template' && !/\/\s*>$/.test(tag.raw)) {
      templateDepth += 1;
    }
    cursor = tag.end;
  }

  return tags;
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

function extractClassElementText(html, className) {
  const source = removeHtmlComments(html);
  const matches = [];
  let cursor = 0;

  while (cursor < source.length) {
    const tagStart = source.indexOf('<', cursor);
    if (tagStart < 0) break;
    const tag = readHtmlTag(source, tagStart);
    if (!tag) {
      cursor = tagStart + 1;
      continue;
    }
    cursor = tag.end;
    if (tag.isClosing || !hasClass(parseAttributes(tag.raw), className)) continue;

    const closingTag = findHtmlClosingTag(source, tag.name, tag.end);
    if (!closingTag) continue;
    matches.push(normalizeHtmlText(
      source
        .slice(tag.end, closingTag.index)
        .replace(/<br\b[^>]*>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
    ));
    cursor = closingTag.end;
  }

  return matches;
}

function validateHomeQuotationCopies(rootDir, issues) {
  for (const file of ['index.html', 'en/index.html']) {
    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath)) continue;
    const html = fs.readFileSync(absolutePath, 'utf8');
    const notes = extractClassElementText(html, 'poem-note');
    const quotes = extractClassElementText(html, 'quote-text');

    if (notes.length !== 0 || quotes.length !== 1 || !quotes[0]) {
      addIssue(issues, file, HOME_QUOTE_INVENTORY_ISSUE);
    }
  }
}

function validateHomeStructure(rootDir, issues) {
  for (const file of ['index.html', 'en/index.html']) {
    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath)) continue;
    const elements = collectActiveHtmlElements(fs.readFileSync(absolutePath, 'utf8'));
    const mainElements = elements.filter((element) => (
      element.name === 'main' &&
      element.attributes.id === 'main-content' &&
      hasClass(element.attributes, 'main-shell')
    ));
    const mainElement = mainElements.length === 1 ? mainElements[0] : null;
    const mainChildren = mainElement
      ? elements.filter((element) => element.parent === mainElement)
      : [];
    const heroSections = mainChildren.filter((element) => (
      element.name === 'section' &&
      hasClass(element.attributes, 'hero') &&
      hasClass(element.attributes, 'home-hero')
    ));
    const heroSection = heroSections.length === 1 ? heroSections[0] : null;
    const heroSideSurfaces = heroSection
      ? elements.filter((element) => (
          element.name === 'aside' &&
          element.parent === heroSection &&
          hasClass(element.attributes, 'surface') &&
          hasClass(element.attributes, 'hero-side-surface')
        ))
      : [];
    const heroSideSurface = heroSideSurfaces.length === 1 ? heroSideSurfaces[0] : null;
    const heroSides = heroSection
      ? elements.filter((element) => (
          hasClass(element.attributes, 'hero-side') &&
          hasHtmlAncestor(element, heroSection)
        ))
      : [];
    const heroSide = heroSides.length === 1 ? heroSides[0] : null;
    const heroSideChildren = heroSide
      ? elements.filter((element) => element.parent === heroSide)
      : [];
    const profileCards = heroSideChildren.filter((element) => (
      hasClass(element.attributes, 'profile-card')
    ));
    const metaCards = heroSideChildren.filter((element) => (
      hasClass(element.attributes, 'meta-card')
    ));
    const quickCards = elements.filter((element) => (
      hasClass(element.attributes, 'home-quick-card')
    ));
    const quickCard = quickCards.length === 1 ? quickCards[0] : null;
    const quickLinks = elements.filter((element) => (
      hasClass(element.attributes, 'home-quick-links')
    ));
    const quickLinksElement = quickLinks.length === 1 ? quickLinks[0] : null;
    const quickLinkEntries = quickLinksElement
      ? elements.filter((element) => element.parent === quickLinksElement)
      : [];
    const expectedQuickLinkHrefs = [
      'research.html',
      'projects.html',
      'profile.html',
      'https://github.com/Yan-ShiBo'
    ];
    const hasExpectedQuickLinks = quickLinkEntries.length === expectedQuickLinkHrefs.length &&
      quickLinkEntries.every((element, index) => (
        element.name === 'a' && element.attributes.href === expectedQuickLinkHrefs[index]
      ));
    const hasOrderedHeroCards = heroSideChildren.length === 4 &&
      heroSideChildren[0] === profileCards[0] &&
      heroSideChildren[1] === metaCards[0] &&
      heroSideChildren[2] === metaCards[1] &&
      heroSideChildren[3] === quickCard &&
      !hasClass(heroSideChildren[1].attributes, 'home-quick-card') &&
      !hasClass(heroSideChildren[2].attributes, 'home-quick-card');
    const hasLegacyHeroStats = elements.some((element) => (
      hasClass(element.attributes, 'meta-card--stats') ||
      hasClass(element.attributes, 'hero-stats')
    ));
    if (
      !mainElement ||
      !heroSection ||
      !heroSideSurface ||
      !heroSide ||
      heroSide.parent !== heroSideSurface ||
      heroSideChildren.length !== 4 ||
      profileCards.length !== 1 ||
      metaCards.length !== 3 ||
      !hasOrderedHeroCards ||
      !quickCard ||
      quickCard.name !== 'div' ||
      !hasClass(quickCard.attributes, 'meta-card') ||
      quickCard.parent !== heroSide ||
      !quickLinksElement ||
      quickLinksElement.name !== 'div' ||
      quickLinksElement.parent !== quickCard ||
      !hasExpectedQuickLinks ||
      hasLegacyHeroStats
    ) {
      addIssue(issues, file, HOME_HERO_STRUCTURE_ISSUE);
    }

    const sectionContracts = [
      { headingId: 'home-current-title', muted: true },
      { headingId: 'home-updates-title', muted: false },
      { headingId: 'home-beyond-title', muted: true }
    ];
    const orderedSections = [];
    let hasValidSectionHeadings = true;
    for (const contract of sectionContracts) {
      const matchingSections = mainChildren.filter((element) => (
        element.name === 'section' &&
        hasClass(element.attributes, 'section-block') &&
        !hasClass(element.attributes, 'tile-dark') &&
        hasClass(element.attributes, 'section-muted') === contract.muted &&
        element.attributes['aria-labelledby'] === contract.headingId
      ));
      const section = matchingSections.length === 1 ? matchingSections[0] : null;
      orderedSections.push(section);

      const headings = elements.filter((element) => (
        element.attributes.id === contract.headingId
      ));
      const heading = headings.length === 1 ? headings[0] : null;
      let headingIsHidden = false;
      for (let current = heading; current; current = current.parent) {
        if (
          Object.hasOwn(current.attributes, 'hidden') ||
          String(current.attributes['aria-hidden'] || '').toLowerCase() === 'true' ||
          hasClass(current.attributes, 'visually-hidden')
        ) {
          headingIsHidden = true;
          break;
        }
        if (current === section) break;
      }
      if (
        !section ||
        !heading ||
        heading.name !== 'h2' ||
        !hasHtmlAncestor(heading, section) ||
        headingIsHidden
      ) {
        hasValidSectionHeadings = false;
      }
    }
    const quoteSections = elements.filter((element) => (
      element.name === 'section' &&
      hasClass(element.attributes, 'section-block') &&
      hasClass(element.attributes, 'quote-band') &&
      hasClass(element.attributes, 'tile-dark')
    ));
    const heroIndex = mainChildren.indexOf(heroSection);
    const expectedTail = [...orderedSections, quoteSections.length === 1 ? quoteSections[0] : null];
    const hasExpectedSectionSequence = heroIndex === 0 &&
      mainChildren.length === heroIndex + 1 + expectedTail.length &&
      expectedTail.every((element, index) => (
        element && mainChildren[heroIndex + 1 + index] === element
      ));
    if (
      !mainElement ||
      quoteSections.length !== 1 ||
      !hasValidSectionHeadings ||
      !hasExpectedSectionSequence
    ) {
      addIssue(issues, file, HOME_SECTION_SEQUENCE_ISSUE);
    }
  }
}

function validateEnglishTerminology(rootDir, issues) {
  for (const file of ENGLISH_COPY_FILES) {
    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath)) continue;
    const activeHtml = removeHtmlComments(fs.readFileSync(absolutePath, 'utf8'));

    for (const term of LEGACY_ENGLISH_TERMINOLOGY) {
      if (!term.pattern.test(activeHtml)) continue;
      addIssue(
        issues,
        file,
        `English copy uses legacy terminology; replace "${term.legacy}" with "${term.preferred}"`
      );
    }
  }
}

function validateProfileContacts(rootDir, issues) {
  const expectedMailtos = PROFILE_CONTACT_EMAILS
    .map((email) => `mailto:${email}`)
    .sort();

  for (const file of PROFILE_CONTACT_FILES) {
    const absolutePath = path.join(rootDir, file);
    if (!fs.existsSync(absolutePath)) continue;
    const activeHtml = removeHtmlComments(fs.readFileSync(absolutePath, 'utf8'));
    const tagTexts = new Set(extractClassElementText(activeHtml, 'tag'));
    const mailtoTags = extractTags(activeHtml, 'a')
      .filter((tag) => (
        hasClass(tag.attributes, 'tag') &&
        /^mailto:/i.test(String(tag.attributes.href || ''))
      ))
      .map((tag) => tag.attributes.href)
      .sort();
    const hasApprovedEmails =
      stableCanonicalJson(mailtoTags) === stableCanonicalJson(expectedMailtos) &&
      PROFILE_CONTACT_EMAILS.every((email) => tagTexts.has(email));
    const hasLegacyPrivateContact = [
      '15603111769',
      'royal-y-3425',
      'fa-phone',
      'fa-weixin'
    ].some((value) => activeHtml.includes(value));

    if (!hasApprovedEmails || hasLegacyPrivateContact) {
      addIssue(issues, file, PROFILE_CONTACTS_ISSUE);
    }
  }
}

function validateProfileModelingAward(rootDir, issues) {
  const contracts = [
    {
      file: 'profile.html',
      required: '第九届“认证杯”国际数学建模竞赛'
    },
    {
      file: 'en/profile.html',
      required: 'Certificate Authority Cup'
    }
  ];

  for (const contract of contracts) {
    const absolutePath = path.join(rootDir, contract.file);
    if (!fs.existsSync(absolutePath)) continue;
    const visibleText = getVisibleBodyText(fs.readFileSync(absolutePath, 'utf8'));
    if (!visibleText.includes(contract.required) || visibleText.includes('MCM/ICM')) {
      addIssue(issues, contract.file, PROFILE_MODELING_AWARD_ISSUE);
    }
  }
}

function validateProfileKtvFacts(rootDir, issues) {
  const contracts = [
    {
      file: 'profile.html',
      containerClass: 'profile-project-item',
      requiredPatterns: [
        /uni-app/,
        /项目开发期\s*：?\s*2022\.06\s*-\s*2022\.07/,
        /实习期\s*：?\s*2022\.06\s*-\s*2022\.08/
      ]
    },
    {
      file: 'en/profile.html',
      containerClass: 'info-card',
      requiredPatterns: [
        /uni-app/,
        /internship period\s*:\s*June–August 2022/i,
        /project development period\s*:\s*June–July 2022/i
      ]
    }
  ];

  for (const contract of contracts) {
    const absolutePath = path.join(rootDir, contract.file);
    if (!fs.existsSync(absolutePath)) continue;
    const html = fs.readFileSync(absolutePath, 'utf8');
    const elements = collectActiveHtmlElements(html);
    const getContainerText = (container) => normalizeHtmlText([
      getActiveElementText(html, container),
      ...elements
        .filter((element) => hasHtmlAncestor(element, container))
        .map((element) => getActiveElementText(html, element))
    ].join(' '));
    const containers = elements.filter((element) => (
      hasClass(element.attributes, contract.containerClass) &&
      getContainerText(element).includes('KTV')
    ));
    const containerText = containers.length === 1
      ? getContainerText(containers[0])
      : '';
    if (
      containers.length !== 1 ||
      !contract.requiredPatterns.every((pattern) => pattern.test(containerText))
    ) {
      addIssue(issues, contract.file, PROFILE_KTV_CONTRACT_ISSUE);
    }
  }
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

function getActiveElementText(html, element) {
  if (!element) return '';
  const closingTag = findHtmlClosingTag(html, element.name, element.end);
  if (!closingTag) return '';
  return getVisibleBodyText(`<body>${html.slice(element.end, closingTag.index)}</body>`);
}

function validateResumeContentContract(rootDir, issues) {
  const ccfATitle =
    'Formal Reach-Avoid Controller Synthesis for Stochastic Systems via Iterative Neural-Symbolic Learning';

  for (const contract of RESUME_PAGE_CONTRACTS) {
    const absolutePath = path.join(rootDir, contract.file);
    if (!fs.existsSync(absolutePath)) continue;

    const html = fs.readFileSync(absolutePath, 'utf8');
    const elements = collectActiveHtmlElements(html);
    const descendantsOf = (ancestor) => elements.filter((element) => (
      ancestor && hasHtmlAncestor(element, ancestor)
    ));
    const mainElement = elements.find((element) => (
      element.name === 'main' && element.attributes.id === 'main-content'
    ));
    const mainText = getActiveElementText(html, mainElement);

    const anchorBars = elements.filter((element) => (
      element.name === 'nav' && hasClass(element.attributes, 'resume-anchor-bar')
    ));
    const anchorBar = anchorBars.length === 1 ? anchorBars[0] : null;
    const anchorHrefs = descendantsOf(anchorBar)
      .filter((element) => element.name === 'a')
      .map((element) => element.attributes.href || '');
    const expectedAnchorHrefs = RESUME_HEADING_IDS.map((id) => `#${id}`);
    const headingsAreStable = RESUME_HEADING_IDS.every((id, index) => {
      const matches = elements.filter((element) => element.attributes.id === id);
      if (matches.length !== 1 || matches[0].name !== 'h2') return false;
      const expectedClass = index === RESUME_HEADING_IDS.length - 1
        ? 'resume-materials'
        : 'resume-ledger-section';
      return hasHtmlAncestorClass(matches[0], expectedClass);
    });
    const serviceHeading = elements.find((element) => (
      element.name === 'h2' && element.attributes.id === 'resume-service-title'
    ));
    if (
      anchorBars.length !== 1 ||
      stableCanonicalJson(anchorHrefs) !== stableCanonicalJson(expectedAnchorHrefs) ||
      !headingsAreStable ||
      getActiveElementText(html, serviceHeading) !== contract.serviceHeading
    ) {
      addIssue(issues, contract.file, RESUME_ANCHOR_CONTRACT_ISSUE);
    }

    const serviceSections = elements.filter((element) => (
      element.name === 'section' && hasClass(element.attributes, 'resume-service-section')
    ));
    const serviceEntries = serviceSections.length === 1
      ? descendantsOf(serviceSections[0]).filter((element) => (
        element.name === 'article' && hasClass(element.attributes, 'resume-entry')
      ))
      : [];
    const serviceEntryTexts = serviceEntries.map((element) => (
      getActiveElementText(html, element)
    ));
    const serviceEntriesMatch =
      serviceEntryTexts.length === contract.serviceEntries.length &&
      contract.serviceEntries.every((required, index) => (
        required.every((fragment) => serviceEntryTexts[index].includes(fragment))
      ));
    if (serviceSections.length !== 1 || !serviceEntriesMatch) {
      addIssue(issues, contract.file, RESUME_SERVICE_CONTRACT_ISSUE);
    }

    const materialSections = elements.filter((element) => (
      element.name === 'section' && hasClass(element.attributes, 'resume-materials')
    ));
    const materialSection = materialSections.length === 1 ? materialSections[0] : null;
    const materialElements = descendantsOf(materialSection);
    const materialHrefs = materialElements
      .filter((element) => element.name === 'a')
      .map((element) => element.attributes.href || '');
    const hasForbiddenMaterial = materialElements.some((element) => (
      element.name === 'img' ||
      hasClass(element.attributes, 'doc-preview') ||
      hasClass(element.attributes, 'proof-grid') ||
      Object.hasOwn(element.attributes, 'data-lightbox')
    ));
    if (
      materialSections.length !== 1 ||
      stableCanonicalJson(materialHrefs) !== stableCanonicalJson(contract.materials) ||
      hasForbiddenMaterial
    ) {
      addIssue(issues, contract.file, RESUME_MATERIALS_CONTRACT_ISSUE);
    }

    if (
      !contract.gpaPattern.test(mainText) ||
      !contract.rankPattern.test(mainText) ||
      /8\s*\/\s*124/.test(mainText)
    ) {
      addIssue(issues, contract.file, RESUME_ACADEMIC_FACTS_ISSUE);
    }

    const resumeEntries = elements.filter((element) => (
      element.name === 'article' && hasClass(element.attributes, 'resume-entry')
    ));
    const entryTexts = resumeEntries.map((element) => getActiveElementText(html, element));
    const ktvEntries = resumeEntries.filter((element) => (
      getActiveElementText(html, element).includes('KTV')
    ));
    const ktvEntry = ktvEntries.length === 1 ? ktvEntries[0] : null;
    const ktvText = getActiveElementText(html, ktvEntry);
    const ktvDateTexts = descendantsOf(ktvEntry)
      .filter((element) => hasClass(element.attributes, 'resume-entry__date'))
      .map((element) => getActiveElementText(html, element));
    const ktvParagraphTexts = descendantsOf(ktvEntry)
      .filter((element) => element.name === 'p')
      .map((element) => getActiveElementText(html, element));
    if (
      ktvEntries.length !== 1 ||
      !ktvText.includes('uni-app') ||
      stableCanonicalJson(ktvDateTexts) !== stableCanonicalJson([contract.ktvDate]) ||
      ktvParagraphTexts.length !== 1 ||
      !contract.ktvSummaryFragments.every((fragment) => (
        ktvParagraphTexts[0].includes(fragment)
      ))
    ) {
      addIssue(issues, contract.file, RESUME_KTV_CONTRACT_ISSUE);
    }

    const cbfEntries = entryTexts.filter((text) => text.includes('CBF-Rover'));
    if (
      cbfEntries.length !== 1 ||
      !cbfEntries[0].includes('exact') ||
      !cbfEntries[0].includes('Gazebo') ||
      !cbfEntries[0].includes(contract.cbfReadiness) ||
      contract.cbfForbiddenPatterns.some((pattern) => pattern.test(cbfEntries[0]))
    ) {
      addIssue(issues, contract.file, RESUME_CBF_ROVER_CONTRACT_ISSUE);
    }

    const awardLists = elements.filter((element) => (
      element.name === 'ul' && hasClass(element.attributes, 'resume-award-list')
    ));
    const awardItems = awardLists.length === 1
      ? descendantsOf(awardLists[0]).filter((element) => element.name === 'li')
      : [];
    const awardTexts = awardItems.map((element) => getActiveElementText(html, element));
    const hasApprovedAwards =
      awardLists.length === 1 &&
      awardTexts.length === contract.awards.length &&
      contract.awards.every((required, index) => (
        required.every((fragment) => awardTexts[index].includes(fragment))
      )) &&
      awardTexts.some((text) => text.includes(contract.modelingAward)) &&
      !contract.forbiddenAwards.some((forbidden) => (
        awardTexts.some((text) => forbidden.every((fragment) => text.includes(fragment)))
      ));
    const hasForbiddenModelingAlias = awardTexts.some((text) => (
      /\bMCM\s*\/\s*ICM\b/i.test(text)
    ));
    if (!hasApprovedAwards || hasForbiddenModelingAlias) {
      addIssue(issues, contract.file, RESUME_AWARDS_CONTRACT_ISSUE);
    }

    const publicationContainers = elements.filter((element) => (
      hasClass(element.attributes, 'resume-publications')
    ));
    const publicationItems = publicationContainers.length === 1
      ? descendantsOf(publicationContainers[0]).filter((element) => element.name === 'li')
      : [];
    const ccfAItems = publicationItems.filter((item) => (
      descendantsOf(item).some((element) => (
        element.name === 'cite' && getActiveElementText(html, element) === ccfATitle
      ))
    ));
    const ccfAItem = ccfAItems.length === 1 ? ccfAItems[0] : null;
    const ccfAText = getActiveElementText(html, ccfAItem);
    const ccfAStatuses = descendantsOf(ccfAItem)
      .filter((element) => hasClass(element.attributes, 'resume-status'))
      .map((element) => getActiveElementText(html, element));
    if (
      publicationContainers.length !== 1 ||
      ccfAItems.length !== 1 ||
      stableCanonicalJson(ccfAStatuses) !== stableCanonicalJson([contract.ccfAStatus]) ||
      !ccfAText.includes(contract.ccfAVenue) ||
      !ccfAText.includes(contract.ccfAAuthor)
    ) {
      addIssue(issues, contract.file, RESUME_CCF_A_CONTRACT_ISSUE);
    }
  }
}

function validateResumePdfSourceContract(rootDir, issues) {
  const file = 'docs/Shibo-Yan-Resume.pdf';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    addIssue(issues, file, RESUME_PDF_SOURCE_CONTRACT_ISSUE);
    return;
  }

  const digest = crypto
    .createHash('sha256')
    .update(fs.readFileSync(absolutePath))
    .digest('hex');
  if (digest !== RESUME_PDF_SOURCE_SHA256) {
    addIssue(issues, file, RESUME_PDF_SOURCE_CONTRACT_ISSUE);
  }
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
    ids.push(`${page.canonical}#research-topics`, ...RESEARCH_IDS);
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
      const suffix = page.kind === 'projects' ? '#project-list' : '#research-topics';
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
      `${kind} list positions must be 1 through ${ids.length}`
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
  const list = parsed.nodesById.get(`${page.canonical}#research-topics`);
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

function hasExecutableInlineScript(html) {
  const activeHtml = removeHtmlComments(html);
  const pattern = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
  return Array.from(activeHtml.matchAll(pattern)).some((match) => {
    const attributes = parseAttributes(match[0].slice(0, match[0].indexOf('>') + 1));
    if (attributes.src) return false;
    const type = String(attributes.type || '').trim().toLowerCase().split(';')[0];
    return !type || type === 'module' || type === 'text/javascript' ||
      type === 'application/javascript';
  });
}

function collectOpeningHtmlTags(html) {
  const source = removeHtmlComments(html);
  const tags = [];
  let cursor = 0;

  while (cursor < source.length) {
    const tagStart = source.indexOf('<', cursor);
    if (tagStart < 0) break;
    const tag = readHtmlTag(source, tagStart);
    if (!tag) {
      cursor = tagStart + 1;
      continue;
    }
    if (!tag.isClosing) {
      tags.push({
        name: tag.name,
        attributes: parseAttributes(tag.raw)
      });
    }
    if (!tag.isClosing && isScriptingEnabledRawTextElement(tag.name)) {
      const closingTag = findHtmlClosingTag(source, tag.name, tag.end);
      cursor = closingTag ? closingTag.end : tag.end;
      continue;
    }
    cursor = tag.end;
  }

  return tags;
}

function localizedNotFoundAttribute(attributes, locale, suffix, targetName) {
  const localizedName = locale ? `data-not-found-${locale}-${suffix}` : '';
  return localizedName && Object.hasOwn(attributes, localizedName)
    ? attributes[localizedName]
    : attributes[targetName];
}

function normalizeNotFoundParityReference(rootDir, file, reference, fileSystemCache) {
  const value = String(reference == null ? '' : reference).trim();
  if (!value || isExternalReference(value)) return value;
  if (value.startsWith('#')) return `self:${value}`;
  const resolved = resolveLocalReference(rootDir, file, value, fileSystemCache);
  if (resolved.kind !== 'local') return `invalid:${value}`;
  const undecorated = stripUrlDecorations(value);
  return `local:${resolved.relativePath}${value.slice(undecorated.length)}`;
}

function extractLocalizedNotFoundElementText(html, tagName, locale) {
  const source = removeHtmlComments(html);
  const pattern = new RegExp(`<${tagName}(?=[\\t\\n\\f\\r />])`, 'i');
  const match = pattern.exec(source);
  if (!match) return '';
  const openingTag = readHtmlTag(source, match.index);
  if (!openingTag || openingTag.isClosing || openingTag.name !== tagName) return '';
  const attributes = parseAttributes(openingTag.raw);
  const localizedName = locale ? `data-not-found-${locale}-text` : '';
  if (localizedName && Object.hasOwn(attributes, localizedName)) {
    return normalizeHtmlText(attributes[localizedName]);
  }
  const closingTag = findHtmlClosingTag(source, tagName, openingTag.end);
  if (!closingTag) return '';
  return normalizeHtmlText(source.slice(openingTag.end, closingTag.index).replace(/<[^>]*>/g, ' '));
}

function extractLocalizedNotFoundBodyText(html, locale) {
  const source = removeHtmlComments(html);
  const bodyMatch = /<body(?=[\t\n\f\r />])/i.exec(source);
  if (!bodyMatch) return [];
  const bodyTag = readHtmlTag(source, bodyMatch.index);
  if (!bodyTag || bodyTag.isClosing || bodyTag.name !== 'body') return [];
  const bodyClosingTag = findHtmlClosingTag(source, 'body', bodyTag.end);
  if (!bodyClosingTag) return [];

  const bodySource = source.slice(bodyTag.end, bodyClosingTag.index);
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);
  const excludedElements = new Set(['script', 'style', 'template', 'noscript']);
  const stack = [];
  const parts = [];
  let suppressedDepth = 0;
  let excludedDepth = 0;
  let cursor = 0;

  function appendText(value) {
    const normalized = normalizeHtmlText(value);
    if (normalized) parts.push(normalized);
  }

  while (cursor < bodySource.length) {
    const tagStart = bodySource.indexOf('<', cursor);
    const textEnd = tagStart < 0 ? bodySource.length : tagStart;
    if (suppressedDepth === 0 && excludedDepth === 0) {
      appendText(bodySource.slice(cursor, textEnd));
    }
    if (tagStart < 0) break;

    const tag = readHtmlTag(bodySource, tagStart);
    if (!tag) {
      cursor = tagStart + 1;
      continue;
    }

    if (tag.isClosing) {
      let matchingIndex = -1;
      for (let index = stack.length - 1; index >= 0; index -= 1) {
        if (stack[index].name === tag.name) {
          matchingIndex = index;
          break;
        }
      }
      if (matchingIndex >= 0) {
        while (stack.length > matchingIndex) {
          const frame = stack.pop();
          if (frame.suppresses) suppressedDepth -= 1;
          if (frame.excludes) excludedDepth -= 1;
        }
      }
      cursor = tag.end;
      continue;
    }

    const attributes = parseAttributes(tag.raw);
    const localizedName = locale ? `data-not-found-${locale}-text` : '';
    const suppresses = Boolean(localizedName) && Object.hasOwn(attributes, localizedName);
    const excludes = excludedElements.has(tag.name);
    if (suppresses && suppressedDepth === 0 && excludedDepth === 0 && !excludes) {
      appendText(attributes[localizedName]);
    }

    const selfClosing = /\/\s*>$/.test(tag.raw);
    if (!selfClosing && !voidElements.has(tag.name)) {
      stack.push({ name: tag.name, suppresses, excludes });
      if (suppresses) suppressedDepth += 1;
      if (excludes) excludedDepth += 1;
    }
    cursor = tag.end;
  }

  return parts;
}

function createNotFoundEnglishParitySnapshot(
  rootDir,
  file,
  html,
  applyEnglishMappings,
  fileSystemCache
) {
  const tags = collectOpeningHtmlTags(html);
  const locale = applyEnglishMappings ? 'en' : null;
  const referenceInventory = (tagName, attributeName, suffix = attributeName) => tags
    .filter((tag) => tag.name === tagName && (
      Object.hasOwn(tag.attributes, attributeName) ||
      (locale && Object.hasOwn(tag.attributes, `data-not-found-${locale}-${suffix}`))
    ))
    .map((tag) => normalizeNotFoundParityReference(
      rootDir,
      file,
      localizedNotFoundAttribute(tag.attributes, locale, suffix, attributeName),
      fileSystemCache
    ));

  return {
    title: extractLocalizedNotFoundElementText(html, 'title', locale),
    metadata: tags
      .filter((tag) => tag.name === 'meta')
      .map((tag) => ({
        key: Object.hasOwn(tag.attributes, 'charset')
          ? 'charset'
          : tag.attributes.name
            ? `name:${tag.attributes.name}`
            : `property:${tag.attributes.property || ''}`,
        charset: tag.attributes.charset || '',
        content: localizedNotFoundAttribute(tag.attributes, locale, 'content', 'content') || ''
      })),
    links: tags
      .filter((tag) => tag.name === 'link')
      .map((tag) => ({
        rel: tag.attributes.rel || '',
        type: tag.attributes.type || '',
        href: normalizeNotFoundParityReference(
          rootDir,
          file,
          localizedNotFoundAttribute(tag.attributes, locale, 'href', 'href'),
          fileSystemCache
        )
      })),
    scripts: referenceInventory('script', 'src'),
    anchors: referenceInventory('a', 'href'),
    images: referenceInventory('img', 'src'),
    ariaLabels: tags
      .filter((tag) => (
        Object.hasOwn(tag.attributes, 'aria-label') ||
        Object.hasOwn(tag.attributes, `data-not-found-${locale}-aria-label`)
      ))
      .map((tag) => ({
        tag: tag.name,
        value: localizedNotFoundAttribute(tag.attributes, locale, 'aria-label', 'aria-label')
      })),
    themeLabels: tags
      .filter((tag) => (
        Object.hasOwn(tag.attributes, 'data-label-dark') ||
        Object.hasOwn(tag.attributes, `data-not-found-${locale}-label-dark`)
      ))
      .map((tag) => ({
        dark: localizedNotFoundAttribute(tag.attributes, locale, 'label-dark', 'data-label-dark'),
        light: localizedNotFoundAttribute(tag.attributes, locale, 'label-light', 'data-label-light')
      })),
    bodyText: extractLocalizedNotFoundBodyText(html, locale)
  };
}

function validateNotFoundLocalizationMarkup(
  rootDir,
  page,
  html,
  issues,
  fileSystemCache
) {
  const activeHtml = removeHtmlComments(html);
  const openingTags = Array.from(activeHtml.matchAll(/<[a-z][^>]*>/gi), (match) => ({
    raw: match[0],
    attributes: parseAttributes(match[0])
  }));
  const bodyTags = extractTags(activeHtml, 'body');
  const hasPageMarker = bodyTags.length === 1 &&
    Object.hasOwn(bodyTags[0].attributes, 'data-not-found-page');
  const localizable = bodyTags.length === 1 &&
    Object.hasOwn(bodyTags[0].attributes, 'data-not-found-localizable');
  const hasForbiddenPhysicalLocalization = page.file === 'en/404.html' && openingTags.some((tag) => (
    Object.keys(tag.attributes).some((name) => (
      /^data-not-found-(?:zh|en)-(?:text|href|content|aria-label|label-dark|label-light)$/.test(name)
    ))
  ));
  const countdownCount = openingTags.filter((tag) => (
    Object.hasOwn(tag.attributes, 'data-countdown')
  )).length;

  if (
    !hasPageMarker ||
    countdownCount !== 1 ||
    hasExecutableInlineScript(activeHtml) ||
    (page.file === '404.html' && !localizable) ||
    (page.file === 'en/404.html' && (localizable || hasForbiddenPhysicalLocalization))
  ) {
    addIssue(issues, page.file, NOT_FOUND_LOCALIZATION_ISSUE);
    return;
  }

  if (page.file !== '404.html') return;

  const referenceAttributes = [
    ['a', 'href'],
    ['link', 'href'],
    ['script', 'src'],
    ['img', 'src'],
    ['iframe', 'src'],
    ['source', 'src'],
    ['video', 'poster']
  ];
  const hasRelativeActiveReference = referenceAttributes.some(([tagName, attributeName]) => (
    extractTags(activeHtml, tagName).some((tag) => {
      const reference = String(tag.attributes[attributeName] || '').trim();
      return reference && !reference.startsWith('#') && !reference.startsWith('/') &&
        !isExternalReference(reference);
    })
  ));

  const localizedSuffixes = [
    'text',
    'href',
    'content',
    'aria-label',
    'label-dark',
    'label-light'
  ];
  const pairCounts = new Map(localizedSuffixes.map((suffix) => [suffix, 0]));
  let hasUnpairedLocalization = false;
  const localizedHrefValues = { zh: new Set(), en: new Set() };

  for (const tag of openingTags) {
    for (const suffix of localizedSuffixes) {
      const zhName = `data-not-found-zh-${suffix}`;
      const enName = `data-not-found-en-${suffix}`;
      const hasZh = Object.hasOwn(tag.attributes, zhName);
      const hasEn = Object.hasOwn(tag.attributes, enName);
      if (hasZh !== hasEn) hasUnpairedLocalization = true;
      if (!hasZh || !hasEn) continue;
      pairCounts.set(suffix, pairCounts.get(suffix) + 1);
      if (suffix === 'href') {
        localizedHrefValues.zh.add(tag.attributes[zhName]);
        localizedHrefValues.en.add(tag.attributes[enName]);
      }
    }
  }

  const requiredZhHrefs = new Set([
    ...PAGE_PAIRS.map((pair) => pair.zhFile === 'index.html' ? '/index.html' : pair.zhRoute),
    '/manifest.webmanifest'
  ]);
  const requiredEnHrefs = new Set([
    ...PAGE_PAIRS.map((pair) => pair.enFile === 'en/index.html' ? '/en/index.html' : pair.enRoute),
    '/manifest.en.webmanifest'
  ]);
  const hasRequiredLocalizedHrefs = (
    [...requiredZhHrefs].every((reference) => localizedHrefValues.zh.has(reference)) &&
    [...requiredEnHrefs].every((reference) => localizedHrefValues.en.has(reference))
  );
  const localizedHrefsAreValid = [...localizedHrefValues.zh, ...localizedHrefValues.en]
    .every((reference) => {
      if (!reference.startsWith('/')) return false;
      const result = resolveLocalReference(
        rootDir,
        page.file,
        reference,
        fileSystemCache
      );
      return result.kind === 'local' && result.exists && result.exactCase;
    });
  const hasEveryMappingKind = localizedSuffixes.every((suffix) => pairCounts.get(suffix) > 0);
  const physicalEnglishPath = path.join(rootDir, 'en', '404.html');
  const hasPhysicalEnglishFile = fs.existsSync(physicalEnglishPath) &&
    fs.statSync(physicalEnglishPath).isFile();
  const matchesPhysicalEnglishPage = hasPhysicalEnglishFile && (() => {
    const physicalEnglishHtml = fs.readFileSync(physicalEnglishPath, 'utf8');
    return JSON.stringify(createNotFoundEnglishParitySnapshot(
      rootDir,
      page.file,
      html,
      true,
      fileSystemCache
    )) ===
      JSON.stringify(createNotFoundEnglishParitySnapshot(
        rootDir,
        'en/404.html',
        physicalEnglishHtml,
        false,
        fileSystemCache
      ));
  })();

  if (
    hasRelativeActiveReference ||
    hasUnpairedLocalization ||
    !hasEveryMappingKind ||
    !hasRequiredLocalizedHrefs ||
    !localizedHrefsAreValid ||
    !matchesPhysicalEnglishPage
  ) {
    addIssue(issues, page.file, NOT_FOUND_LOCALIZATION_ISSUE);
  }
}

function validateCssReferences(rootDir, issues, anchorCache, fileSystemCache) {
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
      validateReference(
        rootDir,
        file,
        reference,
        issues,
        anchorCache,
        fileSystemCache
      );
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

function readPngDimensions(data) {
  if (data.length < PNG_SIGNATURE.length) {
    throw new Error('truncated PNG signature');
  }
  if (!data.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('invalid PNG signature');
  }
  if (data.length < PNG_SIGNATURE.length + 8) {
    throw new Error('truncated PNG chunk header');
  }

  const ihdrLength = data.readUInt32BE(8);
  const firstChunkType = data.toString('ascii', 12, 16);
  if (firstChunkType !== 'IHDR') {
    throw new Error('first PNG chunk must be IHDR');
  }
  if (ihdrLength !== 13) {
    throw new Error('IHDR chunk length must be 13');
  }
  if (8 + 12 + ihdrLength > data.length) {
    throw new Error('PNG chunk at byte 8 exceeds file boundary');
  }

  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  if (width === 0 || height === 0) {
    throw new Error('IHDR dimensions must be non-zero');
  }

  let chunkOffset = PNG_SIGNATURE.length;
  while (chunkOffset < data.length) {
    if (data.length - chunkOffset < 8) {
      throw new Error(`truncated PNG chunk header at byte ${chunkOffset}`);
    }
    const chunkLength = data.readUInt32BE(chunkOffset);
    const chunkEnd = chunkOffset + 12 + chunkLength;
    if (chunkEnd > data.length) {
      throw new Error(`PNG chunk at byte ${chunkOffset} exceeds file boundary`);
    }
    chunkOffset = chunkEnd;
  }

  return { width, height };
}

function readIcoEntries(absolutePath) {
  const data = fs.readFileSync(absolutePath);
  if (data.length < 6) throw new Error('truncated icon directory');
  if (data.readUInt16LE(0) !== 0 || data.readUInt16LE(2) !== 1) {
    throw new Error('invalid icon directory header');
  }

  const count = data.readUInt16LE(4);
  if (count === 0) throw new Error('empty icon directory');
  const directoryEnd = 6 + count * 16;
  if (data.length < directoryEnd) throw new Error('truncated icon directory');

  const entries = [];
  for (let index = 0; index < count; index += 1) {
    const entryOffset = 6 + index * 16;
    const width = data[entryOffset] || 256;
    const height = data[entryOffset + 1] || 256;
    const imageBytes = data.readUInt32LE(entryOffset + 8);
    const imageOffset = data.readUInt32LE(entryOffset + 12);
    if (imageOffset < directoryEnd) {
      throw new Error(`icon entry ${index} image data overlaps the icon directory`);
    }
    if (
      imageBytes === 0 ||
      imageOffset > data.length ||
      imageBytes > data.length - imageOffset
    ) {
      throw new Error(`icon entry ${index} image data is outside the file`);
    }
    entries.push({ index, width, height, imageBytes, imageOffset });
  }

  const ranges = [...entries].sort((left, right) => (
    left.imageOffset - right.imageOffset || left.index - right.index
  ));
  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1];
    const current = ranges[index];
    if (current.imageOffset < previous.imageOffset + previous.imageBytes) {
      throw new Error(
        `icon entry ${current.index} image data overlaps icon entry ${previous.index}`
      );
    }
  }

  for (const entry of entries) {
    let dimensions;
    try {
      dimensions = readPngDimensions(data.subarray(
        entry.imageOffset,
        entry.imageOffset + entry.imageBytes
      ));
    } catch (error) {
      throw new Error(`icon entry ${entry.index}: ${error.message}`);
    }
    if (dimensions.width !== entry.width || dimensions.height !== entry.height) {
      throw new Error(
        `icon entry ${entry.index} directory size ${entry.width}x${entry.height} ` +
        `does not match PNG IHDR ${dimensions.width}x${dimensions.height}`
      );
    }
  }

  return entries;
}

function hasExactManifestIconInventory(icons) {
  if (!Array.isArray(icons) || icons.length !== MANIFEST_INSTALL_ICONS.length) {
    return false;
  }

  const hasComparableIconShape = icons.every((icon) => {
    if (!icon || typeof icon !== 'object' || Array.isArray(icon)) return false;
    const keys = Object.keys(icon).sort();
    return (
      typeof icon.src === 'string' &&
      keys.length === MANIFEST_ICON_KEYS.length &&
      keys.every((key, index) => key === MANIFEST_ICON_KEYS[index])
    );
  });
  if (!hasComparableIconShape) return false;

  const sortedIcons = [...icons].sort((left, right) => (
    left.src.localeCompare(right.src)
  ));
  const expectedIcons = [...MANIFEST_INSTALL_ICONS].sort((left, right) => (
    left.src.localeCompare(right.src)
  ));

  return sortedIcons.every((icon, index) => {
    const expected = expectedIcons[index];
    return MANIFEST_ICON_KEYS.every((key) => icon[key] === expected[key]);
  });
}

function validateInstallIconAssets(rootDir, issues) {
  for (const icon of MANIFEST_INSTALL_ICONS) {
    const file = icon.src.replace(/^\//, '');
    if (!ensureFile(rootDir, file, issues)) continue;

    let dimensions;
    try {
      dimensions = readPngDimensions(fs.readFileSync(path.join(rootDir, file)));
    } catch (error) {
      addIssue(issues, file, `invalid PNG: ${error.message}`);
      continue;
    }

    const [expectedWidth, expectedHeight] = icon.sizes.split('x').map(Number);
    if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
      addIssue(
        issues,
        file,
        `expected ${icon.sizes} but PNG IHDR declares ` +
          `${dimensions.width}x${dimensions.height}`
      );
    }
  }
}

function validateBrandMarkAsset(rootDir, issues) {
  if (!ensureFile(rootDir, BRAND_MARK_FILE, issues)) return;

  const data = fs.readFileSync(path.join(rootDir, BRAND_MARK_FILE));
  if (data.length > BRAND_MARK_MAX_BYTES) {
    addIssue(
      issues,
      BRAND_MARK_FILE,
      `must not exceed ${BRAND_MARK_MAX_BYTES} bytes; found ${data.length}`
    );
  }

  let dimensions;
  try {
    dimensions = readPngDimensions(data);
  } catch (error) {
    addIssue(issues, BRAND_MARK_FILE, `invalid PNG: ${error.message}`);
    return;
  }

  const [expectedWidth, expectedHeight] = BRAND_MARK_SIZE.split('x').map(Number);
  if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
    addIssue(
      issues,
      BRAND_MARK_FILE,
      `expected ${BRAND_MARK_SIZE} but PNG IHDR declares ` +
        `${dimensions.width}x${dimensions.height}`
    );
  }
}

function validateFavicon(rootDir, issues) {
  if (!ensureFile(rootDir, FAVICON_FILE, issues)) return;

  let entries;
  try {
    entries = readIcoEntries(path.join(rootDir, FAVICON_FILE));
  } catch (error) {
    addIssue(issues, FAVICON_FILE, `invalid ICO: ${error.message}`);
    return;
  }

  const actualSizes = sortImageSizes(entries.map((entry) => (
    `${entry.width}x${entry.height}`
  )));
  if (
    actualSizes.length !== FAVICON_SIZES.length ||
    actualSizes.some((size, index) => size !== FAVICON_SIZES[index])
  ) {
    addIssue(
      issues,
      FAVICON_FILE,
      `expected favicon sizes "${FAVICON_SIZES.join(' ')}" without duplicates; ` +
        `found "${actualSizes.join(' ')}"`
    );
  }
}

function validateManifest(rootDir, contract, issues, anchorCache, fileSystemCache) {
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
  if (!hasExactManifestIconInventory(manifest.icons)) {
    addIssue(issues, file, MANIFEST_ICON_INVENTORY_ISSUE);
  }
  if (!Array.isArray(manifest.icons)) return;

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
    validateReference(
      rootDir,
      file,
      icon.src,
      issues,
      anchorCache,
      fileSystemCache
    );
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
    'scripts/run-validator-tests.js',
    'scripts/validate-site.js',
    'scripts/validator-test-shard.js',
    'worker/src/index.mjs'
  ];
  for (const file of files) {
    if (!ensureFile(rootDir, file, issues)) continue;
    try {
      let source = readUtf8(rootDir, file);
      if (file.endsWith('.mjs')) {
        const exportMatches = source.match(/\bexport\s+default\s+/g) || [];
        if (exportMatches.length !== 1) {
          throw new SyntaxError('expected exactly one default ESM export');
        }
        source = source.replace(/\bexport\s+default\s+/, 'const __defaultExport = ');
      }
      new vm.Script(source, { filename: file });
    } catch (error) {
      addIssue(issues, file, error.message || 'syntax check failed');
    }
  }
}

function runStatsScenario(source, options = {}) {
  const storageSeed = options.storageSeed || {};
  const storageGetFailures = new Set(
    (options.storageGetFailures || []).map((key) => String(key))
  );
  const elementIds = [
    ...PUBLIC_STATS_IDS,
    ...LOCAL_STATS_IDS
  ];
  const elements = new Map();
  for (const id of elementIds) {
    const element = {
      attributes: {},
      textContent: ''
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
  const timeoutCallbacks = [];
  const timeoutDelays = [];
  const fetchCalls = [];
  let clearedTimeouts = 0;
  let abortCalls = 0;
  const storageWrites = [];
  const storageRemovals = [];
  let storageClearCount = 0;
  const localStorage = {
    getItem(key) {
      const normalizedKey = String(key);
      if (storageGetFailures.has(normalizedKey)) {
        throw new Error(`simulated localStorage getItem failure for ${normalizedKey}`);
      }
      return storage.has(normalizedKey) ? storage.get(normalizedKey) : null;
    },
    setItem(key, value) {
      const entry = Object.freeze({ key: String(key), value: String(value) });
      storageWrites.push(entry);
      storage.set(entry.key, entry.value);
    },
    removeItem(key) {
      const normalizedKey = String(key);
      storageRemovals.push(normalizedKey);
      storage.delete(normalizedKey);
    },
    clear() {
      storageClearCount += 1;
      storage.clear();
    }
  };
  const document = {
    documentElement: { lang: options.lang || 'en' },
    head: { appendChild() {} },
    addEventListener(type, callback) {
      documentEvents[type] = callback;
    },
    createElement() {
      return {};
    },
    querySelector(selector) {
      if (selector !== 'meta[name="stats-api-endpoint"]') return null;
      if (options.endpoint === null) return null;
      return {
        getAttribute(name) {
          return name === 'content'
            ? (options.endpoint || STATS_API_ENDPOINT)
            : null;
        }
      };
    },
    getElementById(id) {
      return elements.get(id) || null;
    }
  };
  const window = {
    document,
    localStorage,
    location: { pathname: options.pathname || '/analytics.html' },
    addEventListener(type, callback) {
      windowEvents[type] = callback;
    },
    clearTimeout() {
      clearedTimeouts += 1;
    },
    setTimeout(callback, delay) {
      timeoutCallbacks.push(callback);
      timeoutDelays.push(delay);
      return timeoutCallbacks.length;
    }
  };
  function settled(state, value) {
    return {
      then(onFulfilled, onRejected) {
        const callback = state === 'fulfilled' ? onFulfilled : onRejected;
        if (typeof callback !== 'function') return settled(state, value);
        try {
          const result = callback(value);
          return result && typeof result.then === 'function'
            ? result
            : settled('fulfilled', result);
        } catch (error) {
          return settled('rejected', error);
        }
      },
      catch(onRejected) {
        return this.then(undefined, onRejected);
      },
      finally(callback) {
        callback();
        return this;
      }
    };
  }
  class TestAbortController {
    constructor() {
      this.signal = {};
    }

    abort() {
      abortCalls += 1;
    }
  }
  function fetch(url, requestOptions) {
    fetchCalls.push({
      body: requestOptions && requestOptions.body,
      cache: requestOptions && requestOptions.cache,
      credentials: requestOptions && requestOptions.credentials,
      headers: requestOptions && requestOptions.headers,
      method: requestOptions && requestOptions.method,
      url: String(url)
    });
    if (options.fetchError) {
      return settled('rejected', new Error('simulated stats request failure'));
    }
    return settled('fulfilled', {
      ok: options.responseOk !== false,
      json() {
        return settled('fulfilled', options.publicPayload || {
          siteViews: '42',
          monthUniqueDevices: '7',
          pageViews: '11',
          period: '2026-07',
          trackingSince: '2026-07-22'
        });
      }
    });
  }
  const NativeDate = Date;
  const scenarioNowStart = options.now ? new NativeDate(options.now).getTime() : 0;
  const scenarioNowStep = options.nowStepMs || 0;
  let scenarioNowCalls = 0;
  const nextScenarioNow = () => {
    const value = scenarioNowStart + scenarioNowStep * scenarioNowCalls;
    scenarioNowCalls += 1;
    return value;
  };
  const ScenarioDate = options.now
    ? class extends NativeDate {
      constructor(...args) {
        super(...(args.length > 0 ? args : [nextScenarioNow()]));
      }

      static now() {
        return nextScenarioNow();
      }
    }
    : NativeDate;
  const context = vm.createContext({
    AbortController: TestAbortController,
    BigInt: undefined,
    Date: ScenarioDate,
    __documentEvents: documentEvents,
    __timeoutCallbacks: timeoutCallbacks,
    __windowEvents: windowEvents,
    document,
    fetch,
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
  for (let tick = 0; tick < (options.timeoutTicks || 0); tick += 1) {
    vm.runInContext('__timeoutCallbacks[0]()', context, { timeout: 1000 });
  }

  function readElement(id) {
    const element = elements.get(id);
    return {
      state: element.attributes['data-state'] || null,
      text: String(element.textContent == null ? '' : element.textContent).trim()
    };
  }

  return {
    readElement,
    storage: Object.freeze(Object.fromEntries(storage)),
    storageWrites: Object.freeze(storageWrites.slice()),
    storageRemovals: Object.freeze(storageRemovals.slice()),
    storageClearCount,
    fetchCalls: Object.freeze(fetchCalls.slice()),
    timeoutDelays: Object.freeze(timeoutDelays.slice()),
    clearedTimeouts,
    abortCalls
  };
}

function validateStatsJavaScriptContracts(rootDir, issues) {
  const file = 'assets/js/stats.js';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return;

  let source;
  let validScenario;
  let zeroScenario;
  let invalidCounterScenario;
  let invalidPeriodScenario;
  let invalidStartScenario;
  let unavailableScenario;
  let missingEndpointScenario;
  let localScenario;
  try {
    source = readUtf8(rootDir, file);
    validScenario = runStatsScenario(source, {
      pathname: '/en/analytics.html',
      publicPayload: {
        siteViews: '900719925474099312345',
        monthUniqueDevices: '43',
        pageViews: '44',
        period: '2026-07',
        trackingSince: '2026-07-22'
      },
      triggerLoad: true
    });
    zeroScenario = runStatsScenario(source, {
      publicPayload: {
        siteViews: '0',
        monthUniqueDevices: '0',
        pageViews: '0',
        period: '2026-07',
        trackingSince: '2026-07-22'
      },
      triggerLoad: true
    });
    invalidCounterScenario = runStatsScenario(source, {
      publicPayload: {
        siteViews: 42,
        monthUniqueDevices: '7',
        pageViews: '11',
        period: '2026-07',
        trackingSince: '2026-07-22'
      },
      triggerLoad: true
    });
    invalidPeriodScenario = runStatsScenario(source, {
      publicPayload: {
        siteViews: '42',
        monthUniqueDevices: '7',
        pageViews: '11',
        period: '2026-13',
        trackingSince: '2026-07-22'
      },
      triggerLoad: true
    });
    invalidStartScenario = runStatsScenario(source, {
      publicPayload: {
        siteViews: '42',
        monthUniqueDevices: '7',
        pageViews: '11',
        period: '2026-07',
        trackingSince: '2026-07-21'
      },
      triggerLoad: true
    });
    unavailableScenario = runStatsScenario(source, {
      fetchError: true,
      triggerLoad: true
    });
    missingEndpointScenario = runStatsScenario(source, {
      endpoint: null,
      triggerLoad: true
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

  const publicIds = ['site-pv', 'month-unique-devices', 'page-pv'];
  const validValues = publicIds.map(
    (id) => validScenario.readElement(id).text
  );
  if (
    validValues.join(' ') !== '900719925474099312345 43 44' ||
    validScenario.readElement('stats-status').state !== 'ok' ||
    !validScenario.readElement('stats-status').text.includes('July 22, 2026') ||
    ![invalidCounterScenario, invalidPeriodScenario, invalidStartScenario].every(
      (scenario) => (
        publicIds.every((id) => scenario.readElement(id).text === '--') &&
        scenario.readElement('stats-status').state === 'warn'
      )
    )
  ) {
    addIssue(issues, file, STATS_INTEGER_CONTRACT_ISSUE);
  }

  const zeroValues = publicIds.map(
    (id) => zeroScenario.readElement(id).text
  );
  if (
    zeroValues.join(' ') !== '0 0 0' ||
    zeroScenario.readElement('stats-status').state !== 'ok'
  ) {
    addIssue(issues, file, STATS_ZERO_CONTRACT_ISSUE);
  }

  const failureScenarios = [
    invalidCounterScenario,
    invalidPeriodScenario,
    invalidStartScenario,
    unavailableScenario,
    missingEndpointScenario
  ];
  if (
    !failureScenarios.every((scenario) => (
      publicIds.every((id) => scenario.readElement(id).text === '--') &&
      scenario.readElement('stats-status').state === 'warn' &&
      scenario.readElement('stats-status').text.includes('local records remain available')
    ))
  ) {
    addIssue(issues, file, STATS_UNAVAILABLE_CONTRACT_ISSUE);
  }

  let requestBody = null;
  try {
    requestBody = JSON.parse(validScenario.fetchCalls[0].body);
  } catch (error) {
    requestBody = null;
  }
  const validCall = validScenario.fetchCalls[0] || {};
  if (
    validScenario.fetchCalls.length !== 1 ||
    validCall.url !== STATS_API_ENDPOINT ||
    validCall.method !== 'POST' ||
    validCall.cache !== 'no-store' ||
    validCall.credentials !== 'omit' ||
    !validCall.headers ||
    validCall.headers['Content-Type'] !== 'application/json' ||
    JSON.stringify(requestBody) !== JSON.stringify({ path: '/en/analytics.html' }) ||
    validScenario.timeoutDelays.length !== 1 ||
    validScenario.timeoutDelays[0] !== 5000 ||
    validScenario.clearedTimeouts !== 1 ||
    missingEndpointScenario.fetchCalls.length !== 0
  ) {
    addIssue(issues, file, STATS_LOADING_CONTRACT_ISSUE);
  }
  const normalizedSource = source.toLowerCase();
  if (
    LEGACY_STATS_MARKERS.some((marker) => normalizedSource.includes(marker)) ||
    /\bsetInterval\s*\(/.test(source) ||
    /createElement\s*\(\s*['"]script['"]\s*\)/.test(source)
  ) {
    addIssue(issues, file, STATS_LEGACY_RUNTIME_ISSUE);
  }

  const datePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
  if (
    !datePattern.test(localScenario.readElement('local-first').text) ||
    !datePattern.test(localScenario.readElement('local-last').text)
  ) {
    addIssue(issues, file, STATS_LOCAL_DATE_CONTRACT_ISSUE);
  }

  const localHistoryNow = '2024-02-29T04:05:06.789Z';
  const localHistoryNowDate = new Date(localHistoryNow);
  const localHistoryToday = [
    localHistoryNowDate.getFullYear(),
    String(localHistoryNowDate.getMonth() + 1).padStart(2, '0'),
    String(localHistoryNowDate.getDate()).padStart(2, '0')
  ].join('-');
  const formatLocalHistoryDate = (value) => {
    const date = new Date(value);
    return [
      [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('-'),
      [
        String(date.getHours()).padStart(2, '0'),
        String(date.getMinutes()).padStart(2, '0')
      ].join(':')
    ].join(' ');
  };
  const chronologicalDays = Array.from({ length: 369 }, (_, index) => (
    new Date(Date.UTC(2022, 0, index + 1)).toISOString().slice(0, 10)
  ));
  const historicalDays = [
    ...chronologicalDays.slice(0, 100),
    '2020-02-29',
    ...chronologicalDays.slice(100)
  ];
  const reorderedDay = historicalDays[200];
  historicalDays[200] = historicalDays[201];
  historicalDays[201] = reorderedDay;
  const validFirstVisit = '2002-03-04T05:06:07.123Z';
  const alreadyNormalizedDays = [historicalDays[369], localHistoryToday];
  const messyDays = [
    localHistoryToday,
    historicalDays[0],
    20240102,
    historicalDays[0],
    ...historicalDays.slice(1),
    historicalDays[120],
    null,
    '2024-02-30',
    localHistoryToday,
    historicalDays[369],
    '2024-1-02'
  ];
  const expectedMessyDays = [...historicalDays.slice(6), localHistoryToday];
  const corruptFirstValues = [
    'not-a-date',
    '2001-02-03T04:05:06+00:00',
    '2001-02-03',
    '2001-02-30T04:05:06.000Z'
  ];
  const corruptDaysValues = ['{', 'null', '{}', '42'];
  let localHistoryContractHolds = false;
  try {
    const normalizedScenario = runStatsScenario(source, {
      now: localHistoryNow,
      nowStepMs: 86400000,
      storageSeed: {
        'ysb-visit-first': validFirstVisit,
        'ysb-visit-last': '1999-01-01T00:00:00.000Z',
        'ysb-visit-days': JSON.stringify(messyDays),
        ysb_first_visit: '1998-01-01T00:00:00.000Z',
        ysb_visit_days: '["1998-01-01"]'
      },
      triggerDomContentLoaded: true
    });
    const persistedScenario = runStatsScenario(source, {
      now: localHistoryNow,
      nowStepMs: 86400000,
      storageSeed: {
        'ysb-visit-first': validFirstVisit,
        'ysb-visit-days': JSON.stringify(alreadyNormalizedDays)
      },
      triggerDomContentLoaded: true
    });
    const corruptScenarios = corruptFirstValues.map((firstVisit, index) => (
      runStatsScenario(source, {
        now: localHistoryNow,
        nowStepMs: 86400000,
        storageSeed: {
          'ysb-visit-first': firstVisit,
          'ysb-visit-days': corruptDaysValues[index],
          ysb_first_visit: '1997-01-02T03:04:05.000Z',
          ysb_visit_days: '["1997-01-02"]'
        },
        triggerDomContentLoaded: true
      })
    ));
    const normalizedDays = JSON.parse(normalizedScenario.storage['ysb-visit-days']);
    const normalizedScenarioHolds =
      normalizedScenario.storage['ysb-visit-first'] === validFirstVisit &&
      normalizedScenario.storage['ysb-visit-last'] === localHistoryNow &&
      JSON.stringify(normalizedDays) === JSON.stringify(expectedMessyDays) &&
      normalizedDays.length === 365 &&
      normalizedDays.filter((day) => day === localHistoryToday).length === 1 &&
      normalizedDays.at(-1) === localHistoryToday &&
      normalizedScenario.readElement('local-days').text === '365' &&
      normalizedScenario.readElement('local-first').text === formatLocalHistoryDate(validFirstVisit) &&
      normalizedScenario.readElement('local-last').text === formatLocalHistoryDate(localHistoryNow);
    const persistedScenarioHolds =
      persistedScenario.storage['ysb-visit-days'] === JSON.stringify(alreadyNormalizedDays) &&
      persistedScenario.storageWrites.some((write) => (
        write.key === 'ysb-visit-days' && write.value === JSON.stringify(alreadyNormalizedDays)
      )) &&
      persistedScenario.readElement('local-days').text === '2';
    const corruptScenariosHold = corruptScenarios.every((scenario) => {
      const days = JSON.parse(scenario.storage['ysb-visit-days']);
      return scenario.storage['ysb-visit-first'] === localHistoryNow &&
        scenario.storage['ysb-visit-last'] === localHistoryNow &&
        JSON.stringify(days) === JSON.stringify([localHistoryToday]) &&
        scenario.readElement('local-days').text === '1' &&
        scenario.readElement('local-first').text === formatLocalHistoryDate(localHistoryNow) &&
        scenario.readElement('local-last').text === formatLocalHistoryDate(localHistoryNow);
    });
    localHistoryContractHolds =
      normalizedScenarioHolds && persistedScenarioHolds && corruptScenariosHold;
  } catch (error) {
    localHistoryContractHolds = false;
  }
  if (!localHistoryContractHolds) {
    addIssue(issues, file, STATS_LOCAL_HISTORY_CONTRACT_ISSUE);
  }

  const localCountPathname = '/en/local-count-contract.html';
  const localPageKey = `ysb-page:${localCountPathname}`;
  const validLocalCountCases = [
    ['0', '0', '1', '1'],
    ['41', '9', '42', '10'],
    ['19', '1099', '20', '1100'],
    ['41', 'junk', '42', '1'],
    ['junk', '9', '1', '10'],
    ['9007199254740991', '9007199254740991', '9007199254740992', '9007199254740992'],
    ['9007199254740992', '9007199254740992', '9007199254740993', '9007199254740993'],
    [
      '9999999999999999999999999999999999999999',
      '9999999999999999999999999999999999999999',
      '10000000000000000000000000000000000000000',
      '10000000000000000000000000000000000000000'
    ]
  ];
  const invalidLocalCountValues = [
    null,
    '',
    'junk',
    'NaN',
    '-1',
    '1.5',
    '1e3',
    '01',
    '+1',
    ' 1',
    '1 ',
    '１２'
  ];
  let localCountContractHolds = false;
  try {
    const codeMask = buildJavaScriptCodeMask(source);
    const localCounterHandler = extractNamedFunctionBody(
      source,
      codeMask,
      'incrementLocalCounter',
      true
    );
    const forbiddenNumericCapability = localCounterHandler && (
      hasExecutableMatch(
        localCounterHandler.source,
        localCounterHandler.codeMask,
        /\b(?:BigInt|Number|parseFloat|parseInt)\b/
      ) ||
      hasExecutableMatch(
        localCounterHandler.source,
        localCounterHandler.codeMask,
        /\b(?:0[xX][0-9a-fA-F](?:_?[0-9a-fA-F])*|0[bB][01](?:_?[01])*|0[oO][0-7](?:_?[0-7])*|(?:0|[1-9](?:_?[0-9])*))n\b/
      ) ||
      hasJavaScriptTemplateLiteral(localCounterHandler.source)
    );
    let isolatedLocalCounterHolds = false;
    if (localCounterHandler && !forbiddenNumericCapability) {
      try {
        const isolatedContext = vm.createContext({
          BigInt: undefined,
          Number: undefined,
          parseFloat: undefined,
          parseInt: undefined
        });
        const isolatedSource =
          'globalThis.__incrementLocalCounter = function (' +
          localCounterHandler.parameters +
          ') {' +
          localCounterHandler.source +
          '\n};';
        new vm.Script(isolatedSource, {
          filename: 'stats-local-counter-contract.vm.js'
        }).runInContext(isolatedContext, { timeout: STATS_LOCAL_COUNTER_VM_TIMEOUT_MS });
        const isolatedCases = validLocalCountCases.flatMap(([
          totalValue,
          pageValue,
          expectedTotal,
          expectedPage
        ]) => [
          [totalValue, expectedTotal],
          [pageValue, expectedPage]
        ]).concat(invalidLocalCountValues.map((value) => [value, '1']));
        isolatedLocalCounterHolds = isolatedCases.every(([value, expected]) => {
          isolatedContext.__localCounterInput = value;
          return new vm.Script(
            '__incrementLocalCounter(__localCounterInput)',
            { filename: 'stats-local-counter-call.vm.js' }
          ).runInContext(
            isolatedContext,
            { timeout: STATS_LOCAL_COUNTER_VM_TIMEOUT_MS }
          ) === expected;
        });
      } catch (error) {
        isolatedLocalCounterHolds = false;
      }
    }
    const validLocalCountScenarios = validLocalCountCases.map(([
      totalValue,
      pageValue,
      expectedTotal,
      expectedPage
    ]) => ({
      expectedTotal,
      expectedPage,
      scenario: runStatsScenario(source, {
        pathname: localCountPathname,
        storageSeed: {
          'ysb-visit-total': totalValue,
          [localPageKey]: pageValue
        },
        triggerDomContentLoaded: true
      })
    }));
    const invalidLocalCountScenarios = invalidLocalCountValues.map((value) => {
      const storageSeed = {};
      if (value !== null) {
        storageSeed['ysb-visit-total'] = value;
        storageSeed[localPageKey] = value;
      }
      return runStatsScenario(source, {
        pathname: localCountPathname,
        storageSeed,
        triggerDomContentLoaded: true
      });
    });
    const matchesExpectedCounts = (scenario, expectedTotal, expectedPage) => (
      scenario.storage['ysb-visit-total'] === expectedTotal &&
      scenario.storage[localPageKey] === expectedPage &&
      scenario.readElement('local-total').text === expectedTotal &&
      scenario.readElement('local-page').text === expectedPage
    );
    localCountContractHolds = Boolean(localCounterHandler) &&
      !forbiddenNumericCapability &&
      isolatedLocalCounterHolds &&
      validLocalCountScenarios.every(({ scenario, expectedTotal, expectedPage }) => (
        matchesExpectedCounts(scenario, expectedTotal, expectedPage)
      )) &&
      invalidLocalCountScenarios.every((scenario) => (
        matchesExpectedCounts(scenario, '1', '1')
      ));
  } catch (error) {
    localCountContractHolds = false;
  }
  if (!localCountContractHolds) {
    addIssue(issues, file, STATS_LOCAL_COUNT_CONTRACT_ISSUE);
  }

  const legacySeed = {
    ysb_visit_total: '4',
    ysb_first_visit: '2001-02-03T04:05:06.000Z',
    ysb_last_visit: '2001-02-04T05:06:07.000Z',
    ysb_visit_days: '["2001-02-03"]',
    'ysb_page:/analytics.html': '99'
  };
  const canonicalSeed = {
    'ysb-visit-total': '7',
    'ysb-visit-first': '2002-03-04T05:06:07.000Z',
    'ysb-visit-last': '2002-03-05T06:07:08.000Z',
    'ysb-visit-days': '["2002-03-04"]',
    ysb_visit_total: '40',
    ysb_first_visit: '1999-01-01T00:00:00.000Z',
    ysb_last_visit: '1999-01-02T00:00:00.000Z',
    ysb_visit_days: '["1999-01-01"]'
  };
  const emptyCanonicalSeed = {
    'ysb-visit-total': '',
    'ysb-visit-first': '',
    'ysb-visit-last': '',
    'ysb-visit-days': '',
    ysb_visit_total: '40',
    ysb_first_visit: '1998-01-01T00:00:00.000Z',
    ysb_last_visit: '1998-01-02T00:00:00.000Z',
    ysb_visit_days: '["1998-01-01"]'
  };
  const invalidLegacySeed = {
    ysb_visit_total: '１２',
    ysb_first_visit: '2001-02-30T04:05:06.000Z',
    ysb_last_visit: '2001-02-30T05:06:07.000Z',
    ysb_visit_days: '{"not":"an array"}'
  };
  const invalidLegacyDaysSeed = {
    ysb_visit_days: '["2003-02-30"]'
  };
  const mixedLegacySeed = {
    ysb_visit_total: '9',
    ysb_first_visit: '2004-02-30T00:00:00.000Z',
    ysb_last_visit: '2004-03-01T00:00:00.000Z',
    ysb_visit_days: '["2004-03-01"]'
  };
  const strictInvalidLegacySeeds = [
    { ysb_visit_total: '01' },
    { ysb_visit_total: '9007199254740991' },
    { ysb_first_visit: '2001-02-03T04:05:06Z' },
    { ysb_visit_days: '["2005-01-01","2005-01-01"]' },
    { ysb_visit_days: '[20050101]' }
  ];
  const storageFailureSeed = {
    ysb_visit_total: '9',
    ysb_first_visit: '2006-01-02T03:04:05.000Z',
    ysb_visit_days: '["2006-01-02"]'
  };
  let legacyScenario;
  let canonicalScenario;
  let emptyCanonicalScenario;
  let invalidLegacyScenario;
  let invalidLegacyDaysScenario;
  let mixedLegacyScenario;
  let strictInvalidLegacyScenarios;
  let storageFailureScenario;
  try {
    legacyScenario = runStatsScenario(source, {
      storageSeed: legacySeed,
      triggerDomContentLoaded: true
    });
    canonicalScenario = runStatsScenario(source, {
      storageSeed: canonicalSeed,
      triggerDomContentLoaded: true
    });
    emptyCanonicalScenario = runStatsScenario(source, {
      storageSeed: emptyCanonicalSeed,
      triggerDomContentLoaded: true
    });
    invalidLegacyScenario = runStatsScenario(source, {
      storageSeed: invalidLegacySeed,
      triggerDomContentLoaded: true
    });
    invalidLegacyDaysScenario = runStatsScenario(source, {
      storageSeed: invalidLegacyDaysSeed,
      triggerDomContentLoaded: true
    });
    mixedLegacyScenario = runStatsScenario(source, {
      storageSeed: mixedLegacySeed,
      triggerDomContentLoaded: true
    });
    strictInvalidLegacyScenarios = strictInvalidLegacySeeds.map((storageSeed) =>
      runStatsScenario(source, {
        storageSeed,
        triggerDomContentLoaded: true
      })
    );
    storageFailureScenario = runStatsScenario(source, {
      storageSeed: storageFailureSeed,
      storageGetFailures: ['ysb_first_visit'],
      triggerDomContentLoaded: true
    });
  } catch (error) {
    addIssue(issues, file, STATS_LEGACY_STORAGE_CONTRACT_ISSUE);
    return;
  }

  function storedDays(scenario) {
    try {
      const value = JSON.parse(scenario.storage['ysb-visit-days']);
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function validStoredDate(value) {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toISOString() === value;
  }

  const legacyDays = storedDays(legacyScenario);
  const canonicalDays = storedDays(canonicalScenario);
  const emptyCanonicalDays = storedDays(emptyCanonicalScenario);
  const invalidLegacyDays = storedDays(invalidLegacyScenario);
  const invalidEntryDays = storedDays(invalidLegacyDaysScenario);
  const mixedLegacyDays = storedDays(mixedLegacyScenario);
  const storageFailureDays = storedDays(storageFailureScenario);
  const legacyLastWrites = legacyScenario.storageWrites.filter(
    (entry) => entry.key === 'ysb-visit-last'
  );
  const canonicalLastWrites = canonicalScenario.storageWrites.filter(
    (entry) => entry.key === 'ysb-visit-last'
  );
  const invalidLastWrites = invalidLegacyScenario.storageWrites.filter(
    (entry) => entry.key === 'ysb-visit-last'
  );
  const mixedLastWrites = mixedLegacyScenario.storageWrites.filter(
    (entry) => entry.key === 'ysb-visit-last'
  );
  const legacyKeyMappings = [
    ['ysb-visit-total', 'ysb_visit_total'],
    ['ysb-visit-first', 'ysb_first_visit'],
    ['ysb-visit-last', 'ysb_last_visit'],
    ['ysb-visit-days', 'ysb_visit_days']
  ];
  function wroteSeededLegacyValue(scenario, seed) {
    return scenario.storageWrites.some((entry) => legacyKeyMappings.some(
      ([canonicalKey, legacyKey]) =>
        entry.key === canonicalKey && entry.value === seed[legacyKey]
    ));
  }
  const canonicalLegacyWasActivated = wroteSeededLegacyValue(
    canonicalScenario,
    canonicalSeed
  );
  const emptyCanonicalLegacyWasActivated = wroteSeededLegacyValue(
    emptyCanonicalScenario,
    emptyCanonicalSeed
  );
  const invalidLegacyWasActivated = wroteSeededLegacyValue(
    invalidLegacyScenario,
    invalidLegacySeed
  );
  const legacyPageWasActivated = legacyScenario.storageWrites.some(
    (entry) =>
      entry.key === 'ysb-page:/analytics.html' &&
      entry.value === legacySeed['ysb_page:/analytics.html']
  );
  const preservedLegacyKeys = new Set([
    'ysb_visit_total',
    'ysb_first_visit',
    'ysb_last_visit',
    'ysb_visit_days',
    'ysb_page:/analytics.html'
  ]);
  const destructiveLegacyStorageOperation = [
    legacyScenario,
    canonicalScenario,
    emptyCanonicalScenario,
    invalidLegacyScenario,
    invalidLegacyDaysScenario,
    mixedLegacyScenario,
    storageFailureScenario,
    ...strictInvalidLegacyScenarios
  ].some(
    (scenario) =>
      scenario.storageClearCount > 0 ||
      scenario.storageRemovals.some((key) => preservedLegacyKeys.has(key)) ||
      scenario.storageWrites.some((entry) => preservedLegacyKeys.has(entry.key))
  );
  const legacyKeysRemain = Object.entries(legacySeed).every(
    ([key, value]) => legacyScenario.storage[key] === value
  );
  const canonicalLegacyKeysRemain = Object.entries(canonicalSeed)
    .filter(([key]) => key.includes('_'))
    .every(([key, value]) => canonicalScenario.storage[key] === value);

  const legacyContractHolds =
    legacyScenario.storage['ysb-visit-total'] === '5' &&
    legacyScenario.storage['ysb-visit-first'] === legacySeed.ysb_first_visit &&
    legacyScenario.storage['ysb-page:/analytics.html'] === '1' &&
    legacyScenario.storage['ysb_page:/analytics.html'] === '99' &&
    !legacyPageWasActivated &&
    legacyDays.length === 2 &&
    legacyDays.includes('2001-02-03') &&
    legacyLastWrites.length === 1 &&
    validStoredDate(legacyLastWrites.at(-1).value) &&
    legacyLastWrites.at(-1).value !== legacySeed.ysb_last_visit &&
    legacyKeysRemain;
  const canonicalContractHolds =
    canonicalScenario.storage['ysb-visit-total'] === '8' &&
    canonicalScenario.storage['ysb-visit-first'] === canonicalSeed['ysb-visit-first'] &&
    canonicalDays.length === 2 &&
    canonicalDays.includes('2002-03-04') &&
    !canonicalDays.includes('1999-01-01') &&
    !canonicalLastWrites.some((entry) => entry.value === canonicalSeed.ysb_last_visit) &&
    !canonicalLegacyWasActivated &&
    canonicalLegacyKeysRemain;
  const emptyCanonicalContractHolds =
    emptyCanonicalScenario.storage['ysb-visit-total'] === '1' &&
    emptyCanonicalScenario.storage['ysb-visit-first'] !== emptyCanonicalSeed.ysb_first_visit &&
    validStoredDate(emptyCanonicalScenario.storage['ysb-visit-first']) &&
    emptyCanonicalDays.length === 1 &&
    !emptyCanonicalDays.includes('1998-01-01') &&
    !emptyCanonicalLegacyWasActivated &&
    !emptyCanonicalScenario.storageWrites.some(
      (entry) => entry.value === emptyCanonicalSeed.ysb_last_visit
    );
  const invalidLegacyContractHolds =
    invalidLegacyScenario.storage['ysb-visit-total'] === '1' &&
    validStoredDate(invalidLegacyScenario.storage['ysb-visit-first']) &&
    validStoredDate(invalidLegacyScenario.storage['ysb-visit-last']) &&
    invalidLegacyScenario.storage['ysb-page:/analytics.html'] === '1' &&
    invalidLegacyDays.length === 1 &&
    !invalidLastWrites.some((entry) => entry.value === invalidLegacySeed.ysb_last_visit) &&
    invalidLegacyScenario.readElement('local-total').text === '1' &&
    invalidLegacyScenario.readElement('local-page').text === '1' &&
    invalidLegacyScenario.readElement('local-days').text === '1' &&
    !invalidLegacyWasActivated &&
    invalidEntryDays.length === 1 &&
    !invalidEntryDays.includes('2003-02-30');
  const mixedLegacyContractHolds =
    mixedLegacyScenario.storage['ysb-visit-total'] === '10' &&
    mixedLegacyScenario.storage['ysb-visit-first'] !== mixedLegacySeed.ysb_first_visit &&
    validStoredDate(mixedLegacyScenario.storage['ysb-visit-first']) &&
    mixedLegacyDays.length === 2 &&
    mixedLegacyDays.includes('2004-03-01') &&
    !mixedLastWrites.some((entry) => entry.value === mixedLegacySeed.ysb_last_visit) &&
    mixedLegacyScenario.readElement('local-total').text === '10' &&
    mixedLegacyScenario.readElement('local-days').text === '2';
  const strictInvalidLegacyContractHolds = strictInvalidLegacyScenarios.every(
    (scenario, index) =>
      !wroteSeededLegacyValue(scenario, strictInvalidLegacySeeds[index]) &&
      scenario.storage['ysb-visit-total'] === '1' &&
      storedDays(scenario).length === 1 &&
      scenario.readElement('local-total').text === '1' &&
      scenario.readElement('local-days').text === '1'
  );
  const storageFailureContractHolds =
    storageFailureScenario.storage['ysb-visit-total'] === '10' &&
    storageFailureScenario.storage['ysb-visit-first'] !== storageFailureSeed.ysb_first_visit &&
    validStoredDate(storageFailureScenario.storage['ysb-visit-first']) &&
    storageFailureDays.length === 2 &&
    storageFailureDays.includes('2006-01-02') &&
    storageFailureScenario.readElement('local-total').text === '10' &&
    storageFailureScenario.readElement('local-days').text === '2';

  if (
    !legacyContractHolds ||
    !canonicalContractHolds ||
    !emptyCanonicalContractHolds ||
    !invalidLegacyContractHolds ||
    !mixedLegacyContractHolds ||
    !strictInvalidLegacyContractHolds ||
    !storageFailureContractHolds ||
    destructiveLegacyStorageOperation
  ) {
    addIssue(issues, file, STATS_LEGACY_STORAGE_CONTRACT_ISSUE);
  }
}

const JAVASCRIPT_NON_CODE_PATTERN =
  /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|`(?:\\[\s\S]|[^`\\])*`|\/(?![/*])(?:\\[\s\S]|\[(?:\\[\s\S]|[^\]\\])*\]|[^/\\\r\n])+\/[dgimsuvy]*|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g;

function hasJavaScriptTemplateLiteral(source) {
  const matcher = new RegExp(
    JAVASCRIPT_NON_CODE_PATTERN.source,
    JAVASCRIPT_NON_CODE_PATTERN.flags
  );
  let match = matcher.exec(source);

  while (match) {
    if (match[0].startsWith('`')) return true;
    match = matcher.exec(source);
  }

  return false;
}

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

function findExecutableMatch(source, codeMask, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  let match = matcher.exec(source);

  while (match) {
    if (codeMask[match.index] === 1) return match;
    if (match[0] === '') matcher.lastIndex += 1;
    match = matcher.exec(source);
  }

  return null;
}

function hasExecutableMatch(source, codeMask, pattern) {
  return findExecutableMatch(source, codeMask, pattern) !== null;
}

function executableBraceDepthAt(source, codeMask, endIndex) {
  let depth = 0;
  for (let index = 0; index < endIndex; index += 1) {
    if (codeMask[index] !== 1) continue;
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
  }
  return depth;
}

function hasExecutableBindingAssignment(source, codeMask, bindingName) {
  const matcher = new RegExp(`\\b${bindingName}\\s*=(?!=)`, 'g');
  let match = matcher.exec(source);

  while (match) {
    if (codeMask[match.index] === 1) {
      let previousIndex = match.index - 1;
      while (
        previousIndex >= 0 &&
        (codeMask[previousIndex] !== 1 || /\s/.test(source[previousIndex]))
      ) {
        previousIndex -= 1;
      }
      if (previousIndex < 0 || source[previousIndex] !== '.') return true;
    }
    match = matcher.exec(source);
  }

  return false;
}

function extractNamedFunctionBody(source, codeMask, functionName, requireUnique = false) {
  const signature = new RegExp(
    `\\bfunction\\s+${functionName}\\s*\\(([^)]*)\\)\\s*\\{`,
    'g'
  );
  let extracted = null;
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
            const candidate = {
              codeMask: codeMask.slice(openingBrace + 1, index),
              declarationEnd: index + 1,
              parameters: match[1],
              source: source.slice(openingBrace + 1, index)
            };
            if (!requireUnique) return candidate;
            if (extracted) return null;
            extracted = candidate;
            break;
          }
        }
      }
    }
    match = signature.exec(source);
  }

  return extracted;
}

const CSS_NON_CODE_PATTERN =
  /"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/\*[\s\S]*?\*\//g;

function buildCssCodeMask(source) {
  const mask = new Uint8Array(source.length);
  mask.fill(1);

  const matcher = new RegExp(CSS_NON_CODE_PATTERN.source, CSS_NON_CODE_PATTERN.flags);
  let match = matcher.exec(source);
  while (match) {
    mask.fill(0, match.index, match.index + match[0].length);
    match = matcher.exec(source);
  }

  return mask;
}

function maskedSource(source, codeMask) {
  const characters = source.split('');
  for (let index = 0; index < characters.length; index += 1) {
    if (codeMask[index] !== 1 && characters[index] !== '\r' && characters[index] !== '\n') {
      characters[index] = ' ';
    }
  }
  return characters.join('');
}

const CSS_SIMPLE_BLOCK_PAIRS = { '{': '}', '(': ')', '[': ']' };

function findCssBlockEnd(source, openingIndex) {
  const stack = [CSS_SIMPLE_BLOCK_PAIRS[source[openingIndex]]];
  if (!stack[0]) return -1;

  for (let index = openingIndex + 1; index < source.length; index += 1) {
    if (CSS_SIMPLE_BLOCK_PAIRS[source[index]]) {
      stack.push(CSS_SIMPLE_BLOCK_PAIRS[source[index]]);
    } else if (source[index] === stack[stack.length - 1]) {
      stack.pop();
      if (stack.length === 0) return index;
    }
  }
  return -1;
}

function cssSimpleBlockDepthAt(source, endIndex) {
  const stack = [];
  for (let index = 0; index < endIndex; index += 1) {
    if (CSS_SIMPLE_BLOCK_PAIRS[source[index]]) {
      stack.push(CSS_SIMPLE_BLOCK_PAIRS[source[index]]);
    } else if (source[index] === stack[stack.length - 1]) {
      stack.pop();
    }
  }
  return stack.length;
}

function collectCssSimpleBlockDepths(source) {
  const depths = new Uint32Array(source.length);
  const stack = [];

  for (let index = 0; index < source.length; index += 1) {
    depths[index] = stack.length;
    if (CSS_SIMPLE_BLOCK_PAIRS[source[index]]) {
      stack.push(CSS_SIMPLE_BLOCK_PAIRS[source[index]]);
    } else if (source[index] === stack[stack.length - 1]) {
      stack.pop();
    }
  }

  return depths;
}

function extractCssMediaBlocks(source, codeMask, mediaPattern) {
  const matcher = new RegExp(mediaPattern.source, 'g');
  const executableSource = maskedSource(source, codeMask);
  const blocks = [];
  let match = matcher.exec(source);

  while (match) {
    if (
      codeMask[match.index] === 1 &&
      cssSimpleBlockDepthAt(executableSource, match.index) === 0
    ) {
      const openingBrace = match.index + match[0].lastIndexOf('{');
      const closingBrace = findCssBlockEnd(executableSource, openingBrace);
      if (closingBrace >= 0) {
        blocks.push({
          codeMask: codeMask.slice(openingBrace + 1, closingBrace),
          source: source.slice(openingBrace + 1, closingBrace)
        });
        matcher.lastIndex = closingBrace + 1;
      }
    }
    match = matcher.exec(source);
  }

  return blocks;
}

function splitTopLevelCssSelectorList(source) {
  const stack = [];
  const selectors = [];
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (CSS_SIMPLE_BLOCK_PAIRS[source[index]]) {
      stack.push(CSS_SIMPLE_BLOCK_PAIRS[source[index]]);
    } else if (source[index] === stack[stack.length - 1]) {
      stack.pop();
    } else if (source[index] === ',' && stack.length === 0) {
      selectors.push(source.slice(start, index));
      start = index + 1;
    }
  }
  selectors.push(source.slice(start));
  return selectors;
}

function normalizeCssSelector(selector) {
  return selector
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, '$1');
}

function findCssRulePreludeStart(source, openingBrace) {
  const stack = [];
  const reversePairs = { ')': '(', ']': '[' };

  for (let index = openingBrace - 1; index >= 0; index -= 1) {
    const character = source[index];
    if (reversePairs[character]) {
      stack.push(reversePairs[character]);
    } else if (character === stack[stack.length - 1]) {
      stack.pop();
    } else if (
      stack.length === 0 &&
      (character === '{' || character === '}' || character === ';')
    ) {
      return index + 1;
    }
  }

  return 0;
}

function collectCssRuleEntries(source) {
  const rules = [];
  const blockDepths = collectCssSimpleBlockDepths(source);
  let openingBrace = source.indexOf('{');

  while (openingBrace >= 0) {
    const depth = blockDepths[openingBrace];
    const preludeStart = findCssRulePreludeStart(source, openingBrace);
    const prelude = source.slice(preludeStart, openingBrace).trim();
    if (!prelude.startsWith('@')) {
      const closingBrace = findCssBlockEnd(source, openingBrace);
      if (closingBrace >= 0) {
        rules.push({
          body: source.slice(openingBrace + 1, closingBrace),
          depth,
          sourceIndex: openingBrace,
          selectors: splitTopLevelCssSelectorList(prelude)
            .map(normalizeCssSelector)
            .filter(Boolean)
        });
      }
    }
    openingBrace = source.indexOf('{', openingBrace + 1);
  }

  return rules;
}

function splitTopLevelCssDeclarations(source) {
  const stack = [];
  const declarations = [];
  let start = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (CSS_SIMPLE_BLOCK_PAIRS[source[index]]) {
      stack.push(CSS_SIMPLE_BLOCK_PAIRS[source[index]]);
    } else if (source[index] === stack[stack.length - 1]) {
      stack.pop();
    } else if (source[index] === ';' && stack.length === 0) {
      declarations.push(source.slice(start, index));
      start = index + 1;
    }
  }
  declarations.push(source.slice(start));
  return declarations;
}

function effectiveCssPropertyInBody(body, property) {
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const propertyPattern = new RegExp(
    `^\\s*${escapedProperty}\\s*:\\s*(.+?)\\s*$`,
    'i'
  );
  let effectiveDeclaration = null;

  for (const declaration of splitTopLevelCssDeclarations(body)) {
    const propertyMatch = propertyPattern.exec(declaration);
    if (!propertyMatch) continue;
    const important = /!\s*important\s*$/i.test(propertyMatch[1]);
    const value = propertyMatch[1]
      .replace(/!\s*important\s*$/i, '')
      .trim()
      .toLowerCase();
    if (value && (important || !effectiveDeclaration?.important)) {
      effectiveDeclaration = { important, value };
    }
  }

  return effectiveDeclaration;
}

function effectiveDirectCssDeclaration(source, selector, property, ruleEntries) {
  const normalizedSelector = normalizeCssSelector(selector);
  const rules = ruleEntries || collectCssRuleEntries(source);
  let effectiveDeclaration = null;

  for (const rule of rules) {
    if (rule.depth !== 0 || !rule.selectors.includes(normalizedSelector)) continue;
    const declaration = effectiveCssPropertyInBody(rule.body, property);
    if (declaration && (declaration.important || !effectiveDeclaration?.important)) {
      effectiveDeclaration = { ...declaration, sourceIndex: rule.sourceIndex };
    }
  }

  return effectiveDeclaration;
}

function effectiveDirectCssProperty(source, selector, property, ruleEntries) {
  return effectiveDirectCssDeclaration(source, selector, property, ruleEntries)?.value || null;
}

function effectiveDirectCssDisplay(source, selector, ruleEntries) {
  return effectiveDirectCssProperty(source, selector, 'display', ruleEntries);
}

function parseCssSelectorChain(selector) {
  const normalizedSelector = normalizeCssSelector(selector);
  const compounds = [];
  const combinators = [];
  const stack = [];
  let compound = '';

  function finishCompound() {
    const normalizedCompound = compound.trim().toLowerCase();
    if (normalizedCompound) compounds.push(normalizedCompound);
    compound = '';
  }

  for (let index = 0; index < normalizedSelector.length; index += 1) {
    const character = normalizedSelector[index];
    if (CSS_SIMPLE_BLOCK_PAIRS[character] && character !== '{') {
      stack.push(CSS_SIMPLE_BLOCK_PAIRS[character]);
      compound += character;
    } else if (character === stack[stack.length - 1]) {
      stack.pop();
      compound += character;
    } else if (stack.length === 0 && /[>+~]/.test(character)) {
      finishCompound();
      combinators.push(character);
    } else if (stack.length === 0 && /\s/.test(character)) {
      if (compound.trim()) {
        finishCompound();
        combinators.push(' ');
      }
      while (/\s/.test(normalizedSelector[index + 1] || '')) index += 1;
    } else {
      compound += character;
    }
  }
  finishCompound();

  if (compounds.length === 0 || combinators.length !== compounds.length - 1) {
    return null;
  }
  return { combinators, compounds };
}

function addCssSpecificity(left, right) {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function compareCssSpecificity(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function maximumCssSelectorListSpecificity(selectorList) {
  let maximumSpecificity = [0, 0, 0];
  for (const selector of splitTopLevelCssSelectorList(selectorList)) {
    const specificity = cssSelectorSpecificity(selector);
    if (compareCssSpecificity(specificity, maximumSpecificity) > 0) {
      maximumSpecificity = specificity;
    }
  }
  return maximumSpecificity;
}

function cssNthOfSelectorList(source) {
  const stack = [];
  for (let index = 0; index < source.length - 1; index += 1) {
    const character = source[index];
    if (CSS_SIMPLE_BLOCK_PAIRS[character]) {
      stack.push(CSS_SIMPLE_BLOCK_PAIRS[character]);
    } else if (character === stack[stack.length - 1]) {
      stack.pop();
    } else if (
      stack.length === 0 &&
      source.slice(index, index + 2).toLowerCase() === 'of' &&
      /\s/.test(source[index - 1] || '') &&
      /\s/.test(source[index + 2] || '')
    ) {
      return source.slice(index + 2).trim();
    }
  }
  return '';
}

function cssCompoundSpecificity(compound) {
  let executableCompound = compound;
  let specificity = [0, 0, 0];
  const functionalPseudoPattern = /:([A-Za-z_-][\w-]*)\(/g;
  let functionalPseudo = functionalPseudoPattern.exec(executableCompound);

  while (functionalPseudo) {
    const pseudoName = functionalPseudo[1].toLowerCase();
    const openingParenthesis = functionalPseudo.index + functionalPseudo[0].length - 1;
    const closingParenthesis = findCssBlockEnd(executableCompound, openingParenthesis);
    if (closingParenthesis < 0) break;
    if (pseudoName === 'is' || pseudoName === 'not' || pseudoName === 'has') {
      const content = executableCompound.slice(openingParenthesis + 1, closingParenthesis);
      specificity = addCssSpecificity(
        specificity,
        maximumCssSelectorListSpecificity(content)
      );
    } else if (pseudoName === 'nth-child' || pseudoName === 'nth-last-child') {
      specificity[1] += 1;
      const content = executableCompound.slice(openingParenthesis + 1, closingParenthesis);
      const ofSelectorList = cssNthOfSelectorList(content);
      if (ofSelectorList) {
        specificity = addCssSpecificity(
          specificity,
          maximumCssSelectorListSpecificity(ofSelectorList)
        );
      }
    } else if (pseudoName !== 'where') {
      specificity[1] += 1;
    }
    executableCompound = executableCompound.slice(0, functionalPseudo.index) +
      ' '.repeat(closingParenthesis - functionalPseudo.index + 1) +
      executableCompound.slice(closingParenthesis + 1);
    functionalPseudoPattern.lastIndex = functionalPseudo.index;
    functionalPseudo = functionalPseudoPattern.exec(executableCompound);
  }

  executableCompound = executableCompound.replace(/\[[^\]]*\]/g, (attribute) => {
    specificity[1] += 1;
    return ' '.repeat(attribute.length);
  });
  executableCompound = executableCompound.replace(
    /::[A-Za-z_-][\w-]*|:(?:after|before|first-letter|first-line)\b/gi,
    (pseudoElement) => {
      specificity[2] += 1;
      return ' '.repeat(pseudoElement.length);
    }
  );
  executableCompound = executableCompound.replace(/:[A-Za-z_-][\w-]*/g, (pseudoClass) => {
    specificity[1] += 1;
    return ' '.repeat(pseudoClass.length);
  });
  specificity[0] += (executableCompound.match(/#[A-Za-z_][\w-]*/g) || []).length;
  specificity[1] += (executableCompound.match(/\.[A-Za-z_][\w-]*/g) || []).length;
  if (/^[A-Za-z][\w-]*/.test(executableCompound.trim())) specificity[2] += 1;
  return specificity;
}

function cssSelectorSpecificity(selector) {
  const chain = parseCssSelectorChain(selector);
  if (!chain) return [0, 0, 0];
  return chain.compounds.reduce(
    (specificity, compound) => addCssSpecificity(
      specificity,
      cssCompoundSpecificity(compound)
    ),
    [0, 0, 0]
  );
}

function cssCompoundTargetsPseudoElement(compound) {
  const stack = [];
  for (let index = 0; index < compound.length; index += 1) {
    const character = compound[index];
    if (CSS_SIMPLE_BLOCK_PAIRS[character] && character !== '{') {
      stack.push(CSS_SIMPLE_BLOCK_PAIRS[character]);
    } else if (character === stack[stack.length - 1]) {
      stack.pop();
    } else if (stack.length === 0 && character === ':') {
      const pseudoSource = compound.slice(index);
      if (
        /^::[A-Za-z_-][\w-]*/.test(pseudoSource) ||
        /^:(?:after|before|first-letter|first-line)\b/i.test(pseudoSource)
      ) {
        return true;
      }
    }
  }
  return false;
}

function cssCompoundSignature(compound) {
  let executableCompound = compound;
  const negations = [];
  let notIndex = executableCompound.toLowerCase().indexOf(':not(');

  while (notIndex >= 0) {
    const openingParenthesis = notIndex + 4;
    const closingParenthesis = findCssBlockEnd(executableCompound, openingParenthesis);
    if (closingParenthesis < 0) break;
    const notContent = executableCompound.slice(openingParenthesis + 1, closingParenthesis);
    for (const alternative of splitTopLevelCssSelectorList(notContent)) {
      negations.push(cssCompoundSignature(alternative));
    }
    executableCompound = executableCompound.slice(0, notIndex) +
      ' '.repeat(closingParenthesis - notIndex + 1) +
      executableCompound.slice(closingParenthesis + 1);
    notIndex = executableCompound.toLowerCase().indexOf(':not(', notIndex + 1);
  }

  const classes = executableCompound.match(/\.[A-Za-z_][\w-]*/g) || [];
  const ids = executableCompound.match(/#[A-Za-z_][\w-]*/g) || [];
  const typeMatch = /^([A-Za-z][\w-]*|\*)/.exec(executableCompound.trim());
  const tokens = [
    ...classes.map((className) => `class:${className.toLowerCase()}`),
    ...ids.map((id) => `id:${id.toLowerCase()}`)
  ];
  if (typeMatch && typeMatch[1] !== '*') {
    tokens.push(`tag:${typeMatch[1].toLowerCase()}`);
  }
  return {
    hasPseudoElement: cssCompoundTargetsPseudoElement(executableCompound),
    isUniversal: typeMatch?.[1] === '*' || tokens.length === 0,
    negations,
    tokens: new Set(tokens)
  };
}

function cssSignatureRequiresSubset(required, available) {
  if (required.hasPseudoElement || required.tokens.size === 0) return false;
  for (const token of required.tokens) {
    if (!available.tokens.has(token)) return false;
  }
  return true;
}

function cssCompoundSignaturesConflict(left, right) {
  if (left.hasPseudoElement !== right.hasPseudoElement) return true;
  const leftTypes = [...left.tokens].filter((token) => token.startsWith('tag:'));
  const rightTypes = [...right.tokens].filter((token) => token.startsWith('tag:'));
  if (leftTypes.length > 0 && rightTypes.length > 0 && leftTypes[0] !== rightTypes[0]) {
    return true;
  }
  const leftIds = [...left.tokens].filter((token) => token.startsWith('id:'));
  const rightIds = [...right.tokens].filter((token) => token.startsWith('id:'));
  if (leftIds.length > 0 && rightIds.length > 0 && leftIds[0] !== rightIds[0]) {
    return true;
  }
  return left.negations.some((negation) => cssSignatureRequiresSubset(negation, right)) ||
    right.negations.some((negation) => cssSignatureRequiresSubset(negation, left));
}

function cssCompoundSignaturesShareIdentity(candidate, target) {
  for (const token of candidate.tokens) {
    if (target.tokens.has(token)) return true;
  }
  return false;
}

function cssSelectorChainsShareIdentity(candidateSignatures, targetSignatures) {
  return candidateSignatures.some((candidate) => targetSignatures.some((target) => (
    cssCompoundSignaturesShareIdentity(candidate, target)
  )));
}

function cssSelectorsCanOverlap(candidateSelector, targetSelector) {
  const candidate = parseCssSelectorChain(candidateSelector);
  const target = parseCssSelectorChain(targetSelector);
  if (!candidate || !target) return false;

  const candidateSignatures = candidate.compounds.map(cssCompoundSignature);
  const targetSignatures = target.compounds.map(cssCompoundSignature);
  let candidateIndex = candidate.compounds.length - 1;
  let targetIndex = target.compounds.length - 1;
  const candidateSubject = candidateSignatures[candidateIndex];
  const targetSubject = targetSignatures[targetIndex];
  if (
    cssCompoundSignaturesConflict(candidateSubject, targetSubject) ||
    (
      !cssCompoundSignaturesShareIdentity(candidateSubject, targetSubject) &&
      !(candidateSubject.isUniversal && candidate.compounds.length === 1) &&
      !(
        candidateSubject.isUniversal &&
        cssSelectorChainsShareIdentity(candidateSignatures, targetSignatures)
      )
    )
  ) {
    return false;
  }

  while (
    candidateIndex > 0 &&
    targetIndex > 0 &&
    candidate.combinators[candidateIndex - 1] === '>' &&
    target.combinators[targetIndex - 1] === '>'
  ) {
    candidateIndex -= 1;
    targetIndex -= 1;
    if (cssCompoundSignaturesConflict(
      candidateSignatures[candidateIndex],
      targetSignatures[targetIndex]
    )) {
      return false;
    }
  }

  return true;
}

function cssSelectorUsesUnsupportedFunctionalOverlap(selector) {
  const normalizedSelector = normalizeCssSelector(selector);
  const chain = parseCssSelectorChain(normalizedSelector);
  const subject = chain?.compounds[chain.compounds.length - 1] || '';
  const subjectStart = normalizedSelector.toLowerCase().lastIndexOf(subject);
  const functionalPseudoPattern = /(?<!:):([A-Za-z_-][\w-]*)\(/g;
  let functionalPseudo = functionalPseudoPattern.exec(normalizedSelector);

  while (functionalPseudo) {
    const pseudoName = functionalPseudo[1].toLowerCase();
    const openingParenthesis = functionalPseudo.index + functionalPseudo[0].length - 1;
    const closingParenthesis = findCssBlockEnd(normalizedSelector, openingParenthesis);
    if (closingParenthesis < 0) return true;
    if (pseudoName === 'nth-child' || pseudoName === 'nth-last-child') {
      const pseudoContent = normalizedSelector.slice(
        openingParenthesis + 1,
        closingParenthesis
      );
      if (/(?<!:):[A-Za-z_-][\w-]*\(/.test(pseudoContent)) return true;
      functionalPseudoPattern.lastIndex = closingParenthesis + 1;
      functionalPseudo = functionalPseudoPattern.exec(normalizedSelector);
      continue;
    }
    if (pseudoName !== 'not') return true;
    if (functionalPseudo.index < subjectStart) return true;

    const notContent = normalizedSelector.slice(openingParenthesis + 1, closingParenthesis);
    const hasOnlySimpleAlternatives = splitTopLevelCssSelectorList(notContent)
      .every((alternative) => {
        const chain = parseCssSelectorChain(alternative);
        return chain?.compounds.length === 1 && !/[:\[\]*]/.test(alternative);
      });
    if (!hasOnlySimpleAlternatives) return true;
    functionalPseudoPattern.lastIndex = closingParenthesis + 1;
    functionalPseudo = functionalPseudoPattern.exec(normalizedSelector);
  }

  return false;
}

function cssSelectorTargetsPseudoElement(selector) {
  const chain = parseCssSelectorChain(selector);
  if (!chain) return false;
  return cssCompoundSignature(chain.compounds[chain.compounds.length - 1]).hasPseudoElement;
}

function hasConflictingCssPropertyRule(
  source,
  selector,
  declarations,
  ruleEntries,
  overlapSelector = selector
) {
  const normalizedSelector = normalizeCssSelector(selector);
  const rules = ruleEntries || collectCssRuleEntries(source);
  const baselineSpecificity = cssSelectorSpecificity(normalizedSelector);
  const baselines = new Map(declarations.map(([property]) => [
    property,
    effectiveDirectCssDeclaration(source, selector, property, rules)
  ]));
  return rules.some((rule) => rule.selectors.some((candidateSelector) => {
    const isAllowedDirectRule = rule.depth === 0 && candidateSelector === normalizedSelector;
    const usesUnsupportedFunctionalOverlap =
      cssSelectorUsesUnsupportedFunctionalOverlap(candidateSelector);
    if (
      isAllowedDirectRule ||
      cssSelectorTargetsPseudoElement(candidateSelector) ||
      (
        !usesUnsupportedFunctionalOverlap &&
        !cssSelectorsCanOverlap(candidateSelector, overlapSelector)
      )
    ) {
      return false;
    }
    const candidateSpecificity = cssSelectorSpecificity(candidateSelector);
    return declarations.some(([property, expectedValue]) => {
      const candidate = effectiveCssPropertyInBody(rule.body, property);
      const baseline = baselines.get(property);
      if (!candidate || !baseline || candidate.value === expectedValue) return false;
      if (candidate.important !== baseline.important) return candidate.important;
      const specificityOrder = compareCssSpecificity(
        candidateSpecificity,
        baselineSpecificity
      );
      if (specificityOrder !== 0) return specificityOrder > 0;
      return rule.sourceIndex > baseline.sourceIndex;
    });
  }));
}

function hasSharedMobileNavigationCss(rootDir) {
  const file = 'assets/css/site.css';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return false;

  const source = readUtf8(rootDir, file);
  const codeMask = buildCssCodeMask(source);
  const mediaPattern = new RegExp(
    `@media\\s*\\(\\s*max-width\\s*:\\s*${MOBILE_BREAKPOINT_PX}px\\s*\\)\\s*\\{`
  );

  const executableMobileBlocks = extractCssMediaBlocks(source, codeMask, mediaPattern)
    .map((block) => maskedSource(block.source, block.codeMask));
  const touchTargetContracts = [
    ['.brand', [['min-height', 'var(--header-h)']]],
    ['.button.small', [['min-height', '44px']]],
    ['.header-actions .icon-btn', [['width', '44px'], ['height', '44px']]],
    ['.drawer-header .icon-btn', [['width', '44px'], ['height', '44px']]],
    ['.back-to-top', [['width', '44px'], ['height', '44px']]],
    ['.lang-switch', [['min-height', '44px']]],
    ['.lang-switch a', [['min-width', '44px'], ['min-height', '44px']]]
  ];
  const hasTouchTargetContracts = (block) => {
    const ruleEntries = collectCssRuleEntries(block);
    return touchTargetContracts.every(([selector, declarations]) => (
      declarations.every(([property, expectedValue]) => (
        effectiveDirectCssProperty(block, selector, property, ruleEntries) === expectedValue
      ))
    ));
  };
  const hasCompleteMobileBlock = executableMobileBlocks.some((block) => {
    const ruleEntries = collectCssRuleEntries(block);
    return effectiveDirectCssDisplay(block, '.site-nav', ruleEntries) === 'none' &&
      effectiveDirectCssDisplay(block, '.menu-toggle', ruleEntries) === 'inline-flex' &&
      hasTouchTargetContracts(block);
  });
  const executableMobileCss = executableMobileBlocks.join('\n');
  if (!hasCompleteMobileBlock) return false;
  const combinedRuleEntries = collectCssRuleEntries(executableMobileCss);
  return effectiveDirectCssDisplay(
    executableMobileCss,
    '.site-nav',
    combinedRuleEntries
  ) === 'none' &&
    effectiveDirectCssDisplay(
      executableMobileCss,
      '.menu-toggle',
      combinedRuleEntries
    ) === 'inline-flex' &&
    hasTouchTargetContracts(executableMobileCss);
}

function hasResumeOverflowProtectionCss(rootDir) {
  const file = 'assets/css/site.css';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return false;

  const source = readUtf8(rootDir, file);
  const executableSource = maskedSource(source, buildCssCodeMask(source));
  const ruleEntries = collectCssRuleEntries(executableSource);
  const contracts = [
    [
      '.doc-grid > .doc-card',
      '#main-content .doc-grid > article.doc-card',
      [['min-width', '0']]
    ],
    [
      '.resume-sidebar .meta-list li',
      '#main-content .resume-sidebar .meta-list li',
      [['min-width', '0']]
    ],
    [
      '.resume-sidebar .meta-list li span',
      '#main-content .resume-sidebar .meta-list li span',
      [['min-width', '0'], ['overflow-wrap', 'anywhere']]
    ],
    [
      '.resume-sidebar .chip-list .tag',
      '#main-content .resume-sidebar .chip-list .tag',
      [['min-width', '0'], ['white-space', 'normal'], ['overflow-wrap', 'anywhere']]
    ],
    [
      '.resume-main .button.small',
      '#main-content .resume-main a.button.small.subtle',
      [['max-width', '100%'], ['white-space', 'normal']]
    ]
  ];

  return contracts.every(([selector, overlapSelector, declarations]) => (
    !hasConflictingCssPropertyRule(
      executableSource,
      selector,
      declarations,
      ruleEntries,
      overlapSelector
    ) &&
    declarations.every(([property, expectedValue]) => (
      effectiveDirectCssProperty(
        executableSource,
        selector,
        property,
        ruleEntries
      ) === expectedValue
    ))
  ));
}

function hasResumeTypographyCss(rootDir) {
  const file = 'assets/css/site.css';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return false;

  const source = readUtf8(rootDir, file);
  const executableSource = maskedSource(source, buildCssCodeMask(source));
  const ruleEntries = collectCssRuleEntries(executableSource);
  const contracts = [
    ['.resume-page', 'font-size', '16px'],
    ['.resume-service-section .resume-entry__heading h3', 'font-weight', '400'],
    ['.resume-service-section .resume-entry__heading > span', 'font-weight', '400']
  ];

  return contracts.every(([selector, property, expectedValue]) => (
    effectiveDirectCssProperty(
      executableSource,
      selector,
      property,
      ruleEntries
    ) === expectedValue
  ));
}

function hasUniformProofRailCss(rootDir) {
  const file = 'assets/css/site.css';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return false;

  const source = readUtf8(rootDir, file);
  const executableSource = maskedSource(source, buildCssCodeMask(source));
  const ruleEntries = collectCssRuleEntries(executableSource);
  const contracts = [
    [
      '.proof-grid',
      [['display', 'flex'], ['overflow-x', 'auto'], ['scroll-snap-type', 'x mandatory']]
    ],
    [
      '.proof-item',
      [
        ['flex', '0 0 min(78vw, 280px)'],
        ['height', '366px'],
        ['display', 'flex'],
        ['flex-direction', 'column']
      ]
    ],
    ['.proof-caption', [['flex', '1']]],
    ['.proof-grid.is-drag-scroll', [['cursor', 'grab']]],
    [
      '.proof-grid.is-drag-scroll.is-dragging',
      [['cursor', 'grabbing'], ['scroll-snap-type', 'none'], ['user-select', 'none']]
    ]
  ];

  if (!contracts.every(([selector, declarations]) => (
    declarations.every(([property, expectedValue]) => (
      effectiveDirectCssProperty(
        executableSource,
        selector,
        property,
        ruleEntries
      ) === expectedValue
    ))
  ))) {
    return false;
  }

  return !hasConflictingCssPropertyRule(
    executableSource,
    '.proof-item',
    [['flex', '0 0 min(78vw, 280px)']],
    ruleEntries,
    '#main-content .proof-grid a.proof-item'
  );
}

function hasProfileContactOverflowProtectionCss(rootDir) {
  const file = 'assets/css/site.css';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return false;

  const source = readUtf8(rootDir, file);
  const executableSource = maskedSource(source, buildCssCodeMask(source));
  const ruleEntries = collectCssRuleEntries(executableSource);
  const contracts = [
    ['.profile-body', [['min-width', '0']]],
    [
      '#overview .profile-body .inline-list .tag',
      [
        ['min-width', '0'],
        ['max-width', '100%'],
        ['white-space', 'normal'],
        ['overflow-wrap', 'anywhere']
      ]
    ],
    [
      '.summary-row .tag',
      [
        ['min-width', '0'],
        ['max-width', '100%'],
        ['white-space', 'normal'],
        ['overflow-wrap', 'anywhere']
      ]
    ]
  ];

  return contracts.every(([selector, declarations]) => (
    declarations.every(([property, expectedValue]) => (
      effectiveDirectCssProperty(
        executableSource,
        selector,
        property,
        ruleEntries
      ) === expectedValue
    ))
  ));
}

function hasStableProjectGridCss(rootDir) {
  const file = 'assets/css/site.css';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return false;

  const source = readUtf8(rootDir, file);
  const executableSource = maskedSource(source, buildCssCodeMask(source));
  const ruleEntries = collectCssRuleEntries(executableSource);
  const contracts = [
    [
      '.project-grid',
      [['--project-card-min', '22.5rem']],
      '.project-grid:not(.project-grid--featured)'
    ],
    [
      '.project-grid',
      [
        ['display', 'grid'],
        [
          'grid-template-columns',
          'repeat(auto-fit,minmax(min(100%,var(--project-card-min)),1fr))'
        ],
        ['gap', '20px'],
        ['align-items', 'stretch']
      ],
      '.project-grid:not(.project-grid--featured)'
    ],
    [
      '.project-grid',
      [
        ['display', 'grid'],
        [
          'grid-template-columns',
          'repeat(auto-fit,minmax(min(100%,var(--project-card-min)),1fr))'
        ],
        ['gap', '20px'],
        ['align-items', 'stretch']
      ],
      '.project-grid.project-grid--featured'
    ],
    [
      '.project-grid--featured',
      [['--project-card-min', '30rem']],
      '.project-grid--featured'
    ],
    [
      '.project-grid > .project-card',
      [['min-width', '0']],
      '#main-content .project-grid > article.project-card'
    ]
  ];

  return contracts.every(([selector, declarations, overlapSelector]) => (
    declarations.every(([property, expectedValue]) => (
      effectiveDirectCssProperty(
        executableSource,
        selector,
        property,
        ruleEntries
      ) === expectedValue
    )) &&
    !hasConflictingCssPropertyRule(
      executableSource,
      selector,
      declarations,
      ruleEntries,
      overlapSelector
    )
  ));
}

function hasHomeQuoteHierarchyCss(rootDir) {
  const file = 'assets/css/site.css';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return false;

  const source = readUtf8(rootDir, file);
  const executableSource = maskedSource(source, buildCssCodeMask(source));
  const ruleEntries = collectCssRuleEntries(executableSource);
  const contracts = [
    [
      '.main-shell > .section-block.tile-dark > .quote-block > .quote-text',
      [['color', 'var(--on-dark)']],
      '#main-content.main-shell > section.section-block.tile-dark.quote-band > blockquote.quote-block > p.quote-text'
    ],
    [
      '.main-shell > .section-block.tile-dark > .quote-block > .quote-source',
      [['color', 'var(--body-muted)']],
      '#main-content.main-shell > section.section-block.tile-dark.quote-band > blockquote.quote-block > footer.quote-source'
    ]
  ];

  const hasDirectContracts = contracts.every(([selector, declarations, overlapSelector]) => (
    declarations.every(([property, expectedValue]) => (
      effectiveDirectCssProperty(
        executableSource,
        selector,
        property,
        ruleEntries
      ) === expectedValue
    )) &&
    !hasConflictingCssPropertyRule(
      executableSource,
      selector,
      declarations,
      ruleEntries,
      overlapSelector
    )
  ));
  if (!hasDirectContracts) return false;
  return !ruleEntries.some((rule) => (
    rule.depth === 0 &&
    rule.selectors.includes('.main-shell>.section-block.tile-dark p') &&
    Boolean(effectiveCssPropertyInBody(rule.body, 'color'))
  ));
}

function hasPolishedMobileHomeHeroCss(rootDir) {
  const file = 'assets/css/site.css';
  const absolutePath = path.join(rootDir, file);
  if (!fs.existsSync(absolutePath)) return false;

  const source = readUtf8(rootDir, file);
  const codeMask = buildCssCodeMask(source);
  const executableCss = maskedSource(source, codeMask);
  if (/\.(?:home-hero|hero)(?![\w-])\s*>\s*[^,{]*:\s*nth-(?:child|of-type)\s*\(/.test(executableCss)) {
    return false;
  }
  const mediaPattern = /@media\s*\(\s*max-width\s*:\s*640px\s*\)\s*\{/;
  const executableMobileCss = extractCssMediaBlocks(source, codeMask, mediaPattern)
    .map((block) => maskedSource(block.source, block.codeMask))
    .join('\n');
  if (!executableMobileCss) return false;

  const baseRuleEntries = collectCssRuleEntries(executableCss);
  const baseContracts = [
    [
      '.home-quick-links',
      [
        ['display', 'grid'],
        ['grid-template-columns', 'repeat(2,minmax(0,1fr))'],
        ['gap', '8px']
      ]
    ],
    [
      '.home-quick-links .button',
      [
        ['min-width', '0'],
        ['padding-left', '10px'],
        ['padding-right', '10px'],
        ['white-space', 'normal'],
        ['text-wrap', 'wrap']
      ]
    ]
  ];
  const hasCompleteBaseRules = baseContracts.every(([selector, declarations]) => {
    const normalizedSelector = normalizeCssSelector(selector);
    const matchingRules = baseRuleEntries.filter((rule) => (
      rule.depth === 0 && rule.selectors.includes(normalizedSelector)
    ));
    return matchingRules.length === 1 && declarations.every(([property, expectedValue]) => {
      const declaration = effectiveCssPropertyInBody(matchingRules[0].body, property);
      return declaration && declaration.value === expectedValue;
    });
  });
  if (!hasCompleteBaseRules) return false;

  const ruleEntries = collectCssRuleEntries(executableMobileCss);
  const contracts = [
    [
      '.home-hero > .hero-side-surface',
      [['background-size', 'auto,48px 48px,48px 48px,auto']]
    ],
    [
      '.hero .hero-side',
      [
        ['--hero-rail-card', 'calc(100% - 56px)'],
        ['--hero-rail-gutter', '28px'],
        ['display', 'flex'],
        ['flex-direction', 'row'],
        ['align-items', 'stretch'],
        ['gap', '12px'],
        ['overflow-x', 'auto'],
        ['padding-left', '0'],
        ['padding-right', '0'],
        ['padding-top', '24px'],
        ['padding-bottom', '32px'],
        ['scroll-snap-type', 'x mandatory'],
        ['scroll-padding-inline', 'var(--hero-rail-gutter)'],
        ['overscroll-behavior-inline', 'contain'],
        ['scrollbar-width', 'none']
      ]
    ],
    ['.hero .hero-side::-webkit-scrollbar', [['display', 'none']]],
    [
      '.hero .hero-side > *',
      [
        ['box-sizing', 'border-box'],
        ['flex', '0 0 var(--hero-rail-card)'],
        ['height', 'auto'],
        ['min-height', '216px'],
        ['max-height', 'none'],
        ['border-radius', '14px'],
        ['box-shadow', 'var(--shadow-soft)'],
        ['scroll-snap-align', 'center'],
        ['scroll-snap-stop', 'always']
      ]
    ],
    [
      '.hero .hero-side > :first-child',
      [['margin-left', 'var(--hero-rail-gutter)']]
    ],
    [
      '.hero .hero-side > :last-child',
      [['margin-right', 'var(--hero-rail-gutter)']]
    ],
    [
      '.hero-side .profile-card',
      [
        ['grid-template-columns', 'clamp(60px, 18vw, 72px) minmax(0, 1fr)'],
        ['align-content', 'center'],
        ['padding', '14px 16px']
      ]
    ],
    [
      '.hero-side .profile-card .inline-list .tag',
      [
        ['max-width', '100%'],
        ['border', '0'],
        ['background', 'transparent'],
        ['white-space', 'normal'],
        ['overflow-wrap', 'anywhere']
      ]
    ],
    [
      '.hero-side .meta-card > p',
      [['min-width', '0'], ['overflow-wrap', 'anywhere']]
    ],
    [
      '.hero-side .home-quick-links .button',
      [['min-height', '44px'], ['font-size', '13px']]
    ]
  ];

  const completeRuleSelectors = new Set([
    normalizeCssSelector('.hero .hero-side'),
    normalizeCssSelector('.hero .hero-side > *')
  ]);
  const hasCompleteComponentRules = contracts
    .filter(([selector]) => completeRuleSelectors.has(normalizeCssSelector(selector)))
    .every(([selector, declarations]) => {
      const normalizedSelector = normalizeCssSelector(selector);
      const matchingRules = ruleEntries.filter((rule) => (
        rule.depth === 0 && rule.selectors.includes(normalizedSelector)
      ));
      return matchingRules.length === 1 && declarations.every(([property, expectedValue]) => {
        const declaration = effectiveCssPropertyInBody(matchingRules[0].body, property);
        return declaration && declaration.value === expectedValue;
      });
    });
  if (!hasCompleteComponentRules) return false;

  return contracts.every(([selector, declarations]) => (
    declarations.every(([property, expectedValue]) => (
      effectiveDirectCssProperty(
        executableMobileCss,
        selector,
        property,
        ruleEntries
      ) === expectedValue
    ))
  ));
}

const NOT_FOUND_VM_TIMEOUT_MS = 100;

function preservesNotFoundPageBehavior(handler) {
  if (!handler || handler.parameters.trim()) return false;

  const subjectSource = `'use strict';
globalThis.__notFoundSubject = function () {
${handler.source}
};`;
  const harnessSource = `
'use strict';
(function () {
  if (typeof require !== 'undefined' || typeof process !== 'undefined' ||
      typeof fs !== 'undefined') return false;

  var initNotFoundPage = globalThis.__notFoundSubject;
  delete globalThis.__notFoundSubject;
  var hasOwn = Function.call.bind(Object.prototype.hasOwnProperty);

  function createElement(initialAttributes, initialText, initialClasses) {
    var attributes = Object.create(null);
    Object.keys(initialAttributes || {}).forEach(function (name) {
      attributes[name] = String(initialAttributes[name]);
    });
    var classes = Object.create(null);
    (initialClasses || []).forEach(function (name) { classes[name] = true; });
    return {
      textContent: initialText || '',
      hasAttribute: function (name) { return hasOwn(attributes, String(name)); },
      getAttribute: function (name) {
        var key = String(name);
        return hasOwn(attributes, key) ? attributes[key] : null;
      },
      setAttribute: function (name, value) { attributes[String(name)] = String(value); },
      classList: {
        toggle: function (name, force) {
          var key = String(name);
          var present = arguments.length > 1 ? Boolean(force) : !hasOwn(classes, key);
          if (present) {
            classes[key] = true;
          } else {
            delete classes[key];
          }
          return present;
        },
        contains: function (name) { return hasOwn(classes, String(name)); }
      }
    };
  }

  function runOrdinaryPageScenario() {
    var root = { lang: 'en' };
    var unexpectedQueries = 0;
    var intervalCalls = 0;
    var originalLocation = {
      pathname: '/ordinary-page.html',
      search: '?keep=1',
      hash: '#section',
      href: 'https://example.test/ordinary-page.html?keep=1#section'
    };
    var locationState = {
      pathname: originalLocation.pathname,
      search: originalLocation.search,
      hash: originalLocation.hash,
      href: originalLocation.href
    };
    var locationWrites = [];
    var location = {};
    ['pathname', 'search', 'hash', 'href'].forEach(function (property) {
      Object.defineProperty(location, property, {
        configurable: true,
        enumerable: true,
        get: function () { return locationState[property]; },
        set: function (value) {
          var stringValue = String(value);
          locationWrites.push({ property: property, value: stringValue });
          locationState[property] = stringValue;
        }
      });
    });
    globalThis.document = {
      documentElement: root,
      querySelector: function (selector) {
        if (selector === '[data-not-found-page]') return null;
        unexpectedQueries += 1;
        return null;
      },
      querySelectorAll: function () {
        unexpectedQueries += 1;
        return [];
      }
    };
    var windowObject = {
      setInterval: function () {
        intervalCalls += 1;
        return intervalCalls;
      },
      clearInterval: function () {}
    };
    Object.defineProperty(windowObject, 'location', {
      configurable: true,
      enumerable: true,
      get: function () { return location; },
      set: function (value) {
        locationWrites.push({ property: 'location', value: String(value) });
      }
    });
    globalThis.window = windowObject;

    initNotFoundPage();
    return root.lang === 'en' && unexpectedQueries === 0 && intervalCalls === 0 &&
      locationWrites.length === 0 &&
      ['pathname', 'search', 'hash', 'href'].every(function (property) {
        return location[property] === originalLocation[property];
      });
  }

  function runScenario(pathname, expectedEnglish, localizable, initialLanguage) {
    var pageAttributes = { 'data-not-found-page': '' };
    if (localizable) pageAttributes['data-not-found-localizable'] = '';
    var page = createElement(pageAttributes);
    var localized = {
      text: createElement(
        { 'data-not-found-zh-text': '中文', 'data-not-found-en-text': 'English' },
        initialLanguage === 'en' ? 'English' : '中文'
      ),
      href: createElement({
        'data-not-found-zh-href': '/zh-target',
        'data-not-found-en-href': '/en-target'
      }),
      content: createElement({
        'data-not-found-zh-content': 'zh-content',
        'data-not-found-en-content': 'en-content'
      }),
      aria: createElement({
        'data-not-found-zh-aria-label': '中文标签',
        'data-not-found-en-aria-label': 'English label'
      }),
      dark: createElement({
        'data-not-found-zh-label-dark': '深色',
        'data-not-found-en-label-dark': 'Dark'
      }),
      light: createElement({
        'data-not-found-zh-label-light': '浅色',
        'data-not-found-en-label-light': 'Light'
      })
    };
    var languageLinks = [
      createElement({ lang: 'zh-CN' }, '', ['active']),
      createElement({ lang: 'en' })
    ];
    var countdown = createElement({ 'data-countdown': '' }, '99');
    var root = { lang: initialLanguage };
    var callbacks = [];
    var delays = [];
    var cleared = [];
    var originalHref = 'https://example.test' + pathname + '?keep=1#section';
    var locationState = {
      pathname: pathname,
      search: '?keep=1',
      hash: '#section',
      href: originalHref
    };
    var locationWrites = [];
    var location = {};
    ['pathname', 'search', 'hash', 'href'].forEach(function (property) {
      Object.defineProperty(location, property, {
        configurable: true,
        enumerable: true,
        get: function () { return locationState[property]; },
        set: function (value) {
          var stringValue = String(value);
          locationWrites.push({ property: property, value: stringValue });
          locationState[property] = stringValue;
        }
      });
    });
    var selectorMap = Object.create(null);
    selectorMap['[data-not-found-zh-text][data-not-found-en-text]'] = [localized.text];
    selectorMap['[data-not-found-zh-href][data-not-found-en-href]'] = [localized.href];
    selectorMap['[data-not-found-zh-content][data-not-found-en-content]'] = [localized.content];
    selectorMap['[data-not-found-zh-aria-label][data-not-found-en-aria-label]'] = [localized.aria];
    selectorMap['[data-not-found-zh-label-dark][data-not-found-en-label-dark]'] = [localized.dark];
    selectorMap['[data-not-found-zh-label-light][data-not-found-en-label-light]'] = [localized.light];
    selectorMap['.lang-switch a[lang]'] = languageLinks;

    globalThis.document = {
      documentElement: root,
      querySelector: function (selector) {
        if (selector === '[data-not-found-page]') return page;
        if (selector === '[data-countdown]') return countdown;
        return null;
      },
      querySelectorAll: function (selector) { return selectorMap[selector] || []; }
    };
    var windowObject = {
      setInterval: function (callback, delay) {
        callbacks.push(callback);
        delays.push(delay);
        return callbacks.length;
      },
      clearInterval: function (timer) { cleared.push(timer); }
    };
    Object.defineProperty(windowObject, 'location', {
      configurable: true,
      enumerable: true,
      get: function () { return location; },
      set: function (value) {
        locationWrites.push({ property: 'location', value: String(value) });
      }
    });
    globalThis.window = windowObject;

    initNotFoundPage();

    var expectedLanguage = expectedEnglish ? 'en' : 'zh-CN';
    var expectedHome = expectedEnglish ? '/en/' : '/';
    var expectedValues = expectedEnglish
      ? ['English', '/en-target', 'en-content', 'English label', 'Dark', 'Light']
      : ['中文', '/zh-target', 'zh-content', '中文标签', '深色', '浅色'];
    var actualValues = [
      localized.text.textContent,
      localized.href.getAttribute('href'),
      localized.content.getAttribute('content'),
      localized.aria.getAttribute('aria-label'),
      localized.dark.getAttribute('data-label-dark'),
      localized.light.getAttribute('data-label-light')
    ];
    var localizedValuesMatch = localizable
      ? actualValues.every(function (value, index) { return value === expectedValues[index]; })
      : true;
    if (
      root.lang !== expectedLanguage ||
      page.getAttribute('data-not-found-locale') !== expectedLanguage ||
      page.getAttribute('data-not-found-home') !== expectedHome ||
      !localizedValuesMatch ||
      languageLinks[0].classList.contains('active') === expectedEnglish ||
      languageLinks[1].classList.contains('active') !== expectedEnglish ||
      callbacks.length !== 1 || delays[0] !== 1000 ||
      String(countdown.textContent) !== '5' || location.href !== originalHref ||
      location.pathname !== pathname || location.search !== '?keep=1' ||
      location.hash !== '#section' || locationWrites.length !== 0
    ) {
      return false;
    }

    for (var tick = 0; tick < 4; tick += 1) callbacks[0]();
    if (
      String(countdown.textContent) !== '1' || location.href !== originalHref ||
      location.pathname !== pathname || location.search !== '?keep=1' ||
      location.hash !== '#section' || locationWrites.length !== 0 || cleared.length
    ) {
      return false;
    }
    callbacks[0]();
    return String(countdown.textContent) === '0' && location.href === expectedHome &&
      locationWrites.length === 1 && locationWrites[0].property === 'href' &&
      locationWrites[0].value === expectedHome &&
      cleared.length === 1 && cleared[0] === 1;
  }

  return [
    runOrdinaryPageScenario(),
    runScenario('/missing', false, true, 'zh-CN'),
    runScenario('/deep/missing', false, true, 'zh-CN'),
    runScenario('/enough/missing', false, true, 'zh-CN'),
    runScenario('/en-US/missing', false, true, 'zh-CN'),
    runScenario('/foo/en/missing', false, true, 'zh-CN'),
    runScenario('/en', true, true, 'zh-CN'),
    runScenario('/en/missing', true, true, 'zh-CN'),
    runScenario('/en/deep/missing', true, true, 'zh-CN'),
    runScenario('/en/404.html', true, false, 'en')
  ].every(Boolean);
})()`;

  try {
    const context = vm.createContext(Object.create(null), {
      codeGeneration: { strings: false, wasm: false }
    });
    new vm.Script(subjectSource, {
      filename: 'assets/js/site.js#initNotFoundPage'
    }).runInContext(context, { timeout: NOT_FOUND_VM_TIMEOUT_MS });
    return new vm.Script(harnessSource).runInContext(context, {
      timeout: NOT_FOUND_VM_TIMEOUT_MS
    }) === true;
  } catch (_error) {
    return false;
  }
}

const MODAL_INERT_VM_TIMEOUT_MS = 100;

function preservesModalInertBehavior(inertHandler) {
  if (!inertHandler) return false;

  const parameters = /^\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*$/.exec(
    inertHandler.parameters
  );
  if (!parameters) return false;

  const subjectSource = `'use strict';
globalThis.__modalInertSubject = function (${parameters[1]}, ${parameters[2]}) {
${inertHandler.source}
};`;
  const harnessSource = `
'use strict';
(function () {
  if (typeof require !== 'undefined' || typeof process !== 'undefined' ||
      typeof fs !== 'undefined') return false;

  const setElementInert = globalThis.__modalInertSubject;
  delete globalThis.__modalInertSubject;
  const createObject = Object.create;
  const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty);
  const toBoolean = Boolean;
  const toString = String;

  function createFakeElement(initialAria, initialInertAttribute, initialInertProperty) {
    const attributes = createObject(null);
    if (initialAria !== null) attributes['aria-hidden'] = initialAria;
    if (initialInertAttribute) attributes.inert = '';

    const element = createObject(null);
    element.inert = initialInertProperty;
    element.hasAttribute = function (name) { return hasOwn(attributes, toString(name)); };
    element.getAttribute = function (name) {
      const key = toString(name);
      return hasOwn(attributes, key) ? attributes[key] : null;
    };
    element.setAttribute = function (name, value) { attributes[toString(name)] = toString(value); };
    element.removeAttribute = function (name) { delete attributes[toString(name)]; };
    element.toggleAttribute = function (name, force) {
      const key = toString(name);
      const present = arguments.length > 1 ? toBoolean(force) : !hasOwn(attributes, key);
      if (present) {
        attributes[key] = '';
      } else {
        delete attributes[key];
      }
      return present;
    };

    return {
      element,
      getAttribute: element.getAttribute,
      hasAttribute: element.hasAttribute
    };
  }

  function hasNoModalMarkers(fixture) {
    return !fixture.hasAttribute('data-modal-inert') &&
      !fixture.hasAttribute('data-modal-aria-hidden') &&
      !fixture.hasAttribute('data-modal-was-inert');
  }

  function matchesActiveState(fixture) {
    return fixture.getAttribute('aria-hidden') === 'true' &&
      fixture.hasAttribute('inert') && fixture.element.inert === true;
  }

  function matchesState(fixture, aria, inertAttribute, inertProperty) {
    return fixture.hasAttribute('aria-hidden') === (aria !== null) &&
      fixture.getAttribute('aria-hidden') === aria &&
      fixture.hasAttribute('inert') === inertAttribute &&
      fixture.element.inert === inertProperty &&
      hasNoModalMarkers(fixture);
  }

  function runCycle(fixture, initialAria, expectedInert) {
    setElementInert(fixture.element, true);
    if (!matchesActiveState(fixture)) return false;
    setElementInert(fixture.element, true);
    if (!matchesActiveState(fixture)) return false;
    setElementInert(fixture.element, false);
    if (!matchesState(fixture, initialAria, expectedInert, expectedInert)) return false;
    setElementInert(fixture.element, false);
    return matchesState(fixture, initialAria, expectedInert, expectedInert);
  }

  const finalChecks = [];
  function rememberFinalState(fixture, aria, expectedInert) {
    finalChecks[finalChecks.length] = function () {
      return matchesState(fixture, aria, expectedInert, expectedInert);
    };
  }

  function runScenario(initialAria, initialInertAttribute, initialInertProperty) {
    const fixture = createFakeElement(initialAria, initialInertAttribute, initialInertProperty);
    const expectedInert = initialInertAttribute || initialInertProperty;
    const passed = matchesState(
      fixture, initialAria, initialInertAttribute, initialInertProperty
    ) &&
      runCycle(fixture, initialAria, expectedInert) &&
      runCycle(fixture, initialAria, expectedInert);
    rememberFinalState(fixture, initialAria, expectedInert);
    return passed;
  }

  function runInterleavedScenario() {
    const first = createFakeElement(null, false, false);
    const second = createFakeElement('true', true, true);
    const initialStatesMatch = matchesState(first, null, false, false) &&
      matchesState(second, 'true', true, true);
    setElementInert(first.element, true);
    const firstActivated = matchesActiveState(first);
    setElementInert(second.element, true);
    const secondActivated = matchesActiveState(second);
    setElementInert(first.element, false);
    const firstRestored = matchesState(first, null, false, false);
    setElementInert(second.element, false);
    const secondRestored = matchesState(second, 'true', true, true);
    rememberFinalState(first, null, false);
    rememberFinalState(second, 'true', true);
    return initialStatesMatch && firstActivated && secondActivated &&
      firstRestored && secondRestored;
  }

  const passed = runScenario(null, false, false) &&
    runScenario('true', true, true) &&
    runScenario('false', false, false) &&
    runScenario(null, true, false) &&
    runScenario(null, false, true) &&
    runInterleavedScenario();
  globalThis.__modalInertFinalCheck = function () {
    if (!passed) return false;
    for (let index = 0; index < finalChecks.length; index += 1) {
      if (!finalChecks[index]()) return false;
    }
    return true;
  };
  return globalThis.__modalInertFinalCheck();
})()
`;
  const finalCheckSource = `
'use strict';
(function () {
  const verify = globalThis.__modalInertFinalCheck;
  delete globalThis.__modalInertFinalCheck;
  return typeof verify === 'function' && verify();
})()
`;

  try {
    const context = vm.createContext(Object.create(null), {
      codeGeneration: { strings: false, wasm: false },
      microtaskMode: 'afterEvaluate'
    });
    new vm.Script(subjectSource, {
      filename: 'assets/js/site.js#setElementInert'
    }).runInContext(context, { timeout: MODAL_INERT_VM_TIMEOUT_MS });
    const passed = new vm.Script(harnessSource, {
      filename: 'modal-inert-contract.vm.js'
    }).runInContext(context, { timeout: MODAL_INERT_VM_TIMEOUT_MS });
    if (passed !== true) return false;
    return new vm.Script(finalCheckSource, {
      filename: 'modal-inert-final-check.vm.js'
    }).runInContext(context, { timeout: MODAL_INERT_VM_TIMEOUT_MS }) === true;
  } catch {
    return false;
  }
}

function validateMobileNavigationCssContract(rootDir, issues) {
  if (!hasSharedMobileNavigationCss(rootDir)) {
    addIssue(issues, 'assets/css/site.css', MOBILE_CSS_BREAKPOINT_ISSUE);
  }
}

function validateResumeOverflowCssContract(rootDir, issues) {
  if (!hasResumeOverflowProtectionCss(rootDir)) {
    addIssue(issues, 'assets/css/site.css', RESUME_OVERFLOW_CSS_ISSUE);
  }
}

function validateResumeTypographyCssContract(rootDir, issues) {
  if (!hasResumeTypographyCss(rootDir)) {
    addIssue(issues, 'assets/css/site.css', RESUME_TYPOGRAPHY_CSS_ISSUE);
  }
}

function validateProofRailCssContract(rootDir, issues) {
  if (!hasUniformProofRailCss(rootDir)) {
    addIssue(issues, 'assets/css/site.css', PROOF_RAIL_CSS_ISSUE);
  }
}

function validateProfileContactCssContract(rootDir, issues) {
  if (!hasProfileContactOverflowProtectionCss(rootDir)) {
    addIssue(issues, 'assets/css/site.css', PROFILE_CONTACT_CSS_ISSUE);
  }
}

function validateMobileHomeHeroCssContract(rootDir, issues) {
  if (!hasPolishedMobileHomeHeroCss(rootDir)) {
    addIssue(issues, 'assets/css/site.css', HOME_HERO_MOBILE_CSS_ISSUE);
  }
}

function validateProjectGridCssContract(rootDir, issues) {
  if (!hasStableProjectGridCss(rootDir)) {
    addIssue(issues, 'assets/css/site.css', PROJECT_GRID_CSS_ISSUE);
  }
}

function validateHomeQuoteCssContract(rootDir, issues) {
  if (!hasHomeQuoteHierarchyCss(rootDir)) {
    addIssue(issues, 'assets/css/site.css', HOME_QUOTE_CSS_ISSUE);
  }
}

function preservesProofRailDragBehavior(handler) {
  if (!handler) return false;

  const listeners = new Map();
  const classes = new Set();
  const timers = [];
  let capturedPointer = null;
  let releasedPointer = null;
  const rail = {
    scrollLeft: 120,
    classList: {
      add(value) { classes.add(value); },
      remove(value) { classes.delete(value); },
      contains(value) { return classes.has(value); }
    },
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(callback);
    },
    setPointerCapture(pointerId) {
      capturedPointer = pointerId;
    },
    hasPointerCapture(pointerId) {
      return capturedPointer === pointerId;
    },
    releasePointerCapture(pointerId) {
      if (capturedPointer === pointerId) capturedPointer = null;
      releasedPointer = pointerId;
    }
  };
  const context = vm.createContext({
    document: {
      querySelectorAll(selector) {
        return selector === '.proof-grid' ? [rail] : [];
      }
    },
    window: {
      PointerEvent: function PointerEvent() {},
      setTimeout(callback) {
        timers.push(callback);
        return timers.length;
      }
    }
  }, {
    codeGeneration: { strings: false, wasm: false },
    microtaskMode: 'afterEvaluate'
  });
  const source = `'use strict';\n(function () {\n${handler.source}\n})()`;

  function event(overrides = {}) {
    return {
      button: 0,
      buttons: 1,
      pointerType: 'mouse',
      pointerId: 7,
      clientX: 200,
      defaultPrevented: false,
      immediatePropagationStopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.immediatePropagationStopped = true; },
      ...overrides
    };
  }

  function dispatch(type, value) {
    for (const callback of listeners.get(type) || []) callback(value);
  }

  try {
    new vm.Script(source, {
      filename: 'assets/js/site.js#initProofRails'
    }).runInContext(context, { timeout: 100 });

    if (!classes.has('is-drag-scroll')) return false;

    dispatch('pointerdown', event({ pointerType: 'touch', pointerId: 2 }));
    if (capturedPointer !== null || classes.has('is-dragging')) return false;

    dispatch('pointerdown', event());
    if (capturedPointer !== null || classes.has('is-dragging')) return false;

    const smallMove = event({ clientX: 197 });
    dispatch('pointermove', smallMove);
    if (smallMove.defaultPrevented || rail.scrollLeft !== 120) return false;

    const dragMove = event({ clientX: 150 });
    dispatch('pointermove', dragMove);
    if (
      !dragMove.defaultPrevented ||
      rail.scrollLeft !== 170 ||
      capturedPointer !== 7 ||
      !classes.has('is-dragging')
    ) {
      return false;
    }

    dispatch('pointerup', event({ clientX: 150 }));
    if (classes.has('is-dragging') || capturedPointer !== null || releasedPointer !== 7) {
      return false;
    }

    const suppressedClick = event();
    dispatch('click', suppressedClick);
    if (!suppressedClick.defaultPrevented || !suppressedClick.immediatePropagationStopped) {
      return false;
    }

    for (const callback of timers.splice(0)) callback();
    const laterClick = event();
    dispatch('click', laterClick);
    if (laterClick.defaultPrevented || laterClick.immediatePropagationStopped) return false;

    const simpleDown = event({ pointerId: 8, clientX: 90 });
    dispatch('pointerdown', simpleDown);
    dispatch('pointerup', event({ pointerId: 8, clientX: 90 }));
    const simpleClick = event({ pointerId: 8, clientX: 90 });
    dispatch('click', simpleClick);
    if (simpleClick.defaultPrevented || simpleClick.immediatePropagationStopped) return false;

    const nativeDrag = event();
    dispatch('dragstart', nativeDrag);
    return nativeDrag.defaultPrevented;
  } catch {
    return false;
  }
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
  const inertHandler = extractNamedFunctionBody(
    source,
    codeMask,
    'setElementInert',
    true
  );
  const closeLightboxHandler = extractNamedFunctionBody(
    source,
    codeMask,
    'closeLightbox',
    true
  );
  const openLightboxHandler = extractNamedFunctionBody(
    source,
    codeMask,
    'openLightbox',
    true
  );
  const notFoundHandler = extractNamedFunctionBody(
    source,
    codeMask,
    'initNotFoundPage',
    true
  );
  const proofRailHandler = extractNamedFunctionBody(
    source,
    codeMask,
    'initProofRails',
    true
  );
  const hasMobileMenuQuery = hasExecutableMatch(
    source,
    codeMask,
    new RegExp(
      `^[\\t ]*var\\s+mobileMenuQuery\\s*=\\s*window\\.matchMedia\\(\\s*` +
      `(['"])\\(max-width:\\s*${MOBILE_BREAKPOINT_PX}px\\)\\1\\s*\\)\\s*;`,
      'm'
    )
  );
  const hasMenuBreakpointHandler = handler !== null;
  const initializesProofRails = hasExecutableMatch(
    source,
    codeMask,
    /^[\t ]*initProofRails\(\)\s*;/m
  );
  const hasMobileMenuListener = hasExecutableMatch(
    source,
    codeMask,
    /^[\t ]*mobileMenuQuery\.(?:addEventListener\(\s*['"]change['"]\s*,\s*handleMenuBreakpointChange\s*\)|addListener\(\s*handleMenuBreakpointChange\s*\))\s*;/m
  );
  const mobileExitGateMatch = handler !== null && findExecutableMatch(
    handler.source,
    handler.codeMask,
    /^[\t ]*if\s*\(\s*event\.matches\s*\|\|\s*!document\.body\.classList\.contains\(\s*(['"])menu-open\1\s*\)\s*\)\s*return\s*;/m
  );
  const closeMenuMatch = handler !== null && findExecutableMatch(
    handler.source,
    handler.codeMask,
    /^[\t ]*closeMenu\(\s*false\s*\)\s*;/m
  );
  const hasMobileExitGate = Boolean(
    handler &&
    mobileExitGateMatch &&
    executableBraceDepthAt(handler.source, handler.codeMask, mobileExitGateMatch.index) === 0
  );
  const closesWithoutHiddenToggleFocus = Boolean(
    handler &&
    mobileExitGateMatch &&
    closeMenuMatch &&
    executableBraceDepthAt(handler.source, handler.codeMask, closeMenuMatch.index) === 0 &&
    mobileExitGateMatch.index < closeMenuMatch.index
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
    !hasMobileMenuQuery ||
    !hasMenuBreakpointHandler ||
    !hasMobileMenuListener ||
    !hasMobileExitGate ||
    !closesWithoutHiddenToggleFocus ||
    !hasVisibleDesktopFocusFallback
  ) {
    addIssue(issues, file, MOBILE_MENU_CLEANUP_ISSUE);
  }

  const executableSource = maskedSource(source, codeMask);
  const notFoundCalls = Array.from(
    executableSource.matchAll(/\binitNotFoundPage\s*\(\s*\)\s*;/g)
  );
  const themeCalls = Array.from(executableSource.matchAll(/\binitTheme\s*\(\s*\)\s*;/g));
  const hasOrderedNotFoundInitialization = notFoundCalls.length === 1 &&
    themeCalls.length === 1 &&
    notFoundCalls[0].index < themeCalls[0].index &&
    executableBraceDepthAt(source, codeMask, notFoundCalls[0].index) ===
      executableBraceDepthAt(source, codeMask, themeCalls[0].index);
  const notFoundHandlerTail = notFoundHandler && notFoundHandler.declarationEnd < source.length
    ? {
        codeMask: codeMask.slice(notFoundHandler.declarationEnd),
        source: source.slice(notFoundHandler.declarationEnd)
      }
    : null;
  const reassignsNotFoundHandler = notFoundHandlerTail !== null && hasExecutableBindingAssignment(
    notFoundHandlerTail.source,
    notFoundHandlerTail.codeMask,
    'initNotFoundPage'
  );

  if (
    !preservesNotFoundPageBehavior(notFoundHandler) ||
    !hasOrderedNotFoundInitialization ||
    reassignsNotFoundHandler
  ) {
    addIssue(issues, file, NOT_FOUND_LOCALIZATION_ISSUE);
  }

  const closesLightboxBackground = closeLightboxHandler !== null &&
    hasExecutableMatch(
      closeLightboxHandler.source,
      closeLightboxHandler.codeMask,
      /^[\t ]*setBackgroundInert\(\s*false\s*\)\s*;/m
    );
  const opensLightboxBackground = openLightboxHandler !== null &&
    hasExecutableMatch(
      openLightboxHandler.source,
      openLightboxHandler.codeMask,
      /^[\t ]*setBackgroundInert\(\s*true\s*,\s*\[\s*overlay\s*\]\s*\)\s*;/m
    );
  const inertHandlerTail = inertHandler && inertHandler.declarationEnd < source.length
    ? {
        codeMask: codeMask.slice(inertHandler.declarationEnd),
        source: source.slice(inertHandler.declarationEnd)
      }
    : null;
  const reassignsInertHandler = inertHandlerTail !== null && hasExecutableBindingAssignment(
    inertHandlerTail.source,
    inertHandlerTail.codeMask,
    'setElementInert'
  );

  if (
    !preservesModalInertBehavior(inertHandler) ||
    !closesLightboxBackground ||
    !opensLightboxBackground ||
    reassignsInertHandler
  ) {
    addIssue(
      issues,
      file,
      'modal background cleanup must restore each element\'s pre-existing inert state'
    );
  }

  if (!initializesProofRails || !preservesProofRailDragBehavior(proofRailHandler)) {
    addIssue(issues, file, PROOF_RAIL_DRAG_ISSUE);
  }
}

function validateRepository(rootDir) {
  const absoluteRoot = path.resolve(rootDir);
  const issues = [];
  const anchorCache = new Map();
  const fileSystemCache = {
    directoryNames: new Map(),
    entries: new Map()
  };
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
    validateDocumentStructure(
      absoluteRoot,
      page.file,
      html,
      page.lang,
      issues,
      fileSystemCache
    );
    validateLocalReferences(
      absoluteRoot,
      page.file,
      html,
      issues,
      anchorCache,
      fileSystemCache
    );
    const structuredData = validateStructuredDataPage(page, html, issues);
    if (structuredData) structuredDataRecords.push(structuredData);
    validateIndexableMetadata(page, html, issues);
  }

  validateStructuredDataConsistency(structuredDataRecords, issues);
  validateHomeQuotationCopies(absoluteRoot, issues);
  validateHomeStructure(absoluteRoot, issues);
  validateEnglishTerminology(absoluteRoot, issues);
  validateProfileContacts(absoluteRoot, issues);
  validateProfileModelingAward(absoluteRoot, issues);
  validateProfileKtvFacts(absoluteRoot, issues);
  validateResumeContentContract(absoluteRoot, issues);
  validateResumePdfSourceContract(absoluteRoot, issues);

  for (const page of NOT_FOUND_PAGES) {
    if (!existingHtml.has(page.file)) continue;
    const html = readUtf8(absoluteRoot, page.file);
    validateDocumentStructure(
      absoluteRoot,
      page.file,
      html,
      page.lang,
      issues,
      fileSystemCache
    );
    validateLocalReferences(
      absoluteRoot,
      page.file,
      html,
      issues,
      anchorCache,
      fileSystemCache
    );
    validateNotFoundStructuredData(page, html, issues);
    validateNotFoundMetadata(page, html, issues);
    validateNotFoundLocalizationMarkup(
      absoluteRoot,
      page,
      html,
      issues,
      fileSystemCache
    );
  }

  validateCssReferences(absoluteRoot, issues, anchorCache, fileSystemCache);
  for (const contract of MANIFEST_CONTRACTS) {
    validateManifest(
      absoluteRoot,
      contract,
      issues,
      anchorCache,
      fileSystemCache
    );
  }
  validateBrandMarkAsset(absoluteRoot, issues);
  validateInstallIconAssets(absoluteRoot, issues);
  validateFavicon(absoluteRoot, issues);
  const sitemapUrls = validateSitemap(absoluteRoot, issues);
  validateRobots(absoluteRoot, issues);
  validateJavaScriptSyntax(absoluteRoot, issues);
  validateStatsJavaScriptContracts(absoluteRoot, issues);
  validateMobileNavigationCssContract(absoluteRoot, issues);
  validateResumeOverflowCssContract(absoluteRoot, issues);
  validateResumeTypographyCssContract(absoluteRoot, issues);
  validateProfileContactCssContract(absoluteRoot, issues);
  validateProofRailCssContract(absoluteRoot, issues);
  validateProjectGridCssContract(absoluteRoot, issues);
  validateHomeQuoteCssContract(absoluteRoot, issues);
  validateMobileHomeHeroCssContract(absoluteRoot, issues);
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

function runCli(
  rootDir = path.resolve(__dirname, '..'),
  output = { error: console.error, log: console.log }
) {
  const result = validateRepository(rootDir);
  if (result.issues.length > 0) {
    output.error(`Site validation failed with ${result.issues.length} issue(s):`);
    for (const issue of result.issues) output.error(`- ${issue}`);
    return 1;
  }
  output.log(
    `Site validation passed: ${result.summary.htmlFiles} HTML files, ` +
    `${result.summary.indexablePages} indexable pages, ` +
    `${result.summary.sitemapUrls} sitemap URLs.`
  );
  return 0;
}

if (require.main === module) process.exitCode = runCli();

module.exports = {
  resolveLocalReference,
  runCli,
  stripUrlDecorations,
  validateRepository
};
