/**
 * 年份详情面板：公元 / 干支 / 各政权纪年 / 当年事件。
 * 被「时间轴侧栏」与「纪年检索」共用。
 */
import { useEffect, useRef, useState } from 'react';
import {
  CAT_GLYPHS,
  eraRowsAtYear,
  eventsByYear,
  meta,
  persons,
  polities,
  sourceById,
  sources,
  type HistEvent,
  type YearEraRow,
} from '../lib/data';
import { chineseNum, eraDisplayName, eraYearDisplay, formatYearFull, ganzhiOf, monthLabel, reignLabel } from '../lib/time';
import { citationList, eventCitation, eventPermalink, type CitationFormat } from '../lib/citation';
import { copyText } from '../lib/clipboard';
import { getLang, S, t } from '../lib/i18n';
import EventCategoryFilter from './EventCategoryFilter';
import Han from './Han';

interface Props {
  year: number | null;
  compact?: boolean;
  selectedEvent?: string | null;
  onSelectEvent?: (id: string | null) => void;
  onOpenRuler?: (reignId: string) => void;
}

function EraRow({ row, onOpenRuler }: { row: YearEraRow; onOpenRuler?: (reignId: string) => void }) {
  const { polity: p, era, ruler, extraRulers } = row;
  const monthHint =
    row.isStart && era.startMonth ? t('yp.monthChangeHint', { month: getLang() === 'en' ? era.startMonth : chineseNum(era.startMonth) }) : '';
  const endHint = row.isEnd && era.endNote ? t('yp.endHint', { note: era.endNote }) : '';
  const transition =
    extraRulers.length > 0 && ruler
      ? t('yp.transitionHint', { from: extraRulers[extraRulers.length - 1].title, to: ruler.title })
      : '';
  return (
    <article className="year-era-row">
      <div><span className="ghost-chip" style={{ color: p.color }}><Han text={p.name}/></span> <strong><Han text={eraDisplayName(era.name)}/>{eraYearDisplay(eraDisplayName(era.name), era.reignIds.length, row.eraYearNo)}</strong></div>
      <p>{ruler ? (onOpenRuler ? <button type="button" className="reign-link" onClick={() => onOpenRuler(ruler.id)}><Han text={reignLabel(ruler)}/></button> : <Han text={reignLabel(ruler)}/>) : t('yp.rulerMissing')} {monthHint}{transition}</p>
      <details><summary>{t('yp.details')}{era.disputed || p.precision ? t('yp.disputedFlag') : ''}</summary>
        <p>{S(endHint || era.note) || t('yp.noteFallback')}</p>
        {era.sources?.map(id => { const s = sourceById.get(id); return s?.url ? <a key={id} href={s.url} target="_blank" rel="noreferrer">{S(s.name)} </a> : <span key={id}>{S(s?.name)}</span>; })}
      </details>
    </article>
  );
}

