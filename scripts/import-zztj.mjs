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
    zztj: { index: 'https://www.guoxuedashi.com/a/54cxdt/', dir: 'zztj', prefix: 'tz', source: 'S6', mode: 'head', gregorian: true },
    xzj: { index: 'https://www.guoxuedashi.com/a/56bivu/', dir: 'xzj', prefix: 'xz', source: 'S7', mode: 'head', gregorian: false },
    mingshi: { index: 'https://www.gxdq.com/a/26l/', dir: 'mingshi', prefix: 'ms', source: 'S8', mode: 'lead', polity: 'ming', only: /本纪/ },
    qsg: { index: 'https://www.gxdq.com/a/27p/', dir: 'qsg', prefix: 'qs', source: 'S9', mode: 'lead', polity: 'qing', only: /本纪/ },
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
/** 本纪体段首：「十二年春二月」「洪武元年正月」「康熙元年壬寅春正月」 */
const LEAD = /^([\u4e00-\u9fa5]{1,5}年)(?=(?:[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥])?[，,春夏秋冬正腊闰一二三四五六七八九十])/;
const CN_NUM = /^(?:元|[一二三四五六七八九十]{1,3})$/;
const erasOfPolity = (polityId) => erasJson.filter((e) => e.polityId === polityId);
const eraNames = [...erasByName.keys()].sort((a, b) => b.length - a.length);
/**
 * 本纪体的「N年」：先看句首有没有年号；没有就沿用本章已出现的年号（纪传体一卷只叙一朝）；
 * 章首即无年号时，只在本政权恰于上一年之后改元的情况下认定。
 */
function inferLeadYear(header, lastYear, polityId, curEra) {
  const tok = header.match(LEAD);
  if (!tok) return null;
  const body = tok[1].slice(0, -1);
  let era = null, numText = body;
  for (const name of eraNames) {
    if (body.startsWith(name) && CN_NUM.test(body.slice(name.length))) {
      const list = erasByName.get(name);
      // 同名年号取本政权的那个，实在没有再用第一个
      era = list.find((e) => e.polityId === polityId) ?? list[0];
      numText = body.slice(name.length);
      break;
    }
  }
  if (!CN_NUM.test(numText)) return null;
  const n = numText === '元' ? 1 : cnNum(numText);
  if (era) {
    const y = era.startYear + n - 1;
    return y <= era.endYear ? { year: y, era } : null;
  }
  if (curEra) {
    const y = curEra.startYear + n - 1;
    if (y <= curEra.endYear && y >= lastYear - 1) return { year: y, era: curEra };
  }
  // 章首无年号：取本政权年号里最接近上一年、且不早于它的解释
  const cands = erasOfPolity(polityId)
    .map((e) => ({ y: e.startYear + n - 1, era: e }))
    .filter((c) => c.y <= c.era.endYear && c.y >= lastYear - 1 && c.y <= lastYear + 25)
    .sort((a, b) => a.y - b.y);
  if (cands.length) return { year: cands[0].y, era: cands[0].era };
  if (n === 1) {
    const next = erasOfPolity(polityId).filter((e) => e.startYear >= lastYear);
    if (next.length === 1) return { year: next[0].startYear, era: next[0] };
  }
  return null;
}
const MILITARY = /战|伐|攻|围|破|败|克|陷|降|叛|杀|弑|薨|卒|崩|即位|称帝|称王|改元|起义|之役/;
const INSTITUTION = /立|废|置|罢|免|诏|赐|迁|都|变法|遣使|册|盟|和亲|大水|大旱|饥|蝗|地震|疫/;
const APPOINT = /^(?:以[\u4e00-\u9fa5]{1,12}(?:为|兼|署)|调[\u4e00-\u9fa5]{1,12}为|命[\u4e00-\u9fa5]{1,12}为)/;

function cleanLine(s) {
  let out = s
    .replace(/\s+/g, '')
    .replace(/^[\u4e00-\u9fa5]{0,4}(?:元|[〇一二三四五六七八九十]{1,3})年[，,]?/, '');
  // 年、干支、季、月的次序不固定（本色本作「元年壬寅春正月」），逐层剥
  for (let i = 0; i < 4; i++) {
    const before = out;
    out = out
      .replace(/^[，,、]+/, '')
      .replace(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥](?:[日朔晦])?[，,]?/, '')
      .replace(/^[春夏秋冬](?=[，,]|闰?[正一二三四五六七八九十冬腊]{1,2}月)[，,]?/, '')
      .replace(/^闰?[正一二三四五六七八九十冬腊]{1,2}月[，,]?/, '');
    if (out === before) break;
  }
  return out.replace(/^(?:初|先是|至是|于是|会|及|既而|俄而)[，,]/, '').trim();
}

