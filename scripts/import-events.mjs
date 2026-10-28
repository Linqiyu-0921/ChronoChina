/**
 * import-events.mjs — 全史事件库导入
 * 源：data/raw/wiki-timeline.txt（维基「中国历史年表」，variant=zh-cn，行式「前XXX年：…」）
 * 附加：data/persons.json 生卒事件；data/curated/events.json 手工层（优先，同年同题去重）。
 * 产物：data/events.json（生成文件，勿手改——改 curated 或 persons 后重跑本脚本）。
 * 幂等：可重复执行。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const YEAR_MIN = -305; // 纪元覆盖下限（秦自昭襄王起纪）
const YEAR_MAX = 1911;

const polities = JSON.parse(readFileSync(join(ROOT, 'data/polities.json'), 'utf8'));
const persons = JSON.parse(readFileSync(join(ROOT, 'data/persons.json'), 'utf8'));
const curated = JSON.parse(readFileSync(join(ROOT, 'data/curated/events.json'), 'utf8'));
const raw = readFileSync(join(ROOT, 'data/raw/wiki-timeline.txt'), 'utf8');

/** 该年活跃政权（用于事件的 polityIds 粗关联） */
const activeAt = (year) =>
  polities.filter((p) => p.startYear <= year && p.endYear >= year).map((p) => p.id);

/** 清理维基引用标记 [古 17]/[註 1]/[网 2]/[注 3] 及多余空白 */
const cleanRef = (s) => s.replace(/\s*\[(?:古|註|注|网|網)\s*\d+\]/g, '').replace(/\s+/g, ' ').trim();

const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
/** 句首「X月」提取（如「三月金立伪楚」→ 3）；支持 一~十、十一~十二 */
function parseMonth(clause) {
  const m = clause.match(/^([一二三四五六七八九十]{1,2})月/);
  if (!m) return null;
  const t = m[1];
  if (t === '十') return 10;
  if (t === '十一') return 11;
  if (t === '十二') return 12;
  if (t.length === 1) return CN_NUM[t] ?? null;
  if (t[0] === '十') return 10 + (CN_NUM[t[1]] ?? 0);
  return null;
}

/** 关键词启发分类（可多类；无命中默认政治） */
function classify(text) {
  const cats = new Set();
  if (/之战|亲征|伐|征讨|出兵|兵变|起义|之乱|叛|平定|攻陷|攻入|入侵|大败|击败|兵败|被杀|战死|投降|灭[国汉魏秦周梁齐]|会战|北伐|南征|守城|解围|席卷|割地|割让|收复/.test(text)) cats.add('军事');
  if (/会盟|盟约|和议|议和|和亲|遣使|通使|册封|条约|朝贡|称臣|入贡|互市|约和|建交|联姻/.test(text)) cats.add('外交');
  if (/变法|改制|推行|颁布.{0,4}法|新法|科举|科举制|律|刑律|税|租调|均田|官制|三省|内阁|军机|行省|郡县|府兵|募兵|一条鞭|摊丁入亩|改制|整顿吏治|改革/.test(text)) cats.add('制度');
  if (/《|著|撰写|修成|译|翻译|诗|文学|学派|思想|学说|书院|佛|道|寺|塔|石窟|历法|造纸|印刷|火药|艺术|绘画|书法|雕塑|科举取士|大兴|尊儒|祀孔/.test(text)) cats.add('文化');
  if (/出生|卒|病逝|去世|逝世|被害|遇刺|身亡|自杀|病卒|遇害|身亡|驾崩|薨/.test(text)) cats.add('人物');
  if (cats.size === 0) cats.add('政治');
  return [...cats].slice(0, 2); // 最多双类，避免噪声
}

/** 由整句生成短标题：优先逗号/分号处截断，至多 24 字 */
function makeTitle(sentence) {
  let s = sentence.replace(/[。；;]$/, '');
  const cut = s.replace(/^（[^）]*）/g, m => m); // 保留开头括注（常为政权名）
  s = cut;
  if (s.length <= 24) return s;
  const comma = s.slice(0, 24).search(/[，,、：:]/);
  if (comma > 7) return s.slice(0, comma);
  return s.slice(0, 23) + '…';
}

