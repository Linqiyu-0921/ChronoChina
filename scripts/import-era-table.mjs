#!/usr/bin/env node
/**
 * 纪元表导入管线：data/raw/lidaijiy.htm（密西西比大学托管《中国历代纪元表》）
 *   → 解析 HTML 表格（rowspan 网格模型）
 *   → 生成政权/在位/年号三实体
 *   → 与 data/curated/ 手工数据合并（curated 优先，按 政权+年号 覆盖）
 *   → 写入 data/*.json，输出干支互验与异常报告
 *
 * 幂等：可重复运行；生成逻辑不依赖 data/*.json 的旧产物。
 * 用法：node scripts/import-era-table.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as cheerio from 'cheerio';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'data/raw/lidaijiy.htm'), 'utf8');

// ───────────────────────── 政权配置（id / 显示名 / 色系） ─────────────────────────
const POLITY_CFG = {
  qin: { name: '秦', color: '#7a3b2e' },
  'western-han': { name: '西汉', color: '#5d7391', note: '汉武帝建元（前 140）以前无年号，前期纪年以在位纪年追记。' },
  xin: { name: '新', color: '#a86e32' },
  gengshi: { name: '更始', color: '#8d6a8a' },
  'eastern-han': { name: '东汉', color: '#3d5a80' },
  wei: { name: '魏', fullName: '魏（曹魏）', color: '#9a4a3f' },
  'shu-han': { name: '蜀汉', color: '#5d7391', note: '自承汉统，色系与汉同族。' },
  wu: { name: '吴', fullName: '吴（孙吴）', color: '#46707a' },
  'western-jin': { name: '西晋', color: '#7f8a5a' },
  'eastern-jin': { name: '东晋', color: '#93a06b' },
  'liu-song': { name: '宋', fullName: '南朝宋', color: '#6f5480' },
  'southern-qi': { name: '齐', fullName: '南朝齐', color: '#87639c' },
  liang: { name: '梁', fullName: '南朝梁', color: '#9c74ae' },
  chen: { name: '陈', fullName: '南朝陈', color: '#b08cc0' },
  'northern-wei': { name: '北魏', color: '#8a5a3c' },
  'eastern-wei': { name: '东魏', color: '#a06a44' },
  'northern-qi': { name: '北齐', color: '#b47c50' },
  'western-wei': { name: '西魏', color: '#7d5033' },
  'northern-zhou': { name: '北周', color: '#96613d' },
  sui: { name: '隋', color: '#b03a3a' },
  tang: { name: '唐', color: '#b0722f', note: '690–705 武周（武后称帝改国号周）之年号本表系于唐纪之下，见天授条备注。' },
  'later-liang': { name: '后梁', color: '#5a7d5a' },
  'later-tang': { name: '后唐', color: '#6b8a63' },
  'later-jin': { name: '后晋', color: '#7c9a6b' },
  'later-han': { name: '后汉', color: '#8fae7a' },
  'later-zhou': { name: '后周', color: '#a2bf88' },
  song: { name: '宋', fullName: '北宋 → 南宋', color: '#3d5a80' },
  liao: { name: '辽', color: '#7c4f31' },
  jin: { name: '金', color: '#44707c' },
  yuan: { name: '元', color: '#5a5f8a', note: '1206 成吉思汗建蒙古汗国（无年号纪年），1271 忽必烈定国号大元。' },
  ming: { name: '明', color: '#b03d30' },
  'southern-ming': { name: '南明', color: '#c25e52' },
  qing: { name: '清', color: '#3e7c82', fullName: '清（含后金）', note: '1616 努尔哈赤称汗建后金，1636 皇太极改国号为清。' },
};

// 锚点 → 默认政权（行内无政权标记时沿用）
const ANCHOR_POLITY = {
  qin: 'qin', h: 'western-han', d: 'eastern-han', '3g': 'wei', jin: 'western-jin',
  n: 'liu-song', b: 'northern-wei', s: 'sui', t: 'tang', '5d': 'later-liang',
  bs: 'song', ns: 'song', l: 'liao', j: 'jin', y: 'yuan', m: 'ming', q: 'qing',
};

// 政权标记列（允许后缀 (年份-年份) / <BR>）
const MARKER_POLITY = {
  '秦': 'qin', '秦帝国': 'qin', '西汉': 'western-han', '东汉': 'eastern-han',
  '西晋': 'western-jin',
  '蜀汉': 'shu-han', '吴': 'wu', '魏': 'wei', '东晋': 'eastern-jin',
  '宋': 'liu-song', '齐': 'southern-qi', '梁': 'liang', '陈': 'chen',
  '北魏': 'northern-wei', '东魏': 'eastern-wei', '北齐': 'northern-qi',
  '西魏': 'western-wei', '北周': 'northern-zhou', '隋': 'sui', '唐': 'tang',
  '后梁': 'later-liang', '后唐': 'later-tang', '后晋': 'later-jin',
  '后汉': 'later-han', '后周': 'later-zhou', '北宋': 'song', '南宋': 'song',
  '辽': 'liao', '金': 'jin', '元': 'yuan', '明': 'ming', '南明': 'southern-ming',
  '清': 'qing',
};
// 时代列（只作分组，不产生政权）
const ERA_GROUP = new Set(['三国', '南朝', '北朝', '五代十国', '五代', '十六国', '晋', '汉', '秦汉', '隋唐', '宋元', '明清']);
// 君主名号 → 政权（王莽新朝、更始等表内无标记）
const RULER_POLITY = { '王莽': 'xin', '更始帝': 'gengshi' };
// 到此为止（民国及其后不入库）
const STOP_MARKER = /中華民國|中華人民共和國/;
// 原表笔误修正
const RULER_FIXUPS = [
  { polityId: 'qing', from: '世宗|爱新觉罗福临', title: '世祖' },
  { polityId: 'qing', from: '圣宗|爱新觉罗玄烨', title: '圣祖' },
  { polityId: 'qing', from: '文宗|爱新觉罗奕苎', name: '爱新觉罗奕詝' },
  { polityId: 'later-jin', from: '高祖|石敬塘', name: '石敬瑭' },
  { polityId: 'song', from: '恭帝|赵韅', name: '赵㬎' },
];
const MONTH_MAP = { 正: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12, 腊: 12 };
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const ganzhiOf = (y) => STEMS[((y - 4) % 10 + 10) % 10] + BRANCHES[((y - 4) % 12 + 12) % 12];

const report = { rows: 0, eras: 0, reigns: 0, skipped: [], ganzhiMismatch: [], clamped: [], noYear: [] };

// ───────────────────────── 表格 → 行网格 ─────────────────────────
const tables = html.match(/<TABLE border[^>]*>[\s\S]*?<\/TABLE>/g) ?? [];
const rowModels = [];

const markerKey = (text) => {
  // 取第一个括号/方括号前的头部（兼容「辽[耶律氏](907-1125)」「秦[秦帝国(...)]」）
  const head = text.replace(/<BR>|<br>/g, ' ').split(/[（(\[【]/)[0].replace(/\s+/g, '').trim();
  if (MARKER_POLITY[head]) return { kind: 'polity', id: MARKER_POLITY[head] };
  if (ERA_GROUP.has(head)) return { kind: 'group' };
  return null;
};

for (const tableHtml of tables) {
  const $ = cheerio.load(tableHtml);
  const pendings = []; // { col, remain, value, own } 活动 rowspan
  $('tr').each((_, tr) => {
    // 本行单元格先入数组，再按列位安插
    const cells = [];
    $(tr).children('td').each((i, td) => {
      const el = $(td);
      const rowspan = parseInt(el.attr('rowspan') ?? '1', 10) || 1;
      const colspan = parseInt(el.attr('colspan') ?? '1', 10) || 1;
      const own = i; // 用于识别该值是否为本行原生单元格
      const anchor = el.find('a[name]').attr('name');
      const links = el.find('a').map((__, a) => $(a).text().trim()).get().join('；');
      const text = el.text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
      cells.push({ rowspan, colspan, anchor, text, note: links, own });
    });
    if (!cells.length) return;
    // 表头行跳过
    if (cells.some((c) => c.text.includes('朝代') || c.text.includes('名号')) && cells.length <= 10 && cells.some((c) => c.text.includes('年号'))) return;

    const row = [];
    let col = 0;
    for (const c of cells) {
      while (pendings.some((p) => p.col === col && p.remain > 0)) {
        const p = pendings.find((x) => x.col === col && x.remain > 0);
        row[col] = { value: p.value, inherited: true, anchor: undefined };
        p.remain--; if (p.remain === 0) pendings.splice(pendings.indexOf(p), 1);
        col++;
      }
      for (let k = 0; k < c.colspan; k++) {
        row[col] = { value: k === 0 ? c.text : '', inherited: false, anchor: c.anchor, note: c.note };
        if (c.rowspan > 1) pendings.push({ col, remain: c.rowspan - 1, value: c.text });
        col++;
      }
    }
    // 行尾仍有活动 rowspan 的列补齐
    let maxCol = Math.max(col, ...pendings.map((p) => p.col + 1), row.length);
    for (let c2 = 0; c2 < maxCol; c2++) {
      if (row[c2] === undefined) {
        const p = pendings.find((x) => x.col === c2 && x.remain > 0);
        if (p) { row[c2] = { value: p.value, inherited: true }; p.remain--; if (!p.remain) pendings.splice(pendings.indexOf(p), 1); }
        else row[c2] = { value: '', inherited: false };
      }
    }
    rowModels.push(row.slice(0, 10));
  });
}

// ───────────────────────── 行模型 → 实体 ─────────────────────────
let currentPolity = null;
const reigns = [];
const eras = [];
let curReign = null;

for (const row of rowModels) {
  const anchors = row.filter((c) => c && c.anchor).map((c) => c.anchor);
  for (const a of anchors) if (ANCHOR_POLITY[a]) currentPolity = ANCHOR_POLITY[a];

  // 识别行首的时代/政权标记列
  let idx = 0;
  let politySwitch = null;
  while (idx < 3) {
    const cell = row[idx];
    if (!cell || !cell.value) break;
    if (STOP_MARKER.test(cell.value)) { currentPolity = null; break; }
    const mk = markerKey(cell.value);
    if (mk?.kind === 'polity') { politySwitch = mk.id; idx++; continue; }
    if (mk?.kind === 'group') { idx++; continue; }
    break;
  }
  if (politySwitch) currentPolity = politySwitch;
  if (!currentPolity) { report.skipped.push(row.map((c) => c?.value ?? '').join('|').slice(0, 60)); continue; }
  if (STOP_MARKER.test((row.find((c) => c?.value) ?? { value: '' }).value)) { currentPolity = null; continue; }

  // 干支锚定对齐：找到干支两字列，向两侧推定 名号/姓名/年号/年数/月份/公元年
  // 免疫 colspan 空位、rowspan 错位（王莽行、宣统行、隋唐首行等）
  const restCells = row.slice(idx);
  const gzRe = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/;
  const gzIdx = restCells.findIndex((c) => c && gzRe.test((c.value ?? '').replace(/^巳/, '己').trim()));
  if (gzIdx < 2) { report.skipped.push(`[${currentPolity}] ` + row.map((c) => c?.value ?? '').join('|').slice(0, 60)); continue; }
  const at = (i) => (restCells[i]?.value ?? '').replace(/\s+/g, '');
  const title = at(gzIdx - 4);
  const name = at(gzIdx - 3);
  // 年号中的括注变体：大(太)康 → 大康；(后元) → 后元（西汉追称段）
  const eraRaw = (restCells[gzIdx - 2]?.value ?? '').replace(/\*/g, '').trim();
  const variant = eraRaw.match(/[（(][^）)]*[）)]/);
  const variantInner = variant ? variant[0].slice(1, -1) : '';
  const eraName = eraRaw.replace(/[（(][^）)]*[）)]/g, '') || variantInner;
  const yearsRaw = at(gzIdx - 1);
  const ganzhi = (restCells[gzIdx]?.value ?? '').replace(/^巳/, '己').trim();
  const monthRaw = (restCells[gzIdx + 1]?.value ?? '').trim();
  const yearRaw = (restCells[gzIdx + 2]?.value ?? '').trim();
  const noteRaw = (restCells[gzIdx + 3]?.value ?? '').trim();

  const yearsUsed = parseInt(yearsRaw.replace(/[^\d]/g, ''), 10);
  let startYear = null;
  const bc = yearRaw.match(/前\s*(\d{1,4})/);
  const ad = yearRaw.match(/(\d{1,4})\s*年?/);
  if (bc) startYear = 1 - Number(bc[1]);
  else if (ad) startYear = Number(ad[1]);
  if (startYear === null || Number.isNaN(startYear)) { report.skipped.push(`[${currentPolity}] ` + row.map((c) => c?.value ?? '').join('|').slice(0, 60)); continue; }
  report.rows++;

  // 君主切换：名号/姓名列有本行原生单元格值（rowspan 续行不算新君）
  const titleCell = restCells[gzIdx - 4];
  const nameCell = restCells[gzIdx - 3];
  const hasRuler = (title || name) && !(titleCell?.inherited && nameCell?.inherited) && !(title === '' && name === '');
  if (hasRuler) {
    let effTitle = title || name;
    let effName = title ? name : '';
    if (RULER_POLITY[effTitle]) currentPolity = RULER_POLITY[effTitle];
    for (const f of RULER_FIXUPS) {
      if (f.polityId === currentPolity && f.from === `${effTitle}|${effName}`) {
        if (f.title) effTitle = f.title;
        if (f.name) effName = f.name;
      }
    }
    curReign = { id: `${currentPolity}-${effTitle || '君'}-${startYear}`, polityId: currentPolity, title: effTitle || '（不详）', name: effName || '—', startYear, endYear: startYear };
    reigns.push(curReign);
    report.reigns++;
  }
  // 续行沿用当前君主归属：王莽天凤/地皇等行首仍标「西汉」，须跟随君主归入新朝（在位切换判断之前）
  if (curReign && RULER_POLITY[curReign.title]) currentPolity = RULER_POLITY[curReign.title];
  if (!curReign || curReign.polityId !== currentPolity) {
    curReign = { id: `${currentPolity}-系表-${startYear}`, polityId: currentPolity, title: '（表内未分列）', name: '—', startYear, endYear: startYear };
    reigns.push(curReign);
    report.reigns++;
  }

  // 月份
  let startMonth;
  let monthNote = '';
  if (monthRaw) {
    const m = monthRaw.replace(/\s/g, '');
    const leap = m.startsWith('闰');
    const mm = m.replace(/^闰/, '');
    const key = mm.replace(/月$/, '');
    const num = MONTH_MAP[key];
    if (num) { startMonth = num; if (leap) monthNote = '（闰月）'; }
  }

  const note = [noteRaw && !noteRaw.match(/^\d/) ? noteRaw : '', monthNote, variant ? `原表作「${eraRaw}」` : ''].filter(Boolean).join(' ');
  const effEraName = eraName === '' || eraName === '-' ? '无年号' : eraName;

  const era = {
    id: `${currentPolity}-${effEraName}-${startYear}`,
    polityId: currentPolity,
    name: effEraName,
    reignIds: [curReign.id],
    startYear,
    ...(startMonth ? { startMonth } : {}),
    yearsUsed: Number.isNaN(yearsUsed) ? undefined : yearsUsed,
    note: note || undefined,
    sources: ['S3'],
    ...(eraName.includes('*') ? { disputed: true } : {}),
  };
  if (effEraName === '无年号') era.note = [era.note, '此期无年号纪年（追记）'].filter(Boolean).join('；');
  eras.push(era);
  if (ganzhi && ganzhi.length === 2 && STEMS.includes(ganzhi[0]) && BRANCHES.includes(ganzhi[1])) {
    if (ganzhi !== ganzhiOf(startYear)) report.ganzhiMismatch.push(`${currentPolity} ${effEraName} ${startYear}年 表注${ganzhi} 算得${ganzhiOf(startYear)}`);
  }
}

  // 年号收尾：endYear = start + 年数 - 1；越过后一年号起点则截齐；同年同号的分段 ID 去重
  const seenIds = new Map();
  for (let i = 0; i < eras.length; i++) {
    const e = eras[i];
    const next = eras.slice(i + 1).find((n) => n.polityId === e.polityId);
    let end = e.yearsUsed ? e.startYear + e.yearsUsed - 1 : next ? next.startYear : e.startYear;
    if (next && end > next.startYear) { end = next.startYear; report.clamped.push(`${e.polityId} ${e.name} ${e.startYear} 截齐至 ${end}`); }
    e.endYear = end;
    if (!e.yearsUsed) report.noYear.push(`${e.polityId} ${e.name} ${e.startYear}`);
    delete e.yearsUsed;
    const n = (seenIds.get(e.id) ?? 0) + 1;
    seenIds.set(e.id, n);
    if (n > 1) e.id = `${e.id}-${n}`;
  }