export default function YearPanel({ year, selectedEvent, onSelectEvent, onOpenRuler, compact = false }: Props) {
  const [cat, setCat] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [citeFormat, setCiteFormat] = useState<CitationFormat>(() => {
    try { return localStorage.getItem('chronochina-citation-format') === 'plain' ? 'plain' : 'gbt7714'; } catch { return 'gbt7714'; }
  });
  const chooseCiteFormat = (format: CitationFormat) => {
    setCiteFormat(format);
    setCopied(null);
    try { localStorage.setItem('chronochina-citation-format', format); } catch {}
  };
  const [citeNumber, setCiteNumber] = useState(() => {
    try { return localStorage.getItem('chronochina-citation-numbering') !== '0'; } catch { return true; }
  });
  const chooseCiteNumber = (on: boolean) => {
    setCiteNumber(on);
    setCopied(null);
    try { localStorage.setItem('chronochina-citation-numbering', on ? '1' : '0'); } catch {}
  };
  const eventList = useRef<HTMLUListElement>(null);
  const copyTimer = useRef<number | null>(null);
  useEffect(() => { setCat(null); setCopied(null); }, [year]);
  useEffect(() => {
    if (!selectedEvent || year === null) return;
    const frame = requestAnimationFrame(() => {
      const el = eventList.current?.querySelector<HTMLElement>(`#event-${selectedEvent}`);
      if (!el) return;
      el.scrollIntoView({ block: 'nearest' });
      el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedEvent, year, cat]);
  useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current); }, []);
  if (year === null) {
    return (
      <aside className="yearpanel card">
        <p className="dim">{t('yp.clickHint')}</p>
      </aside>
    );
  }

  const rows = eraRowsAtYear(year);
  const evs = eventsByYear.get(year) ?? [];
  const shownEvs = cat ? evs.filter((ev) => ev.categories.includes(cat)) : evs;
  const inScope = year >= meta.scope.startYear && year <= meta.scope.endYear;
  const born = persons.filter((p) => p.birth === year);
  const died = persons.filter((p) => p.death === year);
  const alive = persons.filter(
    (p) => p.birth !== null && p.death !== null && p.birth <= year && p.death > year && !born.includes(p),
  );
  const multiPerPolity = new Set<string>();
  rows.forEach((r) => {
    if (rows.filter((x) => x.polity.id === r.polity.id).length > 1) multiPerPolity.add(r.polity.id);
  });

  const eventNumber = (ev: HistEvent) => {
    const index = shownEvs.findIndex((item) => item.id === ev.id);
    return citeNumber && index >= 0 ? index + 1 : undefined;
  };
  const copyEvent = async (ev: HistEvent, kind: 'link' | 'cite') => {
    const ok = await copyText(kind === 'link' ? eventPermalink(ev) : eventCitation(ev, sources, { format: citeFormat, number: eventNumber(ev) }));
    setCopied(`${ev.id}:${kind}:${ok ? 'ok' : 'fail'}`);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1800);
  };
  const copyLabel = (ev: HistEvent, kind: 'link' | 'cite') => {
    if (copied === `${ev.id}:${kind}:ok`) return kind === 'link' ? t('yp.copiedLink') : t('yp.copiedCite');
    if (copied === `${ev.id}:${kind}:fail`) return t('yp.copyFail');
    return kind === 'link' ? t('yp.copyLink') : t('yp.copyCite');
  };
  const listText = () => citationList(shownEvs, sources, { format: citeFormat, numbered: citeNumber });
  const copyAll = async () => {
    if (!shownEvs.length) return;
    const ok = await copyText(listText());
    setCopied(ok ? `all:ok:${shownEvs.length}` : 'all:fail');
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1800);
  };
  const downloadAll = () => {
    if (!shownEvs.length) return;
    const blob = new Blob(['\uFEFF' + listText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronochina-${year > 0 ? year : `BC${1 - year}`}-citations.txt`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const allLabel = copied?.startsWith('all:ok') ? t('yp.copiedAll') : copied === 'all:fail' ? t('yp.copyFail') : t('yp.copyAll');

  if (compact) return <div className="year-summary">
    <header><h3>{formatYearFull(year)}</h3><span>{getLang() === 'en' ? ganzhiOf(year) : `${ganzhiOf(year)}年`} · {t('yp.summaryGenre')}</span></header>
    <section><h4>{t('yp.summaryEvents', { n: evs.length })}</h4>{evs.length ? evs.slice(0, 3).map(ev => <p className="summary-event" id={`event-${ev.id}`} key={ev.id}><small>{ev.month ? monthLabel(ev.month) : t('yp.monthUnknown')}</small><Han text={ev.title}/></p>) : <p className="summary-note">{t('yp.summaryNoEvents')}</p>}{evs.length > 3 && <p className="summary-note">{t('yp.summaryMore', { n: evs.length - 3 })}</p>}</section>
    <section><h4>{t('yp.summaryEras')}</h4>{rows.length ? rows.map(row => <p className="summary-era" key={row.era.id}><span><Han text={row.polity.name}/></span><strong><Han text={eraDisplayName(row.era.name)}/>{eraYearDisplay(eraDisplayName(row.era.name), row.era.reignIds.length, row.eraYearNo)}</strong><small><Han text={reignLabel(row.ruler)}/>{row.isStart && row.era.startMonth ? ` · ${t('tl.eraChange', { month: row.era.startMonth })}` : ''}</small></p>) : <p>{t('yp.summaryNoEras')}</p>}
      {multiPerPolity.size > 0 && <p className="summary-note">{t('yp.summaryMulti')}</p>}
    </section>
    <section><h4>{t('yp.summaryPeople')}</h4><p>{[...born, ...died, ...alive].slice(0, 6).map(p => `${S(p.name)}${p.birth === year ? t('yp.bornMark') : p.death === year ? t('yp.diedMark') : ''}`).join(getLang() === 'en' ? ', ' : '、') || t('yp.summaryNoPeople')}</p></section>
    <p className="summary-note">{t('yp.summaryNote')}</p>
  </div>;

  return (
    <aside className="yearpanel card">
      <header className="yp-head">
        <div className="yp-year">{formatYearFull(year)}</div>
        <div className="yp-ganzhi">{getLang() === 'en' ? ganzhiOf(year) : `${ganzhiOf(year)}年`}</div>
      </header>

      {rows.length === 0 ? (
        <p className="dim">
          {inScope ? t('yp.emptyInScope') : t('yp.emptyOutScope')}
        </p>
      ) : (
        <>
          <div className="year-era-list">{rows.map((r, i) => <EraRow key={`${r.era.id}-${i}`} row={r} onOpenRuler={onOpenRuler}/>)}</div>
          {multiPerPolity.size > 0 && (
            <p className="yp-note">
              {t('yp.multi', { names: [...multiPerPolity].map((id) => S(rows.find((r) => r.polity.id === id)!.polity.name)).join(getLang() === 'en' ? ', ' : '、') })}
            </p>
          )}
        </>
      )}

      {inScope && polities.filter(p => p.startYear <= year && p.endYear >= year && !rows.some(r => r.polity.id === p.id)).map(p => <p className="yp-note" key={p.id}>{t('yp.existingNoEra', { polity: S(p.name) })}</p>)}
      {inScope && (born.length > 0 || died.length > 0 || alive.length > 0) && (
        <section className="yp-persons">
          <h4>{alive.length > 0 ? t('yp.personsAlive', { n: alive.length }) : t('yp.persons')}</h4>
          {(born.length > 0 || died.length > 0) && (
            <p className="person-life dim">
              {born.length > 0 && <>{t('yp.born', { list: born.map((p) => `${S(p.name)}（${S(p.field)}）`).join(getLang() === 'en' ? ', ' : '、') })}　</>}
              {died.length > 0 && <>{t('yp.died', { list: died.map((p) => `${S(p.name)}（${S(p.field)}）`).join(getLang() === 'en' ? ', ' : '、') })}</>}
            </p>
          )}
          {alive.length > 0 && (
            <ul className="person-list">
              {alive.map((p) => (
                <li key={p.id} title={S(p.summary)}>
                  <span className="person-name"><Han text={p.name}/></span>
                  <span className="person-field">{S(p.field)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {inScope && (
        <section className="yp-events">
          <h4>{evs.length ? t('yp.eventsCount', { n: evs.length }) : t('yp.events')}</h4>
          <EventCategoryFilter events={evs} value={cat} onChange={setCat}/>
          <div className="ev-cite-bar">
            <label>{t('yp.citeFormat')}
              <select value={citeFormat} onChange={(e) => chooseCiteFormat(e.target.value as CitationFormat)} aria-label={t('yp.citeFormat')}>
                <option value="gbt7714">GB/T 7714</option>
                <option value="plain">{t('common.plain')}</option>
              </select>
            </label>
            <label className="ev-number">
              <input type="checkbox" checked={citeNumber} onChange={(e) => chooseCiteNumber(e.target.checked)}/> {t('yp.autoNumber')}
            </label>
            <button type="button" className="ev-copy" disabled={!shownEvs.length} title={t('yp.copyAllTitle', { n: shownEvs.length })} onClick={copyAll}>{allLabel}</button>
            <button type="button" className="ev-copy" disabled={!shownEvs.length} title={t('yp.downloadAllTitle', { n: shownEvs.length })} onClick={downloadAll}>{t('yp.downloadAll')}</button>
          </div>
          <small className="ev-cite-hint">{t('yp.batchHint')}</small>
          {evs.length === 0 && <p className="dim">{t('yp.noEvents')}</p>}
          {evs.length > 0 && shownEvs.length === 0 && <p className="dim">{t('yp.noCategory')}</p>}
          <ul ref={eventList}>
            {shownEvs.map((ev) => (
              <li
                id={`event-${ev.id}`}
                key={ev.id}
                className={selectedEvent === ev.id ? 'ev-item active' : 'ev-item'}
                tabIndex={0}
                onFocus={() => onSelectEvent?.(ev.id)}
                onClick={() => onSelectEvent?.(ev.id)}
              >
                <div className="ev-title">
                  <span className="ev-month">{ev.month ? monthLabel(ev.month) : t('yp.monthUnknown')}</span>
                  <span className="ev-cats">
                    {ev.categories.map((c) => (
                      <span key={c} className="cat-dot" data-cat={c in CAT_GLYPHS ? c : '其他'} title={S(c)}>
                        {S(c.slice(0, 1))}
                      </span>
                    ))}
                  </span>
                  <Han text={ev.title}/>
                  {ev.confidence === 'low' && <span className="badge low">{t('yp.disputedBadge')}</span>}
                </div>
                <p className="ev-summary"><Han text={ev.summary}/></p>
                <div className="ev-actions">
                  <button type="button" className="ev-copy" onClick={(e) => { e.stopPropagation(); copyEvent(ev, 'link'); }}>{copyLabel(ev, 'link')}</button>
                  <button type="button" className="ev-copy" title={citeFormat === 'gbt7714' ? 'GB/T 7714' : t('common.plain')} onClick={(e) => { e.stopPropagation(); copyEvent(ev, 'cite'); }}>{copyLabel(ev, 'cite')}</button>
                </div>
                <details><summary>{t('yp.sourceDetail')}</summary><p className="ev-src">{ev.sources.map(id => { const s = sourceById.get(id); return s?.url ? <a key={id} href={s.url} target="_blank" rel="noreferrer">{S(s.name)} </a> : <span key={id}>{S(s?.name)}</span>; })}</p><p className="dim">参与政权尚待核对；同期存在不等于参与此事件。</p><div className="ev-citation"><span>{t('yp.citeLabel', { format: citeFormat === 'gbt7714' ? 'GB/T 7714' : t('common.plain') })}{citeNumber ? t('yp.citeNumber', { n: eventNumber(ev) ?? '' }) : ''}</span><code>{eventCitation(ev, sources, { format: citeFormat, number: eventNumber(ev) })}</code></div></details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
