import { polities, reigns, eras, persons, events, sites, eraCoverage } from './data';
import { parseQuery } from './convert';
import { eraDisplayName, formatYear } from './time';
import { PERIOD_GROUPS, POLITY_ALIASES } from './navigation';
import { getLang, S, t, type Lang } from './i18n';
export interface SearchHit { id: string; title: string; category: string; subtitle: string; year: number; polityId?: string; eraId?: string; aliases?: string[]; score?: number; }
const inScope = (year: number) => year >= eraCoverage.min && year <= eraCoverage.max;
const normalize = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\s·、，,。-]/g, '');
const yearText = (y: number) => getLang() === 'en' ? formatYear(y) : `${formatYear(y)}年`;

/** 繁体输入先换回数据里的简体写法；年号「乾貞→乾贞」这类一对多的字，靠数据反查表纠正 */
let reverseNames: [string, string][] | null = null;
function toSimplifiedQuery(raw: string): string {
  if (getLang() !== 'zh-Hant') return raw;
  if (!reverseNames) {
    const names = new Set<string>();
    for (const p of polities) names.add(p.name);
    for (const r of reigns) { names.add(r.title); if (r.name) names.add(r.name); }
    for (const e of eras) if (!e.name.includes('无年号')) names.add(eraDisplayName(e.name));
    for (const p of persons) names.add(p.name);
    for (const s of sites) names.add(s.name);
    reverseNames = [...names]
      .map((n) => [S(n), n] as [string, string])
      .filter(([a, b]) => a !== b)
      .sort((a, b) => b[0].length - a[0].length);
  }
  let out = raw;
  for (const [trad, simp] of reverseNames) if (out.includes(trad)) out = out.split(trad).join(simp);
  return out;
}

function buildIndex(): SearchHit[] { return ( [
  ...polities.map(p => ({ id: p.id, title: p.name, category: t('cat.polity'), subtitle: `${formatYear(p.startYear)}—${formatYear(p.endYear)}`, year: p.startYear, polityId: p.id, aliases: POLITY_ALIASES[p.id] ?? [] })),
  ...PERIOD_GROUPS.map(p => ({ id: `period-${p.name}`, title: p.name, category: t('cat.period'), subtitle: `${formatYear(p.start)}—${formatYear(p.end)}`, year: p.start, aliases: p.name === '三国两晋' ? ['三国', 'sanguo'] : [] })),
  ...reigns.map(r => ({ id: r.id, title: `${r.title} · ${r.name}`, category: t('cat.ruler'), subtitle: `${polities.find(p => p.id === r.polityId)?.name} · ${formatYear(r.startYear)}—${formatYear(r.endYear)}`, year: r.startYear, polityId: r.polityId, aliases: [r.name, r.title, ...(r.name.includes('嬴政') ? ['秦始皇', 'yingzheng', 'qinshihuang'] : [])] })),
  ...eras.filter(e => !e.name.includes('无年号')).map(e => ({ id: e.id, title: eraDisplayName(e.name), category: t('cat.era'), subtitle: `${polities.find(p => p.id === e.polityId)?.name} · ${formatYear(e.startYear)}—${formatYear(e.endYear)}`, year: e.startYear, polityId: e.polityId, eraId: e.id })),
  ...persons.filter(p => p.birth !== null).map(p => ({ id: p.id, title: p.name, category: t('cat.person'), subtitle: getLang() === 'en' ? `${p.field} · born ${formatYear(p.birth!)}` : `${p.field} · 生年 ${formatYear(p.birth!)}`, year: p.birth! })),
  ...events.map(e => ({ id: e.id, title: e.title, category: t('cat.event'), subtitle: yearText(e.year), year: e.year })),
  ...sites.map(s => ({ id: s.id, title: s.name, category: t('cat.site'), subtitle: s.place, year: s.builtYear ?? s.builtRange?.[0] ?? NaN })),
] as SearchHit[]).filter(h => Number.isFinite(h.year) && inScope(h.year)); }
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
let cached: { lang: Lang; hits: SearchHit[] } | null = null;
function getIndex(): SearchHit[] {
  if (cached?.lang === getLang()) return cached.hits;
  const hits = buildIndex();
  cached = { lang: getLang(), hits };
  return hits;
}
export function searchHistory(raw: string): SearchHit[] {
  const source = toSimplifiedQuery(raw);
  const q = normalize(source);
  if (!q) return [];
  const parsed = parseQuery(source);
  if (parsed.kind === 'year') return inScope(parsed.year) ? [{ id: `year-${parsed.year}`, title: yearText(parsed.year), category: t('cat.year'), subtitle: t('sp.yearHitHint'), year: parsed.year, score: 0 }] : [];
  if (/^(?:公元)?(?:前)?\d+年?$/.test(source.trim()) || /^[-−]\d/.test(source.trim())) return [];
  if (parsed.kind === 'era' && parsed.matches.some(m => m.year !== undefined)) return parsed.matches.map(m => {
    const e = eras.find(e => e.id === m.eraId)!;
    return { id: `${e.id}-${m.year}`, title: raw, category: t('cat.reignLabel'), subtitle: `${yearText(m.year!)} · ${polities.find(p => p.id === e.polityId)?.name}`, year: m.year!, polityId: e.polityId, eraId: e.id, score: 0 };
  });
  if (parsed.kind === 'ganzhi') return parsed.years.map(y => ({ id: `year-${y}`, title: yearText(y), category: t('cat.ganzhiCandidate'), subtitle: `${parsed.ganzhi}${getLang() === 'en' ? '' : '年'} · ${t('cat.ganzhiNote')}`, year: y, score: 0 }));
  return getIndex().map(h => ({ ...h, score: Math.min(match(q, h.title), ...(h.aliases ?? []).map(a => match(q, a) + 20)) })).filter(h => Number.isFinite(h.score)).sort((a, b) => a.score! - b.score! || a.year - b.year);
}
