/**
 * fetch-wiki-years.mjs — 按年抓取维基百科「XXXX年」页，抽取大事记/出生/逝世。
 *
 * 背景：本机直连 zh.wikipedia.org 超时，故走公共只读代理 api.cors.lol。
 * 该代理有配额（超限返回 429），因此脚本带缓存、断点续跑与退避：
 *   - 已缓存的年份直接解析，不重复请求；
 *   - 命中 429 时按 --wait 秒退避重试，连续失败则停止，下次运行自动续上。
 *
 * 用法：
 *   node scripts/fetch-wiki-years.mjs --from 1401 --to 1420 [--wait 45] [--parse-only]
 *   node scripts/fetch-wiki-years.mjs --years 642,703,1500
 *
 * 产物：data/curated/wiki-years.json（按 年份+标题 去重，来源 S1）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as OpenCC from 'opencc-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'data/raw/wiki-years');
const OUT = join(ROOT, 'data/curated/wiki-years.json');
const PROXY = 'https://api.cors.lol/?url=';
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const parseOnly = args.includes('--parse-only');
const waitSec = Number(flag('wait', 45));
const years = flag('years', '')
  ? flag('years', '').split(',').map((s) => Number(s.trim())).filter(Number.isInteger)
  : Array.from({ length: Number(flag('to', 0)) - Number(flag('from', 0)) + 1 }, (_, i) => Number(flag('from', 0)) + i);

const polities = JSON.parse(readFileSync(join(ROOT, 'data/polities.json'), 'utf8'));
const activeAt = (year) => polities.filter((p) => p.startYear <= year && p.endYear >= year).map((p) => p.id);
const CN_BASE = ['中国', '中原', '江南', '北京', '南京', '长安', '洛阳', '开封', '杭州', '广州', '台湾', '西藏', '辽东', '西北', '朝廷', '皇帝', '太祖', '太宗', '中原', '山东', '河北', '河南', '江淮', '关中', '河西'];
const FOREIGN = /朝鲜|越南|缅甸|日本|印度|波斯|罗马|英格兰|法兰西|俄罗斯|埃及|帖木儿|黑羊|阿瓦|占城|真腊|暹罗|天竺|大食|高丽|百济|新罗|突厥|回鹘|吐蕃|匈奴|契丹|女真|西夏(?=王朝)/;
const DYN = new Set(['秦', '汉', '魏', '吴', '晋', '隋', '唐', '宋', '元', '明', '清', '金', '夏', '辽', '齐', '陈', '梁']);
/** 只保留与中国相关条目：命中当年政权名（单字须带朝代后缀）或地理/制度词 */
const isChina = (text, year) => {
  if (FOREIGN.test(text)) return false;
  const names = polities.filter((p) => p.startYear <= year && p.endYear >= year).map((p) => p.name);
  if (names.some((n) => n.length >= 2 && text.includes(n))) return true;
  if (names.some((n) => DYN.has(n) && new RegExp(`${n}(朝|代|军|廷|人|帝|王|室|初|末|制)`).test(text))) return true;
  return CN_BASE.some((k) => text.includes(k));
};
const label = (year) => (year > 0 ? `${year}` : `前${1 - year}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function plain(html) {
  return t2s(
    html
      .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, '')
      .replace(/\[[^\]]*编辑[^\]]*\]/g, '')
      .replace(/（[^）]{0,30}(英语|日语|朝鲜语)[^）]{0,20}）/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/** 取 h2 章节内容，返回 {大事记:[], 出生:[], 逝世:[]} */
function sections(html) {
  const heads = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => ({ at: m.index, name: plain(m[1]).replace(/^§?\s*/, '') }));
  const out = { 大事记: [], 出生: [], 逝世: [] };
  heads.forEach((head, i) => {
    if (!(head.name in out)) return;
    const end = i + 1 < heads.length ? heads[i + 1].at : html.length;
    out[head.name] = html.slice(head.at, end);
  });
  return out;
}

/** 大事记：只取「亚洲 / 中国」分组，丢掉世界其他地区 */
function mainEvents(block) {
  const groups = [...block.matchAll(/<li>\s*<b>([\s\S]{0,40}?)<\/b>\s*([\s\S]*?)<\/li>\s*(?=<li>\s*<b>|<\/ul>)/g)];
  const keep = groups.filter((g) => /亚洲|中國|中国/.test(plain(g[1])));
  const source = keep.length ? keep.map((g) => g[2]).join('\n') : block;
  return [...source.matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map((m) => plain(m[1]).replace(/^(亚洲|欧洲|非洲|美洲|大洋洲|世界)\s*/, ''))
    .filter((t) => t.length >= 8 && t.length <= 120);
}

/** 出生/逝世：条目形如「朱熹，南宋理学家。」取人名与说明 */
function lives(block) {
  return [...block.matchAll(/<li>([\s\S]*?)<\/li>/g)]
    .map((m) => plain(m[1]))
    .filter((t) => t.length >= 3 && t.length <= 120);
}

const CATS = [
  ['军事', /战|攻|伐|围|破|陷|兵|叛|起义|降|俘|杀|征|守|军/],
  ['外交', /盟|和议|遣使|册封|通使|朝贡|条约|称臣|入贡|互市|联姻|朝见/],
  ['制度', /变法|改制|定律|颁|诏|科举|税|均田|官制|改元|置|废|迁都|定都/],
  ['文化', /《|著|撰|修|译|书|诗|文|学|儒|佛|寺|塔|历法|画|乐/],
];
const classify = (text) => CATS.filter(([, re]) => re.test(text)).map(([c]) => c).slice(0, 2).concat([]).length
  ? CATS.filter(([, re]) => re.test(text)).map(([c]) => c).slice(0, 2)
  : ['政治'];
const stripLead = (text) => text.replace(/^\d{1,2}月(\d{1,2}日)?[——:：]\s*/, '').replace(/^[—\-]{1,2}\s*/, '').replace(/（[^）]{0,20}）/g, '').replace(/\s+/g, '');
const monthOf = (text) => { const m = text.match(/^(\d{1,2})月/); return m ? Number(m[1]) : undefined; };
const shortTitle = (text) => {
  const s = stripLead(text).replace(/[。；]$/, '');
  if (s.length <= 24) return s;
  const cut = s.slice(0, 24).match(/^[\s\S]*[，,、：:]/);
  return cut ? cut[0].replace(/[，,、：:]$/, '') : s.slice(0, 23) + '…';
};

function toEvents(year, html) {
  const sec = sections(html);
  const junk = (t) => new RegExp(`^${year > 0 ? year : `前${1 - year}`}年(代)?$`).test(t) || /^[\d年月日—-]+$/.test(t);
  const items = [
    ...mainEvents(sec.大事记).filter((t) => !junk(t) && isChina(t, year)).map((t) => ({ t, cat: classify(t) })),
    ...lives(sec.出生).filter((t) => !junk(t) && isChina(t, year)).map((t) => ({ t: `${t}`, cat: ['人物'] })),
    ...lives(sec.逝世).filter((t) => !junk(t) && isChina(t, year)).map((t) => ({ t: `${t}`, cat: ['人物'] })),
  ];
  const pid = activeAt(year);
  return items.slice(0, 12).map((it, i) => ({
    id: `wz-${year}-${String(i + 1).padStart(2, '0')}`,
    year,
    ...(monthOf(it.t) ? { month: monthOf(it.t) } : {}),
    title: shortTitle(it.t),
    categories: it.cat,
    polityIds: pid,
    summary: it.t.length > 60 ? it.t.slice(0, 59) + '…' : it.t,
    sources: ['S1'],
  }));
}

async function fetchYear(year) {
  const url = `${PROXY}${encodeURIComponent(`https://zh.wikipedia.org/wiki/${label(year)}年`)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'ChronoChina/0.5 (data import; contact: repo)' } });
    const body = await res.text();
    if (res.ok && body.length > 5000) return body;
    if (res.status === 429) { await sleep(waitSec * 1000); continue; }
    await sleep(3000 * attempt);
  }
  return null;
}

const collected = [];
let fetched = 0, cached = 0, failed = 0;
for (const year of years) {
  const file = join(CACHE, `${label(year)}.html`);
  let html = null;
  if (existsSync(file)) { html = readFileSync(file, 'utf8'); cached++; }
  else if (!parseOnly) {
    html = await fetchYear(year);
    if (html) { mkdirSync(CACHE, { recursive: true }); writeFileSync(file, html); fetched++; await sleep(2000); }
  }
  if (!html) { failed++; continue; }
  collected.push(...toEvents(year, html));
}

if (collected.length) {
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
  const key = (e) => `${e.year}|${e.title.slice(0, 10)}`;
  const seen = new Set(prev.map(key));
  const merged = [...prev, ...collected.filter((e) => !seen.has(key(e)) && seen.add(key(e)))];
  writeFileSync(OUT, JSON.stringify(merged, null, 1) + '\n');
  console.log(`写入 data/curated/wiki-years.json：${prev.length} → ${merged.length} 条`);
}
console.log(`年份 ${years.length}：缓存命中 ${cached}，新抓取 ${fetched}，失败 ${failed}，解析出事件 ${collected.length}`);
if (failed) console.log('存在失败年份，稍后重跑同一命令会自动续抓（已抓的走缓存）。');
