import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_URL = 'https://jalisalkulayni-maker.github.io/jal5is';
const MAX_URLS_PER_SITEMAP = 45000;

const MANIFEST_RE = /^manifest(?:_[^.]*)?\.json$/i;
const IGNORED_DIRS = new Set(['.git', '.github', 'node_modules', 'seo', '_site']);

function normalizeArabic(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670ـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stripHtml(html) {
  return String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippet(text, max = 180) {
  const t = stripHtml(text);
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

function slugify(value, fallback = 'item') {
  let s = normalizeArabic(value)
    .toLowerCase()
    .replace(/[^\u0600-\u06ffa-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return s || fallback;
}

function stableHash(value) {
  let h = 2166136261;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

async function walkJsonFiles(dir, rel = '') {
  const out = [];
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      out.push(...await walkJsonFiles(path.join(dir, entry.name), path.join(rel, entry.name)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      out.push({ abs: path.join(dir, entry.name), rel: path.join(rel, entry.name).replaceAll('\\', '/') });
    }
  }
  return out;
}

async function readJson(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    return JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch { return null; }
}

function normalizeManifest(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out = {};
    raw.forEach((book, i) => {
      if (!book || typeof book !== 'object') return;
      const id = String(book.id || book.book_id || book.slug || `book_${i + 1}`);
      out[id] = book;
    });
    return out;
  }
  if (raw.books && typeof raw.books === 'object') return normalizeManifest(raw.books);
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return normalizeManifest(raw.data);
  if (typeof raw === 'object') return raw;
  return {};
}

function getTitle(book, id) {
  return String(book?.title || book?.name || book?.book_title || id || 'كتاب').trim();
}

function getAuthor(book) {
  return String(book?.author || book?.writer || book?.authors || book?.author_name || '').trim();
}

function getCategory(book) {
  return String(book?.category || book?.section || book?.topic || '').trim();
}

function getToc(book) {
  return Array.isArray(book?.toc) ? book.toc : [];
}

function pageNumber(page, index) {
  const n = Number(page?.page_number ?? page?.page ?? index + 1);
  return Number.isFinite(n) ? n : index + 1;
}

function firstTextFromPage(page) {
  if (!page) return '';
  if (typeof page === 'string') return snippet(page);
  return snippet(page.content || page.text || page.html || page.body || '');
}

function mergeBook(target, incoming) {
  if (!incoming || typeof incoming !== 'object') return target;
  if (!target) return { ...incoming };
  const out = { ...target, ...incoming };
  for (const key of ['pages', 'toc']) {
    if (Array.isArray(target[key]) && !Array.isArray(incoming[key])) out[key] = target[key];
  }
  if (target.cover && !incoming.cover) out.cover = target.cover;
  return out;
}

function candidateLocalPaths(book, id, jsonFiles) {
  const c = [];
  for (const key of ['json_url','url','json','file','file_path','path','src']) {
    const v = book?.[key];
    if (typeof v === 'string' && /\.json(?:$|\?)/i.test(v)) {
      const clean = v.split('?')[0].replace(/^\.\//, '');
      c.push(clean);
      c.push(clean.replaceAll('/', path.sep));
    }
  }
  const exactNames = new Set([`${id}.json`, `${id.replace(/_[0-9]+$/, '')}.json`]);
  for (const f of jsonFiles) if (exactNames.has(path.basename(f.rel))) c.push(f.rel);
  return [...new Set(c)];
}

function findFileByRel(jsonFiles, rel) {
  const key = rel.replaceAll('\\', '/').replace(/^\.\//, '');
  return jsonFiles.find(f => f.rel === key || f.rel.endsWith('/' + key));
}

function resolveDataObject(book, id, jsonFiles, byRel) {
  if (book?.pages || book?.content || book?.text) return book;
  for (const rel of candidateLocalPaths(book, id, jsonFiles)) {
    const f = byRel.get(rel.replaceAll('\\', '/')) || findFileByRel(jsonFiles, rel);
    if (f) return { __file: f.abs };
  }
  return null;
}

function bookSchema(book, url) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: getTitle(book, book.id),
    inLanguage: 'ar',
    url,
  };
  const author = getAuthor(book);
  if (author) data.author = { '@type': 'Person', name: author };
  return data;
}

function htmlDoc({ title, description, canonical, body, schema }) {
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const schemaText = JSON.stringify(schema ?? {}, null, 2).replace(/<\//g, '<\\/');
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:locale" content="ar_IQ">
<meta property="og:site_name" content="جليس الكليني">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDesc}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<style>
body{margin:0;background:#07100c;color:#f4edda;font-family:Arial,"Noto Naskh Arabic",sans-serif;line-height:2}
main{max-width:920px;margin:auto;padding:32px 18px 80px}
header{border-bottom:1px solid rgba(212,175,55,.28);padding-bottom:18px;margin-bottom:22px}
h1{font-size:clamp(24px,5vw,38px);line-height:1.5;margin:0 0 12px;color:#f5d77f}
h2{color:#f5d77f;margin-top:32px}
.meta{color:#b8b0a0;font-size:14px}
.content{background:#0c1712;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px;overflow:auto}
.content img{max-width:100%;height:auto}.content a{color:#f5d77f}
nav{margin-top:24px;display:flex;gap:10px;flex-wrap:wrap}nav a{display:inline-block;padding:8px 12px;border:1px solid rgba(212,175,55,.3);border-radius:9px;color:#f5d77f;text-decoration:none}
footer{margin-top:30px;color:#8f988f;font-size:12px;text-align:center}
</style>
<script type="application/ld+json">${schemaText}</script>
</head>
<body><main>${body}<footer>خزانة علوم العترة — جليس الكليني</footer></main></body></html>`;
}

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }
async function writeFile(file, content) { await ensureDir(path.dirname(file)); await fs.writeFile(file, content, 'utf8'); }

async function main() {
  const jsonFiles = await walkJsonFiles(ROOT);
  const byRel = new Map(jsonFiles.map(f => [f.rel, f]));
  const manifestFiles = jsonFiles.filter(f => MANIFEST_RE.test(path.basename(f.rel)));
  const books = new Map();

  for (const mf of manifestFiles) {
    const raw = await readJson(mf.abs);
    const normalized = normalizeManifest(raw);
    for (const [id, incoming] of Object.entries(normalized)) {
      books.set(String(id), mergeBook(books.get(String(id)), { ...incoming, id: String(id) }));
    }
  }

  // Fallback: detect book-like JSON documents even if a manifest is incomplete.
  for (const f of jsonFiles) {
    if (MANIFEST_RE.test(path.basename(f.rel))) continue;
    const raw = await readJson(f.abs);
    if (!raw || typeof raw !== 'object') continue;
    if (Array.isArray(raw.pages) || raw.title || raw.book_title) {
      const id = String(raw.id || raw.book_id || path.basename(f.rel, '.json'));
      books.set(id, mergeBook(books.get(id), { ...raw, id, __sourceFile: f.abs }));
    }
  }

  const generated = [];
  const usedSlugs = new Set();
  const bookRows = [];
  const authorMap = new Map();
  const topicMap = new Map();

  for (const dir of ['books','pages','authors','topics']) { await fs.mkdir(path.join(ROOT, dir), { recursive: true }); }
  // لا نحذف ملفات المكتبة الأصلية؛ نكتب فقط داخل المجلدات المخصصة للصفحات المولدة.
  const generatedDirs = [path.join(ROOT,'pages'), path.join(ROOT,'authors'), path.join(ROOT,'topics')];
  for (const dir of generatedDirs) await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(path.join(ROOT,'books'), { recursive: true });

  for (const [id, rawBook] of [...books.entries()].sort((a,b) => getTitle(a[1],a[0]).localeCompare(getTitle(b[1],b[0]), 'ar'))) {
    let book = { ...rawBook };
    const resolved = resolveDataObject(book, id, jsonFiles, byRel);
    if (resolved?.__file) {
      const local = await readJson(resolved.__file);
      if (local) book = mergeBook(book, local);
    }

    const title = getTitle(book, id);
    let baseSlug = slugify(title, slugify(id, 'book'));
    let slug = baseSlug;
    if (usedSlugs.has(slug)) slug = `${baseSlug}-${stableHash(id)}`;
    usedSlugs.add(slug);

    const bookUrl = `${BASE_URL}/books/${encodeURIComponent(slug)}/`;
    const author = getAuthor(book);
    const category = getCategory(book);
    if (author) {
      const key = author; if (!authorMap.has(key)) authorMap.set(key, []); authorMap.get(key).push({title, url:bookUrl});
    }
    if (category) {
      const key = category; if (!topicMap.has(key)) topicMap.set(key, []); topicMap.get(key).push({title, url:bookUrl});
    }

    const pages = Array.isArray(book.pages) ? [...book.pages].sort((a,b)=>pageNumber(a,0)-pageNumber(b,0)) : [];
    const toc = getToc(book);
    const tocHtml = toc.slice(0, 80).map(t => `<li>${escapeHtml(t?.title || t?.name || '')}${t?.page_number ? ` — ص ${escapeHtml(t.page_number)}` : ''}</li>`).join('');
    const pageSamples = pages.slice(0, 8).map((p,i)=>`
      <section><h2>صفحة ${escapeHtml(pageNumber(p,i))}</h2><div class="content">${String(p?.content || p?.text || p?.html || '').slice(0, 18000)}</div></section>`).join('');
    const desc = snippet(pages[0]?.content || `${title} — ${author} — ${category}`, 180);
    const body = `<header><div class="meta">خزانة علوم العترة — جليس الكليني</div><h1>${escapeHtml(title)}</h1><div class="meta">${author ? `المؤلف: ${escapeHtml(author)} · ` : ''}${category ? `التصنيف: ${escapeHtml(category)} · ` : ''}${pages.length ? `${pages.length} صفحة` : ''}</div></header>
      ${pages.length ? `<h2>مقتطف من الكتاب</h2>${pageSamples}` : '<div class="content">بيانات الكتاب متاحة في المكتبة الرقمية.</div>'}
      ${toc.length ? `<h2>الفهرس</h2><div class="content"><ol>${tocHtml}</ol></div>` : ''}
      <nav><a href="${BASE_URL}/">فتح جليس الكليني</a></nav>`;
    await writeFile(path.join(ROOT, 'books', slug, 'index.html'), htmlDoc({title:`${title} | جليس الكليني`,description:desc,canonical:bookUrl,body,schema:bookSchema({...book,id},bookUrl)}));
    generated.push(bookUrl);
    bookRows.push({title, author, category, url:bookUrl});

    // Generate one crawlable page per JSON page. This exposes the actual Arabic text to crawlers without editing source JSON files.
    for (let i=0;i<pages.length;i++) {
      const p = pages[i];
      const pn = pageNumber(p,i);
      const pageSlug = `page-${pn}`;
      const pageUrl = `${BASE_URL}/pages/${encodeURIComponent(slug)}/${pageSlug}/`;
      const pageText = String(p?.content || p?.text || p?.html || '');
      const pageTitle = snippet(stripHtml(pageText), 90) || `صفحة ${pn}`;
      const bodyPage = `<header><div class="meta"><a href="${bookUrl}" style="color:#f5d77f">${escapeHtml(title)}</a></div><h1>${escapeHtml(pageTitle)}</h1><div class="meta">${author ? `المؤلف: ${escapeHtml(author)} · ` : ''}صفحة ${escapeHtml(pn)}</div></header>
      <article class="content">${pageText || '<p>لا يوجد نص ظاهر لهذه الصفحة.</p>'}</article>
      <nav><a href="${bookUrl}">صفحة الكتاب</a><a href="${BASE_URL}/?book=${encodeURIComponent(id)}&page=${encodeURIComponent(pn)}">فتح داخل القارئ</a></nav>`;
      await writeFile(path.join(ROOT,'pages',slug,pageSlug,'index.html'), htmlDoc({title:`${pageTitle} — ${title} | جليس الكليني`,description:snippet(pageText || title,180),canonical:pageUrl,body:bodyPage,schema:{'@context':'https://schema.org','@type':'WebPage',name:`${pageTitle} — ${title}`,inLanguage:'ar',url:pageUrl,isPartOf:{'@type':'Book',name:title,url:bookUrl}}}));
      generated.push(pageUrl);
    }
  }

  const bookListBody = `<header><h1>الكتب والمتون</h1><div class="meta">فهرس الكتب والمتون المفهرسة تلقائيًا من ملفات المكتبة.</div></header><div class="content"><ul>${bookRows.map(b=>`<li><a href="${b.url}">${escapeHtml(b.title)}</a>${b.author?` — ${escapeHtml(b.author)}`:''}</li>`).join('')}</ul></div>`;
  const booksIndexUrl = `${BASE_URL}/books/`;
  await writeFile(path.join(ROOT,'books','index.html'), htmlDoc({title:'الكتب والمتون | خزانة علوم العترة',description:'فهرس الكتب والمتون في خزانة علوم العترة.',canonical:booksIndexUrl,body:bookListBody,schema:{'@context':'https://schema.org','@type':'CollectionPage',name:'الكتب والمتون',url:booksIndexUrl,inLanguage:'ar'}}));
  generated.push(booksIndexUrl);

  const makeCollection = async (kind, label, map, singularLabel) => {
    const rootUrl = `${BASE_URL}/${kind}/`;
    const items = [];
    for (const [name, list] of [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'ar'))) {
      const itemSlug = slugify(name, stableHash(name));
      const itemUrl = `${rootUrl}${encodeURIComponent(itemSlug)}/`;
      await writeFile(path.join(ROOT,kind,itemSlug,'index.html'), htmlDoc({title:`${name} | جليس الكليني`,description:`${singularLabel}: ${name} ضمن خزانة علوم العترة.`,canonical:itemUrl,body:`<header><h1>${escapeHtml(name)}</h1><div class="meta">${escapeHtml(singularLabel)} في خزانة علوم العترة.</div></header><div class="content"><ul>${list.map(x=>`<li><a href="${x.url}">${escapeHtml(x.title)}</a></li>`).join('')}</ul></div>`,schema:{'@context':'https://schema.org','@type':'CollectionPage',name,url:itemUrl,inLanguage:'ar'}}));
      generated.push(itemUrl);
      items.push(`<li><a href="${itemUrl}">${escapeHtml(name)}</a> (${list.length})</li>`);
    }
    await writeFile(path.join(ROOT,kind,'index.html'), htmlDoc({title:`${label} | خزانة علوم العترة`,description:`${label} المفهرسة تلقائيًا في خزانة علوم العترة.`,canonical:rootUrl,body:`<header><h1>${label}</h1></header><div class="content"><ul>${items.join('')}</ul></div>`,schema:{'@context':'https://schema.org','@type':'CollectionPage',name:label,url:rootUrl,inLanguage:'ar'}}));
    generated.push(rootUrl);
  };
  await makeCollection('authors','المؤلفون',authorMap,'المؤلف');
  await makeCollection('topics','الموضوعات',topicMap,'الموضوع');

  // Root sitemap + sitemap index. Write under the site root, not only inside seo/.
  const sitemapDir = path.join(ROOT, 'seo-sitemaps');
  await fs.rm(sitemapDir, { recursive: true, force: true });
  await ensureDir(sitemapDir);
  const urls = [...new Set([`${BASE_URL}/`, ...generated])];
  const chunks = [];
  for (let i=0;i<urls.length;i+=MAX_URLS_PER_SITEMAP) chunks.push(urls.slice(i,i+MAX_URLS_PER_SITEMAP));
  for (let i=0;i<chunks.length;i++) {
    const body = chunks[i].map(u=>`<url><loc>${escapeHtml(u)}</loc></url>`).join('');
    await writeFile(path.join(sitemapDir,`sitemap-${i+1}.xml`), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
  }
  const sitemapIndex = chunks.map((_,i)=>`<sitemap><loc>${BASE_URL}/seo-sitemaps/sitemap-${i+1}.xml</loc></sitemap>`).join('');
  await writeFile(path.join(ROOT,'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapIndex}</sitemapindex>`);

  // A simple HTML index that links to generated collections; helpful for internal discovery too.
  await writeFile(path.join(ROOT,'seo-index.html'), htmlDoc({title:'فهرس SEO | خزانة علوم العترة',description:'الفهرس القابل للفهرسة لخزانة علوم العترة.',canonical:`${BASE_URL}/seo-index.html`,body:`<header><h1>فهرس خزانة علوم العترة</h1></header><div class="content"><ul><li><a href="${BASE_URL}/books/">الكتب والمتون</a></li><li><a href="${BASE_URL}/authors/">المؤلفون</a></li><li><a href="${BASE_URL}/topics/">الموضوعات</a></li></ul></div>`,schema:{'@context':'https://schema.org','@type':'WebPage',name:'فهرس خزانة علوم العترة',url:`${BASE_URL}/seo-index.html`,inLanguage:'ar'}}));

  console.log(JSON.stringify({manifests:manifestFiles.length,jsonFiles:jsonFiles.length,books:books.size,generatedUrls:urls.length,sitemaps:chunks.length},null,2));
}

main().catch(err => { console.error(err); process.exit(1); });
