/**
 * import-atlas.mjs — 用「江山历史地图」的纪年条目补齐尚无事件的年份。
 *
 * 该站把大事按公元年编成 milestones 与 PLACE_LANDMARK_EVENTS 两份清单，
 * 覆盖前 403 至 1949，正好补国史底本（资治通鉴系）未及或语焉不详的年份。
 * 数据取自站点公开脚本 js/map_data.js、js/lore_data.js，缓存到 data/raw/atlas/。
 *
 * 用法：node scripts/import-atlas.mjs [--refresh]
 * 产物：data/curated/atlas.json（逐年一条，来源 S10）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://deanchen.me/jiangshan-map/js/';
const CACHE = join(ROOT, 'data/raw/atlas');
const OUT = join(ROOT, 'data/curated/atlas.json');
const YEAR_MIN = -305;
const YEAR_MAX = 1911;

const polities = JSON.parse(readFileSync(join(ROOT, 'data/polities.json'), 'utf8'));
const activeAt = (year) => polities.filter((p) => p.startYear <= year && p.endYear >= year).map((p) => p.id);

const refresh = process.argv.includes('--refresh');
mkdirSync(CACHE, { recursive: true });
const load = async (name) => {
  const file = join(CACHE, name);
  if (existsSync(file) && !refresh) return readFileSync(file, 'utf8');
  const r = await fetch(BASE + name, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`${name} ${r.status}`);
  const text = await r.text();
  writeFileSync(file, text);
  return text;
};

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(await load('map_data.js'), ctx, { timeout: 10000 });
vm.runInContext(await load('lore_data.js'), ctx, { timeout: 10000 });

const byYear = new Map();
for (const d of ctx.window.DYNASTY_DATA ?? []) {
  for (const m of d.milestones ?? []) {
    if (Number.isFinite(m.year) && m.headline && !byYear.has(m.year)) byYear.set(m.year, m.headline);
  }
}
for (const e of ctx.window.ATLAS_LORE_DATA?.PLACE_LANDMARK_EVENTS ?? []) {
  if (Number.isFinite(e.year) && e.zh && !byYear.has(e.year)) byYear.set(e.year, e.zh);
}

const CATS = [
  ['军事', /战|伐|攻|围|破|败|克|陷|降|叛|兵|军|之役|起义|北伐|南征/],
  ['外交', /使|盟|和亲|朝贡|条约|通商|租|册封|入贡/],
  ['制度', /改元|诏|立|废|罢|置|迁|都|律|法|税|赋|官|科举|变法|改制/],
  ['文化', /《|学|儒|佛|僧|寺|经|书|礼|乐|历|图|诗|文/],
];
const classify = (t) => {
  const hit = CATS.filter(([, re]) => re.test(t)).map(([c]) => c).slice(0, 2);
  return hit.length ? hit : ['政治'];
};

const out = [];
for (const [year, headline] of [...byYear.entries()].sort((a, b) => a[0] - b[0])) {
  if (year < YEAR_MIN || year > YEAR_MAX) continue;
  const text = headline.trim().replace(/[。；]$/, '');
  const first = text.split(/[；。]/)[0];
  const title = first.length <= 24 ? first : (first.slice(0, 24).match(/^[\s\S]*[，,、：:]/)?.[0].replace(/[，,、：:]$/, '') ?? first.slice(0, 23) + '…');
  out.push({
    id: `at-${year}-01`,
    year,
    title,
    categories: classify(text),
    polityIds: activeAt(year),
    summary: text.length > 70 ? text.slice(0, 69) + '…' : text,
    sources: ['S10'],
  });
}

const curatedPath = join(ROOT, 'data/curated/events.json');
const eventsPath = join(ROOT, 'data/events.json');
// 古籍抽取（ms/qs/tz/xz）多为日常政务，遇该站已收录的年份让位于站点条目的地标事件
const AUTO = /^(?:ms|qs|tz|xz)-/;
const events = JSON.parse(readFileSync(eventsPath, 'utf8'));
const keepYears = new Set(
  events
    .filter((e) => !String(e.id).startsWith('at-') && !String(e.id).startsWith('p-') && !AUTO.test(String(e.id)))
    .map((e) => e.year),
);
const filled = out.filter((e) => !keepYears.has(e.year));
const filledYears = new Set(filled.map((e) => e.year));
const curated = JSON.parse(readFileSync(curatedPath, 'utf8')).filter(
  (e) => !String(e.id).startsWith('at-') && !(AUTO.test(String(e.id)) && filledYears.has(e.year)),
);
const merged = [...curated, ...filled].sort((a, b) => a.year - b.year || (a.month ?? 13) - (b.month ?? 13));
writeFileSync(curatedPath, JSON.stringify(merged, null, 1) + '\n');
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`条目 ${out.length} 年（${out[0]?.year}—${out[out.length - 1]?.year}），补空白年 ${filled.length} 条（原 ${curated.length} → ${merged.length}）`);
