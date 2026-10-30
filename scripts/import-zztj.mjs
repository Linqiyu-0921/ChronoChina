/**
 * import-zztj.mjs — 从国学大师《资治通鉴》《续资治通鉴》电子本按年抽取大事。
 *
 * 底本页面把年份写在段首：「三年壬午，公元前三九九年」「永徽六年乙卯，公元六五五年」；
 * 续通鉴只写年号（「太平兴国六年辽乾亨三年」），须按本站年号表反算公元年。
 * 每卷缓存到 data/raw/<book>/，可断点续跑。
 *
 * 用法：node scripts/import-zztj.mjs [--book zztj|xjz] [--refresh] [--limit N]
 * 产物：data/curated/zztj.json、data/curated/xzj.json（逐年一条，来源 S6 / S7）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BOOK = (() => {
  const a = process.argv.indexOf('--book');
  const name = a >= 0 ? process.argv[a + 1] : 'zztj';
  return {
    zztj: { index: 'https://www.guoxuedashi.com/a/54cxdt/', dir: 'zztj', prefix: 'tz', source: 'S6', gregorian: true, pattern: /\/a\/54cxdt\/\d+[a-z]\.html/g },
    xzj: { index: 'https://www.guoxuedashi.com/a/56bivu/', dir: 'xzj', prefix: 'xz', source: 'S7', gregorian: false, pattern: /\/a\/56bivu\/\d+[a-z]\.html/g },
  }[name];
})();
const INDEX = BOOK.index;

const CACHE = join(ROOT, `data/raw/${BOOK.dir}`);
const OUT = join(ROOT, `data/curated/${BOOK.dir}.json`);

const YEAR_MIN = -305;
const YEAR_MAX = 1911;

const polities = JSON.parse(readFileSync(join(ROOT, 'data/polities.json'), 'utf8'));
const activeAt = (year) => polities.filter((p) => p.startYear <= year && p.endYear >= year).map((p) => p.id);

const args = process.argv.slice(2);
const refresh = args.includes('--refresh');
const limitArg = args.indexOf('--limit');
const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DIGIT = { 〇: 0, 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
/** 「六五五」这类逐位写法；遇到十/百/千则退回常规读法 */
function cnNum(s) {
  if (/[十百千]/.test(s)) {
    const unit = { 十: 10, 百: 100, 千: 1000 };
    let total = 0, cur = 0;
    for (const ch of s) {
      if (ch in DIGIT) cur = DIGIT[ch];
      else if (ch in unit) { total += (cur || 1) * unit[ch]; cur = 0; }
    }
    return total + cur;
  }
  return Number([...s].map((ch) => DIGIT[ch]).join(''));
}

const HEAD = /^(.{1,26}?)[，,]\s*公元(前)?([〇零一二三四五六七八九十百千]+)年$/;
const HEAD_CN = /^[\u4e00-\u9fa5，。、·]{2,40}年$/;
const HEAD_AD = /([〇零一二三四五六七八九]{3,4})年$/;
const erasJson = JSON.parse(readFileSync(join(ROOT, 'data/eras.json'), 'utf8'));
const erasByName = new Map();
for (const e of erasJson) {
  const list = erasByName.get(e.name.replace(/（复）$/, '')) ?? [];
  list.push(e);
  erasByName.set(e.name.replace(/（复）$/, ''), list);
}
/** 「太平兴国六年辽乾亨三年」→ 公元年：各年号分别反算，取与上一年最接近且互相印证者 */
function eraToYear(header, lastYear) {
  const pairs = [...header.matchAll(/([\u4e00-\u9fa5]{1,6}?)(元|[一二三四五六七八九十百]{1,3})年/g)];
  const cands = [];
  for (const [, name, num] of pairs) {
    const n = num === '元' ? 1 : cnNum(num);
    for (const era of erasByName.get(name) ?? []) {
      const y = era.startYear + n - 1;
      if (y >= era.startYear && y <= era.endYear) cands.push(y);
    }
  }
  if (!cands.length) return null;
  // 跨政权同年号先看互相印证；再按与前一年衔接（差 0–2 年）筛选；首卷则取最早的候选
  const agree = cands.find((y) => cands.filter((z) => z === y).length > 1);
  if (agree !== undefined && Math.abs(agree - lastYear) <= 2) return agree;
  const near = cands.filter((y) => Math.abs(y - lastYear) <= 2).sort((a, b) => a - b);
  if (near.length) return near[0];
  if (lastYear < 500) return Math.min(...cands);
  return null;
}
const MONTH = /^(?:[春夏秋冬][，,]|[正一二三四五六七八九十冬腊]{1,2}月[，,])/;
const STRONG = /战|伐|攻|围|破|败|克|陷|降|叛|杀|弑|立|废|薨|卒|崩|即位|称帝|称王|改元|变法|遣使|册|盟|和亲|大水|大旱|饥|蝗|地震|疫|都|迁|置|罢|免|赐死/;

