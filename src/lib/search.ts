import { polities, reigns, eras, persons, events, sites, eraCoverage } from './data';
import { parseQuery } from './convert';
import { eraDisplayName, formatYear } from './time';
import { PERIOD_GROUPS, POLITY_ALIASES } from './navigation';
export interface SearchHit { id: string; title: string; category: string; subtitle: string; year: number; polityId?: string; eraId?: string; aliases?: string[]; score?: number; }
const inScope = (year: number) => year >= eraCoverage.min && year <= eraCoverage.max;
const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\s·、，,。-]/g, '');
const index: SearchHit[] = [
  ...polities.map(p => ({ id: p.id, title: p.name, category: '政权', subtitle: `${formatYear(p.startYear)}—${formatYear(p.endYear)}`, year: p.startYear, polityId: p.id, aliases: POLITY_ALIASES[p.id] ?? [] })),
  ...PERIOD_GROUPS.map(p => ({ id: `period-${p.name}`, title: p.name, category: '时期', subtitle: `${formatYear(p.start)}—${formatYear(p.end)}`, year: p.start, aliases: p.name === '三国两晋' ? ['三国', 'sanguo'] : [] })),
  ...reigns.map(r => ({ id: r.id, title: `${r.title} · ${r.name}`, category: '帝王', subtitle: `${polities.find(p => p.id === r.polityId)?.name} · ${formatYear(r.startYear)}—${formatYear(r.endYear)}`, year: r.startYear, polityId: r.polityId, aliases: [r.name, r.title, ...(r.name.includes('嬴政') ? ['秦始皇', 'yingzheng', 'qinshihuang'] : [])] })),
  ...eras.filter(e => !e.name.includes('无年号')).map(e => ({ id: e.id, title: eraDisplayName(e.name), category: '年号', subtitle: `${polities.find(p => p.id === e.polityId)?.name} · ${formatYear(e.startYear)}—${formatYear(e.endYear)}`, year: e.startYear, polityId: e.polityId, eraId: e.id })),
  ...persons.filter(p => p.birth !== null).map(p => ({ id: p.id, title: p.name, category: '人物', subtitle: `${p.field} · 生年 ${formatYear(p.birth!)}`, year: p.birth! })),
  ...events.map(e => ({ id: e.id, title: e.title, category: '事件', subtitle: `${formatYear(e.year)}年`, year: e.year })),
  ...sites.map(s => ({ id: s.id, title: s.name, category: '遗产', subtitle: s.place, year: s.builtYear ?? s.builtRange?.[0] ?? NaN })),
].filter(h => Number.isFinite(h.year) && inScope(h.year));
function match(q: string, text: string) {
  const t = normalize(text);
  if (t === q) return 0;
  if (t.startsWith(q)) return 10;
  if (t.includes(q)) return 30;
  if (q.length < 2) return Infinity;
  let i = 0;
  for (const c of t) if (c === q[i]) i++;
  return i === q.length ? 50 + Math.min(20, t.length - q.length) : Infinity;
}
export function searchHistory(raw: string): SearchHit[] {
  const q = normalize(raw);
  if (!q) return [];
  const parsed = parseQuery(raw);
  if (parsed.kind === 'year') return inScope(parsed.year) ? [{ id: `year-${parsed.year}`, title: `${formatYear(parsed.year)}年`, category: '年份', subtitle: '直达同期政权与纪年', year: parsed.year, score: 0 }] : [];
  if (/^(?:公元)?(?:前)?\d+年?$/.test(raw.trim()) || /^[-−]\d/.test(raw.trim())) return [];
  if (parsed.kind === 'era' && parsed.matches.some(m => m.year !== undefined)) return parsed.matches.map(m => {
    const e = eras.find(e => e.id === m.eraId)!;
    return { id: `${e.id}-${m.year}`, title: raw, category: '纪年', subtitle: `${formatYear(m.year!)}年 · ${polities.find(p => p.id === e.polityId)?.name}`, year: m.year!, polityId: e.polityId, eraId: e.id, score: 0 };
  });
  if (parsed.kind === 'ganzhi') return parsed.years.map(y => ({ id: `year-${y}`, title: `${formatYear(y)}年`, category: '干支候选', subtitle: `${parsed.ganzhi}年 · 每六十年重复`, year: y, score: 0 }));
  return index.map(h => ({ ...h, score: Math.min(match(q, h.title), ...(h.aliases ?? []).map(a => match(q, a) + 20)) })).filter(h => Number.isFinite(h.score)).sort((a, b) => a.score! - b.score! || a.year - b.year);
}
