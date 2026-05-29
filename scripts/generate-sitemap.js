const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const siteUrl = 'https://yan-shibo.github.io';

const pagePairs = [
  ['/', 'en/'],
  ['profile.html', 'en/profile.html'],
  ['research.html', 'en/research.html'],
  ['projects.html', 'en/projects.html'],
  ['resume.html', 'en/resume.html'],
  ['analytics.html', 'en/analytics.html']
];

function toUrl(route) {
  return route === '/' ? siteUrl + '/' : siteUrl + '/' + route;
}

function localDate(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function routeToFile(route) {
  if (route === '/') return 'index.html';
  if (route.endsWith('/')) return route + 'index.html';
  return route;
}

function fileLastmod(route) {
  const file = routeToFile(route);
  const pageMtime = fs.statSync(path.join(rootDir, file)).mtime;
  return localDate(pageMtime);
}

function entry(route, zhRoute, enRoute) {
  return [
    '  <url>',
    `    <loc>${toUrl(route)}</loc>`,
    `    <lastmod>${fileLastmod(route)}</lastmod>`,
    `    <xhtml:link rel="alternate" hreflang="zh-CN" href="${toUrl(zhRoute)}" />`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${toUrl(enRoute)}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${toUrl(zhRoute)}" />`,
    '  </url>'
  ].join('\n');
}

const entries = pagePairs.flatMap(([zhRoute, enRoute]) => {
  return [
    entry(zhRoute, zhRoute, enRoute),
    entry(enRoute, zhRoute, enRoute)
  ];
});

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  entries.join('\n'),
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), xml, 'utf8');