function cleanLine(s) {
  return s
    .replace(/\s+/g, '')
    .replace(/^(?:[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]|朔|晦)[，,]/, '')
    .replace(/^[〇一二三四五六七八九十]{1,3}月[，,]?/, '')
    .replace(/^(初|先是|至是|于是|会)[，,]/, '')
    .trim();
}

/** 去掉侧栏、章节导航等页面附属块（按 div 配平删除） */
function dropBlocks(html, classPattern) {
  const open = new RegExp(`<div[^>]*class="[^"]*(?:${classPattern})[^"]*"[^>]*>`, 'i');
  let out = html;
  for (;;) {
    const m = open.exec(out);
    if (!m) break;
    let depth = 1, i = m.index + m[0].length;
    const tag = /<div\b[^>]*>|<\/div>/gi;
    tag.lastIndex = i;
    let t;
    while ((t = tag.exec(out))) {
      depth += t[0][1] === '/' ? -1 : 1;
      if (depth === 0) { i = t.index + t[0].length; break; }
    }
    out = out.slice(0, m.index) + out.slice(i);
  }
  return out;
}

/** 一卷 → [{year, lines}] */
function parseChapter(rawHtml, lastYear) {
  const cleaned = dropBlocks(dropBlocks(rawHtml, 'sidebar'), 'info_cate|info_bottom|footer|breadcrumb');
  const withClean = splitBlocks(cleaned, lastYear);
  // 部分卷的侧栏 div 未闭合，按块删除会连带吃掉正文；此时退回未清理的文本
  return withClean.length ? withClean : splitBlocks(rawHtml, lastYear);
}