// 在位收尾
for (const r of reigns) {
  const own = eras.filter((e) => e.reignIds.includes(r.id));
  if (own.length) r.endYear = Math.max(r.startYear, ...own.map((e) => e.endYear));
}

// 政权起讫
const polities = Object.entries(POLITY_CFG).map(([id, cfg]) => {
  const es = eras.filter((e) => e.polityId === id);
  return {
    id, name: cfg.name, ...(cfg.fullName ? { fullName: cfg.fullName } : {}),
    ...(es.length ? { startYear: Math.min(...es.map((e) => e.startYear)), endYear: Math.max(...es.map((e) => e.endYear)) } : { startYear: 0, endYear: 0 }),
    color: cfg.color, ...(cfg.note ? { note: cfg.note } : {}), sources: ['S3'],
  };
}).filter((p) => p.endYear > p.startYear || POLITY_CFG[p.id]);

// ───────────────────────── 与 curated 合并（curated 优先） ─────────────────────────
const readCurated = (f) => JSON.parse(readFileSync(join(root, 'data/curated', f), 'utf8'));
const cPolities = readCurated('polities.json');
const cReigns = readCurated('reigns.json');
const cEras = readCurated('eras.json');

// 政权：curated 整条覆盖（含西辽/大理），生成条目保留其余
const mergedPolities = [...polities];
for (const cp of cPolities) {
  const i = mergedPolities.findIndex((p) => p.id === cp.id);
  if (i >= 0) mergedPolities[i] = { ...mergedPolities[i], ...cp };
  else mergedPolities.push(cp);
}

