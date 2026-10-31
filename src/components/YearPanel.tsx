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
import { chineseNum, eraDisplayName, eraYearDisplay, formatYearFull, ganzhiOf, reignLabel } from '../lib/time';
import { eventCitation, eventPermalink, type CitationFormat } from '../lib/citation';
import { copyText } from '../lib/clipboard';
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
    row.isStart && era.startMonth ? `（${chineseNum(era.startMonth)}月改元）` : '';
  const endHint = row.isEnd && era.endNote ? `（${era.endNote}）` : '';
  const transition =
    extraRulers.length > 0 && ruler
      ? `（${extraRulers[extraRulers.length - 1].title} → ${ruler.title}，沿用年号）`
      : '';
  return (
    <article className="year-era-row">
      <div><span className="ghost-chip" style={{ color: p.color }}><Han text={p.name}/></span> <strong><Han text={eraDisplayName(era.name)}/>{eraYearDisplay(eraDisplayName(era.name), era.reignIds.length, row.eraYearNo)}</strong></div>
      <p>{ruler ? (onOpenRuler ? <button type="button" className="reign-link" onClick={() => onOpenRuler(ruler.id)}><Han text={reignLabel(ruler)}/></button> : <Han text={reignLabel(ruler)}/>) : '君主待补录'} {monthHint}{transition}</p>
      <details><summary>纪年说明与来源{era.disputed || p.precision ? ' · 有异说或约数' : ''}</summary>
        <p>{endHint || era.note || '当前按所列来源整理，尚需条目级复核。'}</p>
        {era.sources?.map(id => { const s = sourceById.get(id); return s?.url ? <a key={id} href={s.url} target="_blank" rel="noreferrer">{s.name} </a> : <span key={id}>{s?.name}</span>; })}
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
        <p className="dim">点击时间轴上的任意年份，或检索「1127」「天会十三年」。</p>
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

  const copyEvent = async (ev: HistEvent, kind: 'link' | 'cite') => {
    const ok = await copyText(kind === 'link' ? eventPermalink(ev) : eventCitation(ev, sources, undefined, citeFormat));
    setCopied(`${ev.id}:${kind}:${ok ? 'ok' : 'fail'}`);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(null), 1800);
  };
  const copyLabel = (ev: HistEvent, kind: 'link' | 'cite') => {
    if (copied === `${ev.id}:${kind}:ok`) return kind === 'link' ? '已复制链接' : '已复制引用';
    if (copied === `${ev.id}:${kind}:fail`) return '复制失败';
    return kind === 'link' ? '复制链接' : '复制引用';
  };

  if (compact) return <div className="year-summary">
    <header><h3>{formatYearFull(year)}</h3><span>{ganzhiOf(year)}年 · 年度笺注</span></header>
    <section><h4>事件 · {evs.length}</h4>{evs.length ? evs.slice(0, 3).map(ev => <p className="summary-event" id={`event-${ev.id}`} key={ev.id}><small>{ev.month ? `${ev.month}月` : '月不详'}</small><Han text={ev.title}/></p>) : <p className="summary-note">本年尚未收录事件。</p>}{evs.length > 3 && <p className="summary-note">另有 {evs.length - 3} 条，固定到侧边查看完整记录。</p>}</section>
    <section><h4>同期纪年</h4>{rows.length ? rows.map(row => <p className="summary-era" key={row.era.id}><span><Han text={row.polity.name}/></span><strong><Han text={eraDisplayName(row.era.name)}/>{eraYearDisplay(eraDisplayName(row.era.name), row.era.reignIds.length, row.eraYearNo)}</strong><small><Han text={reignLabel(row.ruler)}/>{row.isStart && row.era.startMonth ? ` · ${row.era.startMonth}月改元` : ''}</small></p>) : <p>本年纪年尚未收录。</p>}
      {multiPerPolity.size > 0 && <p className="summary-note">同年多条纪年含年中改元，并非全年同时使用。</p>}
    </section>
    <section><h4>已收录人物</h4><p>{[...born, ...died, ...alive].slice(0, 6).map(p => `${p.name}${p.birth === year ? '（生）' : p.death === year ? '（卒）' : ''}`).join('、') || '本年尚未收录人物。'}</p></section>
    <p className="summary-note">精选资料，非完整覆盖；来源与异说见完整档案。</p>
  </div>;

  return (
    <aside className="yearpanel card">
      <header className="yp-head">
        <div className="yp-year">{formatYearFull(year)}</div>
        <div className="yp-ganzhi">{ganzhiOf(year)}年</div>
      </header>

      {rows.length === 0 ? (
        <p className="dim">
          {inScope ? '该年份尚未收录对应纪年。' : '该年份超出当前纪年覆盖范围。'}
        </p>
      ) : (
        <>
          <div className="year-era-list">{rows.map((r, i) => <EraRow key={`${r.era.id}-${i}`} row={r} onOpenRuler={onOpenRuler}/>)}</div>
          {multiPerPolity.size > 0 && (
            <p className="yp-note">
              同一年内出现多个纪年（如 {[...multiPerPolity].map((id) => rows.find((r) => r.polity.id === id)!.polity.name).join('、')}
              ），系年中改元或政权更替所致，不代表各年号全年同时使用。
            </p>
          )}
        </>
      )}

      {inScope && polities.filter(p => p.startYear <= year && p.endYear >= year && !rows.some(r => r.polity.id === p.id)).map(p => <p className="yp-note" key={p.id}><Han text={p.name}/>：同期存在，纪年尚未收录。</p>)}
      {inScope && (born.length > 0 || died.length > 0 || alive.length > 0) && (
        <section className="yp-persons">
          <h4>已收录人物{alive.length > 0 ? ` · 在世 ${alive.length} 人` : ''}</h4>
          {(born.length > 0 || died.length > 0) && (
            <p className="person-life dim">
              {born.length > 0 && <>本年生：{born.map((p) => `${p.name}（${p.field}）`).join('、')}　</>}
              {died.length > 0 && <>本年卒：{died.map((p) => `${p.name}（${p.field}）`).join('、')}</>}
            </p>
          )}
          {alive.length > 0 && (
            <ul className="person-list">
              {alive.map((p) => (
                <li key={p.id} title={p.summary}>
                  <span className="person-name"><Han text={p.name}/></span>
                  <span className="person-field">{p.field}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {inScope && (
        <section className="yp-events">
          <h4>当年事件{evs.length ? `（${evs.length}）` : ''}</h4>
          <EventCategoryFilter events={evs} value={cat} onChange={setCat}/>
          <div className="ev-cite-bar">
            <label>引用格式
              <select value={citeFormat} onChange={(e) => chooseCiteFormat(e.target.value as CitationFormat)} aria-label="引用格式">
                <option value="gbt7714">GB/T 7714</option>
                <option value="plain">通用</option>
              </select>
            </label>
            <small>复制引用时使用</small>
          </div>
          {evs.length === 0 && <p className="dim">本年尚未收录事件。</p>}
          {evs.length > 0 && shownEvs.length === 0 && <p className="dim">本类暂无纪事，可切换「全部」。</p>}
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
                  <span className="ev-month">{ev.month ? `${chineseNum(ev.month)}月` : "月不详"}</span>
                  <span className="ev-cats">
                    {ev.categories.map((c) => (
                      <span key={c} className="cat-dot" data-cat={c in CAT_GLYPHS ? c : '其他'} title={c}>
                        {c.slice(0, 1)}
                      </span>
                    ))}
                  </span>
                  <Han text={ev.title}/>
                  {ev.confidence === 'low' && <span className="badge low">存疑</span>}
                </div>
                <p className="ev-summary"><Han text={ev.summary}/></p>
                <div className="ev-actions">
                  <button type="button" className="ev-copy" onClick={(e) => { e.stopPropagation(); copyEvent(ev, 'link'); }}>{copyLabel(ev, 'link')}</button>
                  <button type="button" className="ev-copy" title={citeFormat === 'gbt7714' ? '按 GB/T 7714 格式复制' : '按通用格式复制'} onClick={(e) => { e.stopPropagation(); copyEvent(ev, 'cite'); }}>{copyLabel(ev, 'cite')}</button>
                </div>
                <details><summary>来源、引用与整理状态 · 待条目复核</summary><p className="ev-src">{ev.sources.map(id => { const s = sourceById.get(id); return s?.url ? <a key={id} href={s.url} target="_blank" rel="noreferrer">{s.name} </a> : <span key={id}>{s?.name}</span>; })}</p><p className="dim">参与政权尚待核对；同期存在不等于参与此事件。</p><div className="ev-citation"><span>引用格式 · {citeFormat === 'gbt7714' ? 'GB/T 7714' : '通用'}</span><code>{eventCitation(ev, sources, undefined, citeFormat)}</code></div></details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
