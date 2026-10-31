import type { HistEvent, Source } from './data';
import { formatYearFull, ganzhiOf } from './time';
import { getLang, t } from './i18n';

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

export interface CitationOptions {
  origin?: string;
  format?: CitationFormat;
  accessDate?: string;
  number?: number;
}

export function eventCitation(ev: HistEvent, sources: Source[], options: CitationOptions = {}): string {
  const { origin, format = 'plain', accessDate = todayStamp(), number } = options;
  const prefix = number ? `[${number}] ` : '';
  const doubt = ev.confidence === 'low' ? t('cit.doubt') : '';
  if (format === 'gbt7714') {
    const when = `${formatYearFull(ev.year).replace(/\s+/g, '')}${ev.month ? `${ev.month}月` : ''}`;
    return `${prefix}此年 · ChronoChina. ${ev.title}${doubt}（${when}）[EB/OL]. [${accessDate}]. ${eventPermalink(ev, origin)}.`;
  }
  const links = ev.sources
    .map((id) => sources.find((s) => s.id === id))
    .filter((s): s is Source => Boolean(s));
  const sourceText = links.length
    ? links.map((s) => (s.url ? `${s.name}（${s.url}）` : s.name)).join('；')
    : t('cit.sourcePending');
  if (getLang() === 'en') {
    const monthEn = ev.month ? `, month ${ev.month}` : '';
    return `${prefix}“${ev.title}”${doubt}, ${formatYearFull(ev.year)}${monthEn} (${ganzhiOf(ev.year)} nian), ChronoChina, ${eventPermalink(ev, origin)}\nSources: ${sourceText}`;
  }
  const month = ev.month ? ` ${ev.month} 月` : '';
  return `${prefix}“${ev.title}”${doubt}，${formatYearFull(ev.year)}${month}（${ganzhiOf(ev.year)}年），此年 · ChronoChina，${eventPermalink(ev, origin)}\n来源：${sourceText}`;
}

export function citationList(
  list: HistEvent[],
  sources: Source[],
  options: CitationOptions & { numbered?: boolean } = {},
): string {
  const { numbered = true, ...rest } = options;
  const separator = (rest.format ?? 'plain') === 'gbt7714' ? '\n' : '\n\n';
  return list
    .map((ev, i) => eventCitation(ev, sources, { ...rest, number: numbered ? i + 1 : undefined }))
    .join(separator);
}
