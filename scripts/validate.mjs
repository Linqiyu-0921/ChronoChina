#!/usr/bin/env node
/**
 * ChronoChina 数据校验脚本
 * 检查：ID 唯一性、朝代/在位/年号区间一致性、年号连续性（同年交接允许）、
 *       事件年份与引用、干支锚点交叉核对。
 * 用法：node scripts/validate.mjs   （构建时自动执行，可单独运行）
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => JSON.parse(readFileSync(join(root, 'data', name), 'utf8'));

const meta = read('meta.json');
const polities = read('polities.json');
const reigns = read('reigns.json');
const eras = read('eras.json');
const events = read('events.json');
const persons = read('persons.json');
const sources = read('sources.json');
const sites = read('sites.json');

const errors = [];
const warns = [];
const infos = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
const info = (m) => infos.push(m);

// ---------- 干支引擎（与 src/lib/time.ts 同一算法，锚点交叉核对） ----------
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ganzhiOf = (y) =>
  STEMS[((y - 4) % 10 + 10) % 10] + BRANCHES[((y - 4) % 12 + 12) % 12];

// 锚点来自《中国历代纪元表》通表：元年干支 ↔ 公元年
const GANZHI_ANCHORS = {
  1123: '癸卯', // 金·天会元年
  1124: '甲辰', // 西辽·延庆元年（取通说）
  1126: '丙午', // 宋·靖康元年
  1127: '丁未', // 宋·建炎元年 / 夏·正德元年
  1131: '辛亥', // 宋·绍兴元年
  1134: '甲寅', // 西辽·康国元年
  1135: '乙卯', // 夏·大德元年
  1119: '己亥', // 宋·宣和元年 / 夏·元德元年
  1121: '辛丑', // 辽·保大元年
  1111: '辛卯', // 辽·天庆元年
  [-220]: '庚辰', // 秦王政二十六年（前 221，天文纪年 -220）
};
for (const [y, g] of Object.entries(GANZHI_ANCHORS)) {
  const got = ganzhiOf(Number(y));
  if (got !== g) err(`干支锚点失败：${y} 期望 ${g}，算得 ${got}`);
}

// ---------- ID 唯一性与引用 ----------
const checkIds = (rows, label) => {
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.id)) err(`${label} ID 重复：${r.id}`);
    seen.add(r.id);
  }
};
checkIds(polities, 'polity');
checkIds(reigns, 'reign');
checkIds(eras, 'era');
checkIds(events, 'event');
checkIds(persons, 'person');
checkIds(sources, 'source');
checkIds(sites, 'site');

const polityIds = new Set(polities.map((p) => p.id));
const reignIds = new Set(reigns.map((r) => r.id));
const sourceIds = new Set(sources.map((s) => s.id));

// ---------- 在位（Reign） ----------
for (const r of reigns) {
  if (!polityIds.has(r.polityId)) err(`reign ${r.id} 引用不存在的政权 ${r.polityId}`);
  if (r.startYear > r.endYear) err(`reign ${r.id} 起讫倒置`);
  const p = polities.find((x) => x.id === r.polityId);
  if (p && (r.startYear < p.startYear || r.endYear > p.endYear)) {
    if (p.precision !== 'approx') err(`reign ${r.id} 超出政权 ${p.id} 起讫`);
    else warn(`reign ${r.id} 超出政权 ${p.id} 起讫（approx 政权，放行）`);
  }
}

// ---------- 年号使用（EraUse） ----------
for (const e of eras) {
  if (!polityIds.has(e.polityId)) err(`era ${e.id} 引用不存在的政权 ${e.polityId}`);
  if (e.startYear > e.endYear) err(`era ${e.id} 起讫倒置`);
  if (!e.reignIds?.length) err(`era ${e.id} 缺少 reignIds`);
  for (const rid of e.reignIds) {
    if (!reignIds.has(rid)) err(`era ${e.id} 引用不存在的 reign ${rid}`);
    else {
      const r = reigns.find((x) => x.id === rid);
      if (r.polityId !== e.polityId) err(`era ${e.id} 引用了他政权的 reign ${rid}`);
    }
  }
  if (e.crossReign && e.reignIds.length < 2) err(`era ${e.id} 标记 crossReign 但只挂一个在位`);
  if (e.startMonth && (e.startMonth < 1 || e.startMonth > 12)) err(`era ${e.id} startMonth 非法`);
  if (!e.sources?.length) err(`era ${e.id} 缺少来源`);
  if (e.sources) for (const s of e.sources) if (!sourceIds.has(s)) err(`era ${e.id} 引用不存在的来源 ${s}`);
}

// 年号连续性：按政权分组，检查衔接与重叠；同年交接（如 1127 靖康→建炎）允许
for (const p of polities) {
  const list = eras.filter((e) => e.polityId === p.id).sort((a, b) => a.startYear - b.startYear);
  if (list.length && (list[0].startYear > p.startYear || list[list.length - 1].endYear < p.endYear)) info(`${p.name} 政权首尾存在纪年缺录，界面须保留存续底带`);
  const loose = p.precision === 'approx';
  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1];
    const cur = list[i];
    if (cur.startYear < prev.endYear) {
      const msg = `${p.name} 年号跨年重叠：${prev.name}(${prev.startYear}–${prev.endYear}) 与 ${cur.name}(${cur.startYear}–${cur.endYear})`;
      loose ? warn(msg + '（approx，放行）') : err(msg);
    } else if (cur.startYear === prev.endYear) {
      info(`${p.name} ${prev.startYear === prev.endYear ? '' : ''}${prev.name} → ${cur.name} 同年交接于 ${cur.startYear}（须有月份/备注佐证）`);
    } else if (cur.startYear > prev.endYear + 1) {
      const msg = `${p.name} 年号断档：${prev.name} 终于 ${prev.endYear}，${cur.name} 起于 ${cur.startYear}`;
      loose ? warn(msg + '（approx，放行）') : err(msg);
    }
  }
}

// ---------- 事件（Event） ----------
for (const ev of events) {
  if (ev.year < meta.scope.startYear || ev.year > meta.scope.endYear) {
    warn(`event ${ev.id} 年份 ${ev.year} 超出种子范围 ${meta.scope.startYear}–${meta.scope.endYear}`);
  }
  if (ev.month && (ev.month < 1 || ev.month > 12)) err(`event ${ev.id} month 非法`);
  if (!ev.polityIds) err(`event ${ev.id} 缺少 polityIds 字段`);
  else if (ev.polityIds.length === 0) warn(`event ${ev.id} polityIds 为空（无政权关联）`);
  for (const pid of ev.polityIds) if (!polityIds.has(pid)) err(`event ${ev.id} 引用不存在的政权 ${pid}`);
  if (!ev.sources?.length) err(`event ${ev.id} 缺少来源`);
  for (const s of ev.sources ?? []) if (!sourceIds.has(s)) err(`event ${ev.id} 引用不存在的来源 ${s}`);
}


// ---------- 人物（Person） ----------
for (const p of persons) {
  if (!p.name) err(`person ${p.id} 缺少 name`);
  if (!p.field) err(`person ${p.id} 缺少 field`);
  if (!p.summary) err(`person ${p.id} 缺少 summary`);
  if (p.birth !== null && p.death !== null && p.birth > p.death) err(`person ${p.id} 生卒倒置 ${p.birth} > ${p.death}`);
  if (p.birth !== null && (p.birth < -600 || p.birth > 1911)) err(`person ${p.id} birth ${p.birth} 异常`);
  // 清末人物多卒于民国，生卒允许略越出纪元表覆盖终点
  if (p.death !== null && (p.death < -600 || p.death > 1949)) err(`person ${p.id} death ${p.death} 异常`);
  for (const pid of p.polityIds ?? []) if (!polityIds.has(pid)) err(`person ${p.id} 引用不存在的政权 ${pid}`);
}

// ---------- 遗产（Site） ----------
for (const s of sites) {
  if (!s.category) err(`site ${s.id} 缺少 category`);
  if (!s.dynasty) err(`site ${s.id} 缺少 dynasty`);
  if (!s.place) err(`site ${s.id} 缺少 place`);
  if (!s.polityIds) err(`site ${s.id} 缺少 polityIds（可为空数组）`);
  for (const pid of s.polityIds ?? []) if (!polityIds.has(pid)) err(`site ${s.id} 引用不存在的政权 ${pid}`);
  for (const src of s.sources ?? []) if (!sourceIds.has(src)) err(`site ${s.id} 引用不存在的来源 ${src}`);
  if (s.builtYear !== undefined && (s.builtYear < -3000 || s.builtYear > 2026)) err(`site ${s.id} builtYear 异常`);
  if (s.builtRange && s.builtRange[0] > s.builtRange[1]) err(`site ${s.id} builtRange 倒置`);
  if (s.whs !== undefined && (s.whs < 1985 || s.whs > 2030)) err(`site ${s.id} whs 年份异常`);
  if (s.coords) {
    const [lng, lat] = s.coords;
    if (lng < 70 || lng > 140 || lat < 15 || lat > 55) err(`site ${s.id} 坐标超出中国范围 ${s.coords}`);
  }
  if (!s.builtYear && !s.builtRange && !s.period) err(`site ${s.id} 缺少年代信息（builtYear/builtRange/period）`);
}

// ---------- 汇总 ----------
const line = '─'.repeat(52);
console.log(line);
console.log(`ChronoChina 数据校验 · 范围 ${meta.scope.startYear}–${meta.scope.endYear} · v${meta.version}`);
console.log(line);
console.log(`政权 ${polities.length} · 在位 ${reigns.length} · 年号 ${eras.length} · 事件 ${events.length} · 人物 ${persons.length} · 遗产 ${sites.length} · 来源 ${sources.length}`);
console.log(`干支锚点核对：${Object.keys(GANZHI_ANCHORS).length} 条全部${errors.some((e) => e.includes('干支')) ? '存在失败' : '通过'}`);
if (infos.length) {
  console.log(`\nℹ 提示 ${infos.length}：`);
  infos.forEach((m) => console.log(`  · ${m}`));
}
if (warns.length) {
  console.log(`\n⚠ 警告 ${warns.length}：`);
  warns.forEach((m) => console.log(`  · ${m}`));
}
if (errors.length) {
  console.log(`\n✗ 错误 ${errors.length}：`);
  errors.forEach((m) => console.log(`  · ${m}`));
  console.log(line);
  process.exit(1);
}
console.log(`\n✓ 校验通过（警告 ${warns.length} 条）`);
console.log(line);