// 在位：键 = 政权+庙号+起始年
const reignKey = (r) => `${r.polityId}|${r.title.replace(/（.*?）/g, '')}|${r.startYear}`;
const mergedReigns = [...reigns];
const keyToId = new Map(mergedReigns.map((r) => [reignKey(r), r.id]));
for (const cr of cReigns) {
  const match = mergedReigns.find((r) => reignKey(r) === reignKey(cr) && r.polityId === cr.polityId);
  if (match) { keyToId.set(reignKey(cr), match.id); Object.assign(match, { ...match, ...cr, id: match.id }); }
  else { mergedReigns.push(cr); keyToId.set(reignKey(cr), cr.id); }
}

// 年号：键 = 政权+年号名；curated 覆盖字段并重绑 reignIds；同名生成段若与 curated 时段重叠则移除（如金·天会）
const mergedEras = [...eras];
for (const ce of cEras) {
  const gi = mergedEras.findIndex((e) => e.polityId === ce.polityId && e.name === ce.name);
  const mapped = { ...ce, reignIds: ce.reignIds.map((rid) => {
    const cr = cReigns.find((r) => r.id === rid);
    return cr ? (keyToId.get(reignKey(cr)) ?? rid) : rid;
  }) };
  if (gi >= 0) {
    mergedEras[gi] = { ...mergedEras[gi], ...mapped };
    for (let j = mergedEras.length - 1; j >= 0; j--) {
      if (j !== gi && mergedEras[j].polityId === ce.polityId && mergedEras[j].name === ce.name
        && mergedEras[j].startYear <= mapped.endYear && mergedEras[j].endYear >= mapped.startYear) {
        mergedEras.splice(j, 1);
        if (j < gi) gi--;
      }
    }
  } else mergedEras.push(mapped);
}

