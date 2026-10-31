/**
 * 数据访问层：加载 JSON、派生索引、按年展开各政权纪年。
 * 类型即契约：数据结构的说明见 README「数据模型」一节。
 */
import { formatYear } from './time';
import { getLang } from './i18n';
import { bySouthToNorth } from './geography';
import politiesJson from '../../data/polities.json';
import reignsJson from '../../data/reigns.json';
import erasJson from '../../data/eras.json';
import eventsJson from '../../data/events.json';
import personsJson from '../../data/persons.json';
import sourcesJson from '../../data/sources.json';
import metaJson from '../../data/meta.json';
import sitesJson from '../../data/sites.json';

export interface Polity {
  id: string;
  name: string;
  fullName?: string;
  startYear: number;
  endYear: number;
  color: string;
  family?: string;
  precision?: 'approx';
  note?: string;
}

export interface Reign {
  id: string;
  polityId: string;
  title: string;
  name: string;
  startYear: number;
  endYear: number;
  precision?: 'approx';
  note?: string;
}

export interface EraUse {
  id: string;
  polityId: string;
  name: string;
  reignIds: string[];
  startYear: number;
  startMonth?: number;
  endYear: number;
  crossReign?: boolean;
  disputed?: boolean;
  precision?: 'approx';
  note?: string;
  endNote?: string;
  sources?: string[];
}

export interface HistEvent {
  id: string;
  year: number;
  month?: number;
  title: string;
  categories: string[];
  polityIds: string[];
  summary: string;
  sources: string[];
  confidence?: 'low';
}

export interface Source {
  id: string;
  name: string;
  url: string;
  license: string;
  short: string;
  note?: string;
}

export interface Meta {
  name: string;
  title: string;
  version: string;
  scope: { startYear: number; endYear: number };
  coverage?: string;
  defaultView: [number, number];
  scopeNote?: string;
}

export interface Site {
  id: string;
  name: string;
  category: string;
  dynasty: string;
  polityIds: string[];
  builtYear?: number;
  builtRange?: [number, number];
  period?: string;
  place: string;
  coords?: [number, number];
  whs?: number;
  note?: string;
  sources: string[];
}

export const sites = sitesJson as unknown as Site[];

export const SITE_CATS = ['都城', '宫殿', '陵墓', '石窟', '宗教', '工程', '军事', '园林', '手工业', '聚落'];
export const SITE_CAT_COLOR: Record<string, string> = {
  都城: '#5d7391', 宫殿: '#8a2f2b', 陵墓: '#6b6656', 石窟: '#a86e32', 宗教: '#7a5a7f',
  工程: '#44707c', 军事: '#7c4f31', 园林: '#5a7d5a', 手工业: '#b0722f', 聚落: '#3e7c82',
};

export function siteJumpYear(s: Site): number | null {
  return s.builtYear ?? s.builtRange?.[0] ?? null;
}

export function sitePeriodLabel(s: Site): string {
  const unit = getLang() === 'en' ? '' : ' 年';
  if (s.builtRange) return `${formatYear(s.builtRange[0])}—${formatYear(s.builtRange[1])}${unit}`;
  if (typeof s.builtYear === 'number') return `${formatYear(s.builtYear)}${unit}`;
  return s.period ?? '—';
}

const POLITY_ALIAS: Record<string, string> = { 'liu-song': '刘宋', song: '赵宋' };
export const polities = (politiesJson as unknown as Polity[]).map(p => (POLITY_ALIAS[p.id] ? { ...p, name: POLITY_ALIAS[p.id] } : p));
export const reigns = reignsJson as unknown as Reign[];
export const eras = erasJson as unknown as EraUse[];
export const events = [...(eventsJson as unknown as HistEvent[])].sort(
  (a, b) => a.year - b.year || (a.month ?? 13) - (b.month ?? 13),
);
export const sources = sourcesJson as unknown as Source[];
export const meta = metaJson as unknown as Meta;

export const polityById = new Map(polities.map((p) => [p.id, p]));
export const reignById = new Map(reigns.map((r) => [r.id, r]));
export const sourceById = new Map(sources.map((s) => [s.id, s]));

/** 各政权年号按起始年排序 */
export const erasByPolity = new Map<string, EraUse[]>(
  polities.map((p) => [
    p.id,
    eras.filter((e) => e.polityId === p.id).sort((a, b) => a.startYear - b.startYear),
  ]),
);

export const eventsByYear = new Map<number, HistEvent[]>();
for (const ev of events) {
  const list = eventsByYear.get(ev.year) ?? [];
  list.push(ev);
  eventsByYear.set(ev.year, list);
}

/** 年号数据整体覆盖范围（检索候选域） */
export const eraCoverage = {
  min: Math.min(...eras.map((e) => e.startYear)),
  max: Math.max(...eras.map((e) => e.endYear)),
};

export const CAT_GLYPHS: Record<string, { shape: 'circle' | 'diamond' | 'triangle' | 'square' | 'cross' | 'ring' }> = {
  军事: { shape: 'triangle' },
  政治: { shape: 'circle' },
  外交: { shape: 'diamond' },
  制度: { shape: 'square' },
  人物: { shape: 'cross' },
  文化: { shape: 'ring' },
};
export const CATS = Object.keys(CAT_GLYPHS);

/** 历史人物（精选，手工维护 data/persons.json） */
export interface Person {
  id: string;
  name: string;
  birth: number | null; // 天文纪年
  death: number | null;
  polityIds: string[];
  field: string;
  summary: string;
}
export const persons = personsJson as unknown as Person[];

/** 某年在世人物（生卒俱全者） */
export const personsAliveAt = (year: number): Person[] =>
  persons.filter(
    (p) => p.birth !== null && p.death !== null && p.birth <= year && p.death > year,
  );

/** 某年某政权的纪年行 */
export interface YearEraRow {
  polity: Polity;
  era: EraUse;
  eraYearNo: number;
  ruler?: Reign;
  /** 该年此政权经历的君主更替（如 1135 金太宗→熙宗） */
  extraRulers: Reign[];
  isStart: boolean;
  isEnd: boolean;
}

function rulerForYear(era: EraUse, year: number): { ruler?: Reign; extra: Reign[] } {
  const rs = era.reignIds
    .map((id) => reignById.get(id))
    .filter((r): r is Reign => !!r && r.startYear <= year && r.endYear >= year)
    .sort((a, b) => a.startYear - b.startYear);
  const ruler = rs.length ? rs[rs.length - 1] : reignById.get(era.reignIds[era.reignIds.length - 1]);
  return { ruler, extra: rs.slice(0, -1) };
}

/** 按年展开所有政权的纪年（一个政权同年可能两行，如 1127 宋） */
export function eraRowsAtYear(year: number): YearEraRow[] {
  const rows: YearEraRow[] = [];
  for (const p of polities) {
    const list = erasByPolity.get(p.id) ?? [];
    for (const era of list) {
      if (era.startYear <= year && year <= era.endYear) {
        const { ruler, extra } = rulerForYear(era, year);
        rows.push({
          polity: p,
          era,
          eraYearNo: year - era.startYear + 1,
          ruler,
          extraRulers: extra,
          isStart: era.startYear === year,
          isEnd: era.endYear === year,
        });
      }
    }
  }
  return rows.sort((a, b) => bySouthToNorth(a.polity, b.polity));
}

export function sourceShort(ids?: string[]): string[] {
  return (ids ?? []).map((id) => sourceById.get(id)?.short ?? id);
}