/** 天文纪年格式化（-221 → 前221） */
const fmtYear = (y) => (y < 0 ? `前${1 - y}` : String(y));

const events = [];
let dropped = { pre: 0, post: 0, empty: 0 };

// ── 1) 维基年表解析 ─────────────────────────────
const seqByYear = new Map();
for (const lineRaw of raw.split('\n')) {
  const line = cleanRef(lineRaw);
  const m = line.match(/^(前)?(\d{1,4})年[：:](.+)$/);
  if (!m) continue;
  const year = m[1] ? 1 - Number(m[2]) : Number(m[2]);
  if (year < YEAR_MIN) { dropped.pre++; continue; }
  if (year > YEAR_MAX) { dropped.post++; continue; }
  // 按句拆分（保留句号归属），单句过短并入前句
  const clauses = m[3]
    .split(/(?<=。)/)
    .map((c) => cleanRef(c))
    .filter(Boolean);
  const merged = [];
  for (const c of clauses) {
    if (c.length < 6 && merged.length) merged[merged.length - 1] += c;
    else if (c.length >= 4) merged.push(c);
  }
  for (const clause of merged) {
    if (!clause || clause.length < 4) { dropped.empty++; continue; }
    const seq = (seqByYear.get(year) ?? 0) + 1;
    seqByYear.set(year, seq);
    const month = parseMonth(clause);
    const summary = clause.endsWith('。') || clause.length <= 60 ? clause : clause.slice(0, 59) + '…';
    events.push({
      id: `w-${year}-${String(seq).padStart(2, '0')}`,
      year,
      ...(month ? { month } : {}),
      title: makeTitle(clause),
      categories: classify(clause),
      polityIds: activeAt(year),
      summary,
      sources: ['S1'],
    });
  }
}

// ── 2) 人物生卒事件 ─────────────────────────────
for (const p of persons) {
  if (p.birth !== null && p.birth >= YEAR_MIN && p.birth <= YEAR_MAX) {
    events.push({
      id: `p-${p.id}-birth`, year: p.birth,
      title: `${p.name}出生`,
      categories: ['人物'], polityIds: p.polityIds,
      summary: `${p.summary}`,
      sources: ['S4'],
    });
  }
  if (p.death !== null && p.death >= YEAR_MIN && p.death <= YEAR_MAX) {
    events.push({
      id: `p-${p.id}-death`, year: p.death,
      title: `${p.name}去世`,
      categories: ['人物'], polityIds: p.polityIds,
      summary: `${p.summary}`,
      sources: ['S4'],
    });
  }
}

// ── 3) curated 合并（优先：同年前 10 字相同则丢弃自动条目） ──
const curatedKeys = new Set(curated.map((e) => `${e.year}|${e.title.slice(0, 10)}`));
const superseded = new Set(curated.flatMap(e => e.supersedes ?? []));
const autoFiltered = events.filter((e) => !superseded.has(e.id) && !curatedKeys.has(`${e.year}|${e.title.slice(0, 10)}`));
const all = [...curated, ...autoFiltered].sort((a, b) => a.year - b.year || (a.month ?? 13) - (b.month ?? 13));

// 重复 ID 防护
const seen = new Set();
const finalEvents = all.filter((e) => {
  if (seen.has(e.id)) return false;
  seen.add(e.id);
  return true;
});

writeFileSync(join(ROOT, 'data/events.json'), JSON.stringify(finalEvents, null, 1) + '\n');

// ── 报告 ────────────────────────────────────────
const byCat = {};
finalEvents.forEach((e) => e.categories.forEach((c) => (byCat[c] = (byCat[c] ?? 0) + 1)));
const years = new Set(finalEvents.map((e) => e.year));
console.log(`事件总数 ${finalEvents.length}（维基 ${autoFiltered.filter(e=>e.id.startsWith('w-')).length} · 人物生卒 ${autoFiltered.filter(e=>e.id.startsWith('p-')).length} · 手工 ${curated.length}）`);
console.log(`覆盖年份 ${years.size} 年（${fmtYear(Math.min(...years))} — ${fmtYear(Math.max(...years))}）`);
console.log(`分类分布 ${JSON.stringify(byCat)}`);
console.log(`丢弃：域前 ${dropped.pre} 行 / 共和后 ${dropped.post} 行 / 空句 ${dropped.empty}`);