// 排序：政权按起始年，年号按政权序 + 起始年；非 curated 政权按最终年号重算起讫
const cPolityIds = new Set(cPolities.map((p) => p.id));
for (const p of mergedPolities) {
  if (cPolityIds.has(p.id)) continue;
  const es = mergedEras.filter((e) => e.polityId === p.id);
  if (es.length) {
    p.startYear = Math.min(...es.map((e) => e.startYear));
    p.endYear = Math.max(...es.map((e) => e.endYear));
  }
}
const pOrder = new Map(mergedPolities.slice().sort((a, b) => a.startYear - b.startYear).map((p, i) => [p.id, i]));
mergedPolities.sort((a, b) => a.startYear - b.startYear);
mergedReigns.sort((a, b) => (pOrder.get(a.polityId) ?? 0) - (pOrder.get(b.polityId) ?? 0) || a.startYear - b.startYear);
mergedEras.sort((a, b) => (pOrder.get(a.polityId) ?? 0) - (pOrder.get(b.polityId) ?? 0) || a.startYear - b.startYear);

writeFileSync(join(root, 'data/polities.json'), JSON.stringify(mergedPolities, null, 2) + '\n');
writeFileSync(join(root, 'data/reigns.json'), JSON.stringify(mergedReigns, null, 2) + '\n');
writeFileSync(join(root, 'data/eras.json'), JSON.stringify(mergedEras, null, 2) + '\n');

// ───────────────────────── 报告 ─────────────────────────
const line = '─'.repeat(52);
console.log(line);
console.log(`纪元表导入完成：数据行 ${report.rows} · 在位 ${mergedReigns.length} · 年号 ${mergedEras.length} · 政权 ${mergedPolities.length}`);
console.log(`干支互验不符：${report.ganzhiMismatch.length} 条${report.ganzhiMismatch.length ? '\n  ' + report.ganzhiMismatch.slice(0, 20).join('\n  ') : ''}`);
console.log(`年数截齐：${report.clamped.length} 条${report.clamped.length ? '\n  ' + report.clamped.slice(0, 15).join('\n  ') : ''}`);
console.log(`缺年数（按后继年号推算讫年）：${report.noYear.length} 条`);
console.log(`跳过行：${report.skipped.length} 条${report.skipped.length ? '\n  ' + [...new Set(report.skipped)].join('\n  ') : ''}`);
console.log(line);
