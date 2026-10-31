import type { HistEvent, Source } from './data';
import { formatYearFull, ganzhiOf } from './time';

export const CITATION_ORIGIN = 'https://cinian.laneqiyu.cn';

export const eventPath = (ev: Pick<HistEvent, 'id' | 'year'>) =>
  `/?year=${ev.year}&event=${encodeURIComponent(ev.id)}`;

export function eventPermalink(ev: Pick<HistEvent, 'id' | 'year'>, origin?: string): string {
  const base = origin ?? (typeof location !== 'undefined' ? location.origin : CITATION_ORIGIN);
  return `${base}${eventPath(ev)}`;
}

export function eventCitation(ev: HistEvent, sources: Source[], origin?: string): string {
  const links = ev.sources
    .map((id) => sources.find((s) => s.id === id))
    .filter((s): s is Source => Boolean(s));
  const sourceText = links.length
    ? links.map((s) => (s.url ? `${s.name}（${s.url}）` : s.name)).join('；')
    : '来源待补';
  const month = ev.month ? ` ${ev.month} 月` : '';
  const doubt = ev.confidence === 'low' ? '（存疑）' : '';
  return `“${ev.title}”${doubt}，${formatYearFull(ev.year)}${month}（${ganzhiOf(ev.year)}年），此年 · ChronoChina，${eventPermalink(ev, origin)}\n来源：${sourceText}`;
}