function splitBlocks(html, lastYear) {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const blocks = [];
  let cur = null;
  let prev = lastYear;
  for (const line of lines) {
    const m = line.match(HEAD);
    let year = null;
    if (m) {
      const y = cnNum(m[3]);
      year = m[2] ? 1 - y : y;
    } else if (!BOOK.gregorian && HEAD_CN.test(line) && line.length <= 40) {
      const ad = line.match(HEAD_AD);
      const guess = ad ? Number([...ad[1]].map((c) => cnNum(c)).join('')) : eraToYear(line, prev);
      if (guess !== null && Number.isFinite(guess)) year = guess;
    }
    if (year !== null) {
      cur = { year, lines: [] };
      blocks.push(cur);
      prev = year;
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  if (process.env.DEBUG_PARSE && !blocks.length) {
    const cand = lines.filter((l) => l.length <= 30 && /年[。.]?$/.test(l));
    console.log(`  split: lines=${lines.length} cand=${cand.length} sample=${cand.slice(0, 3).join(' / ')}`);
  }
  return blocks;
}

/** 每年挑一条：先看关键词密度，再看长度 */
function pick(block) {
  const NOISE = /^(臣光曰|太史公曰|论曰|或谓|初，|先是)|曰：\s*["“]|异父弟|同父弟|之同母弟|免责声明|本站|版权|广告|联系|举报|上一[章页]|下一[章页]|全站|收藏|[:：]\s*["“]/;
  const cands = block.lines
    .filter((l) => l.length >= 10 && l.length <= 400 && !/^卷[〇一二三百十]/.test(l) && !NOISE.test(l))
    .map((l) => ({ l, score: (STRONG.test(l) ? 4 : 0) + Math.min(2, l.length / 60) + (/[。]/.test(l) ? 1 : 0) }))
    .sort((a, b) => b.score - a.score);
  if (!cands.length) return null;
  const raw = cands[0].l;
  const sentence = raw.split('。')[0].trim();
  const body = cleanLine(sentence);
  if (body.length < 6) return null;
  const cut = body.length <= 24 ? body : (body.slice(0, 24).match(/^[\s\S]*[，,、：:；]/)?.[0].replace(/[，,、：:；]$/, '') ?? body.slice(0, 23) + '…');
  const summary = sentence.length > 60 ? sentence.slice(0, 59) + '…' : sentence;
  return { title: cut, summary };
}

const CATS = [
  ['军事', /战|伐|攻|围|破|败|克|陷|降|叛|杀|斩|兵|军/],
  ['外交', /遣使|册|盟|和亲|朝贡|入贡|称臣|聘/],
  ['制度', /改元|诏|立|废|罢|置|迁|都|律|法|税|免|赐/],
  ['文化', /《|学|儒|佛|僧|寺|经|书|礼|乐|历/],
];
const classify = (t) => {
  const hit = CATS.filter(([, re]) => re.test(t)).map(([c]) => c).slice(0, 2);
  return hit.length ? hit : ['政治'];
};

mkdirSync(CACHE, { recursive: true });
const indexHtml = existsSync(join(CACHE, '_index.html')) && !refresh
  ? readFileSync(join(CACHE, '_index.html'), 'utf8')
  : await (async () => {
      const r = await fetch(INDEX, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const h = await r.text();
      writeFileSync(join(CACHE, '_index.html'), h);
      return h;
    })();
const chapterRe = new RegExp(`href="(${BOOK.index.replace('https://www.guoxuedashi.com', '').replace(/\//g, '\\/')}(?:\\d+)[a-z]\\.html)"[^>]*>([^<]+)</a>`, 'g');
const chapters = [...indexHtml.matchAll(chapterRe)]
  .map((m) => ({ url: `https://www.guoxuedashi.com${m[1]}`, name: m[2] }));
console.log(`章目 ${chapters.length} 卷`);

const byYear = new Map();
let lastYear = YEAR_MIN - 1;
let crawled = 0, cachedChapters = 0, failed = 0;
for (const [i, ch] of chapters.entries()) {
  if (i >= limit) break;
  const file = join(CACHE, `ch${String(i + 1).padStart(3, '0')}.html`);
  let html = null;
  if (existsSync(file) && !refresh) { html = readFileSync(file, 'utf8'); cachedChapters++; }
  else {
    for (let attempt = 1; attempt <= 3 && !html; attempt++) {
      try {
        const r = await fetch(ch.url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (r.ok) html = await r.text();
        else await sleep(1500 * attempt);
      } catch { await sleep(1500 * attempt); }
    }
    if (html) { writeFileSync(file, html); crawled++; await sleep(600); }
  }
  if (!html) { failed++; continue; }
  const blocks = parseChapter(html, lastYear);
  if (process.env.DEBUG_PARSE && (i < 3 || blocks.length === 0)) console.log(`ch${i + 1} blocks=${blocks.length} years=${blocks.slice(0, 3).map((b) => b.year).join(',')}`);
  for (const block of blocks) {
    if (block.year < YEAR_MIN || block.year > YEAR_MAX) continue;
    if (byYear.has(block.year)) continue;
    const picked = pick(block);
    if (!picked) continue;
    lastYear = block.year;
    byYear.set(block.year, {
      id: `${BOOK.prefix}-${block.year}-01`,
      year: block.year,
      title: picked.title,
      categories: classify(picked.summary),
      polityIds: activeAt(block.year),
      summary: picked.summary,
      sources: [BOOK.source],
    });
  }
}

const out = [...byYear.values()].sort((a, b) => a.year - b.year);

// 合并进 curated/events.json：只补目前没有事件的年份，可重复执行
const curatedPath = join(ROOT, 'data/curated/events.json');
const eventsPath = join(ROOT, 'data/events.json');
const curated = JSON.parse(readFileSync(curatedPath, 'utf8')).filter((e) => !String(e.id).startsWith(`${BOOK.prefix}-`));
const covered = new Set(JSON.parse(readFileSync(eventsPath, 'utf8')).filter((e) => !String(e.id).startsWith(`${BOOK.prefix}-`)).map((e) => e.year));
const filled = out.filter((e) => !covered.has(e.year));
const merged = [...curated, ...filled].sort((a, b) => a.year - b.year || (a.month ?? 13) - (b.month ?? 13));
writeFileSync(curatedPath, JSON.stringify(merged, null, 1) + '\n');
console.log(`并入 curated：补空白年 ${filled.length} 条（原 ${curated.length} → ${merged.length}），其余年已有事件保持不动`);
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
const years = out.map((e) => e.year);
console.log(`抓取 ${crawled} 卷（缓存 ${cachedChapters}），失败 ${failed}，id 前缀 ${BOOK.prefix}`);
console.log(`抽出 ${out.length} 年（${years.length ? `${years[0]}—${years[years.length - 1]}` : '空'}）→ data/curated/${BOOK.dir}.json`);
