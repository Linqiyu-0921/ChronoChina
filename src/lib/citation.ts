import type { HistEvent, Source } from './data';
import { formatYearFull, ganzhiOf } from './time';

export const CITATION_ORIGIN = 'https://cinian.laneqiyu.cn';

export type CitationFormat = 'plain' | 'gbt7714';

const todayStamp = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const eventPath = (ev: Pick<HistEvent, 'id' | 'year'>) =>
  `/?year=${ev.year}&event=${encodeURIComponent(ev.id)}`;

export function eventPermalink(ev: Pick<HistEvent, 'id' | 'year'>, origin?: string): string {
  const base = origin ?? (typeof location !== 'undefined' ? location.origin : CITATION_ORIGIN);
  return `${base}${eventPath(ev)}`;
}

export function eventCitation(
  ev: HistEvent,
  sources: Source[],
  origin?: string,
  format: CitationFormat = 'plain',
  accessDate = todayStamp(),
): string {
  const doubt = ev.confidence === 'low' ? '（存疑）' : '';
  if (format === 'gbt7714') {
    const when = `${formatYearFull(ev.year).replace(/\s+/g, '')}${ev.month ? `${ev.month}月` : ''}`;
    return `此年 · ChronoChina. ${ev.title}${doubt}（${when}）[EB/OL]. [${accessDate}]. ${eventPermalink(ev, origin)}.`;
  }
  const links = ev.sources
    .map((id) => sources.find((s) => s.id === id))
    .filter((s): s is Source => Boolean(s));
  const sourceText = links.length
    ? links.map((s) => (s.url ? `${s.name}（${s.url}）` : s.name)).join('；')
    : '来源待补';
  const month = ev.month ? ` ${ev.month} 月` : '';
  return `“${ev.title}”${doubt}，${formatYearFull(ev.year)}${month}（${ganzhiOf(ev.year)}年），此年 · ChronoChina，${eventPermalink(ev, origin)}\n来源：${sourceText}`;
}