/** 长段落切成句，便于按句挑事，而不是总取段首那句日期话 */
function sentences(line) {
  return line.split(/(?<=[。！？])/).map((s) => s.trim()).filter(Boolean);
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
  let curEra = null;
  let prev = lastYear;
  for (const line of lines) {
    if (line.startsWith('◎')) continue;
    const m = line.match(HEAD);
    let year = null;
    let rest = '';
    if (m) {
      const y = cnNum(m[3]);
      year = m[2] ? 1 - y : y;
    } else if (BOOK.mode === 'lead') {
      const lead = inferLeadYear(line, prev, BOOK.polity, curEra);
      if (lead) {
        year = lead.year;
        curEra = lead.era;
        // 本纪体的纪年与记事同段，纪年之后的内容要留下
        rest = line.slice(line.match(LEAD)[0].length);
      }
    } else if (!BOOK.gregorian && HEAD_CN.test(line) && line.length <= 40) {
      const ad = line.match(HEAD_AD);
      const guess = ad ? Number([...ad[1]].map((c) => cnNum(c)).join('')) : eraToYear(line, prev);
      if (guess !== null && Number.isFinite(guess)) year = guess;
    }
    if (year !== null) {
      cur = { year, lines: rest ? [rest] : [] };
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

/** 每年挑两条：把长段拆成句，按关键词与具体性打分，避开套语与近重复 */
function pickAll(block, max = 2) {
  const NOISE = /^(臣光曰|太史公曰|论曰|史臣曰|或谓|初，|先是|至是|于是|是月|是岁|是时|是年|是日|明日|既而|俄而|会|异父弟|同父弟|之同母弟|免责声明|本站|版权|广告|联系|举报|上一[章页]|下一[章页]|全站|收藏)|曰：\s*["“]|[：:]\s*["“]/;
  const DANGLING = /^(?:[”」』）】]|[，,、；;：:]|而|乃|遂|因|寻|俄|复|又|仍|却|大怒)/;
  const balanced = (s) => ((s.match(/[“”]/g) ?? []).length % 2 === 0);
  const cands = block.lines
    .flatMap(sentences)
    .map((s) => cleanLine(s))
    .filter((s) => s.length >= 10 && s.length <= 160 && !NOISE.test(s) && !DANGLING.test(s) && balanced(s) && !/^卷[〇一二三百十]/.test(s))
    .map((s) => ({
      s,
      score: (MILITARY.test(s) ? 5 : 0)
        + (INSTITUTION.test(s) ? 2 : 0)
        - (APPOINT.test(s) ? 3 : 0)
        + (/[，,].*[，,]/.test(s) ? 1 : 0)
        + Math.min(2, s.length / 60)
        + (/[。]$/.test(s) ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.s.length - b.s.length);
  const picked = [];
  for (const { s, score } of cands) {
    // 第二条只在有明显事项时补，避免凑数的日常奏议
    if (picked.length && score < 3) continue;
    const body = s.replace(/[。！？]$/, '');
    // 同一件事常因分句被拆开，按前八字判重
    if (picked.some((p) => p.body.slice(0, 8) === body.slice(0, 8))) continue;
    const summary = body.length > 60 ? body.slice(0, 59) + '…' : body;
    const cut = body.length <= 24 ? body : (body.slice(0, 24).match(/^[\s\S]*[，,、：:；]/)?.[0].replace(/[，,、：:；]$/, '') ?? body.slice(0, 23) + '…');
    picked.push({ body, title: cut, summary });
    if (picked.length >= max) break;
  }
  return picked;
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
const bookPath = new URL(INDEX).pathname.replace(/\//g, '\\/');
const chapterRe = new RegExp(`href="(${bookPath}\\d+[a-z]\\.html)"[^>]*>([^<]+)</a>`, 'g');
const chapters = [...indexHtml.matchAll(chapterRe)]
  .map((m) => ({ url: new URL(m[1], INDEX).href, name: m[2].trim() }))
  .filter((c) => !BOOK.only || BOOK.only.test(c.name));
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
  if (process.env.DEBUG_PARSE) console.log(`ch${i + 1} ${ch.name} blocks=${blocks.length} years=${blocks.slice(0, 3).map((b) => b.year).join(',')}`);
  for (const block of blocks) {
    if (block.year < YEAR_MIN || block.year > YEAR_MAX) continue;
    if (byYear.has(block.year)) continue;
    const picked = pickAll(block);
    if (!picked.length) { if (process.env.DEBUG_PICK) console.log('nopick', block.year, block.lines.length, (block.lines[0] ?? '').slice(0, 50)); continue; }
    lastYear = block.year;
    byYear.set(block.year, picked.map((p, index) => ({
      id: `${BOOK.prefix}-${block.year}-${String(index + 1).padStart(2, '0')}`,
      year: block.year,
      title: p.title,
      categories: classify(p.summary),
      polityIds: activeAt(block.year),
      summary: p.summary,
      sources: [BOOK.source],
    })));
  }
}

const out = [...byYear.values()].flat().sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));

// 合并进 curated/events.json：每年最多两条史事，可重复执行
const curatedPath = join(ROOT, 'data/curated/events.json');
const eventsPath = join(ROOT, 'data/events.json');
const curated = JSON.parse(readFileSync(curatedPath, 'utf8')).filter((e) => !String(e.id).startsWith(`${BOOK.prefix}-`));
// 人物生卒（p-）只标年份，不算当年已有史事
const counts = new Map();
for (const e of JSON.parse(readFileSync(eventsPath, 'utf8'))) {
  const id = String(e.id);
  if (id.startsWith(`${BOOK.prefix}-`) || id.startsWith('p-')) continue;
  counts.set(e.year, (counts.get(e.year) ?? 0) + 1);
}
const filled = [];
for (const e of out) {
  const c = counts.get(e.year) ?? 0;
  if (c >= 2) continue;
  filled.push(e);
  counts.set(e.year, c + 1);
}
const merged = [...curated, ...filled].sort((a, b) => a.year - b.year || (a.month ?? 13) - (b.month ?? 13));
writeFileSync(curatedPath, JSON.stringify(merged, null, 1) + '\n');
console.log(`并入 curated：补 ${filled.length} 条（原 ${curated.length} → ${merged.length}），每年最多两条`);
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
const years = out.map((e) => e.year);
console.log(`抓取 ${crawled} 卷（缓存 ${cachedChapters}），失败 ${failed}，id 前缀 ${BOOK.prefix}`);
console.log(`抽出 ${out.length} 条 / ${new Set(years).size} 年（${years.length ? `${years[0]}—${years[years.length - 1]}` : '空'}）→ data/curated/${BOOK.dir}.json`);
