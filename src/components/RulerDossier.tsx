import { useEffect, useMemo, useRef, useState } from 'react';
import {
  eraRowsAtYear,
  eras,
  events,
  polityById,
  reignById,
  sourceById,
} from '../lib/data';
import { eraDisplayName, formatYear, formatYearFull, ganzhiOf, reignLabel } from '../lib/time';
import EventCategoryFilter from './EventCategoryFilter';
import Han from './Han';

interface Props {
  reignId: string;
  onClose: () => void;
  onJump: (year: number) => void;
  onOpenRuler: (reignId: string) => void;
}

export default function RulerDossier({ reignId, onClose, onJump, onOpenRuler }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [cat, setCat] = useState<string | null>(null);
  const reign = reignById.get(reignId);
  const polity = reign ? polityById.get(reign.polityId) : undefined;

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (!el.open) el.showModal();
    setCat(null);
    return () => { if (el.open) el.close(); };
  }, [reignId]);

  const reignEras = useMemo(
    () => (reign ? eras.filter((e) => e.reignIds.includes(reign.id)).sort((a, b) => a.startYear - b.startYear) : []),
    [reign],
  );
  const reignEvents = useMemo(
    () => (reign ? events.filter((e) => e.year >= reign.startYear && e.year <= reign.endYear && e.polityIds.includes(reign.polityId)) : []),
    [reign],
  );
  const shownEvents = cat ? reignEvents.filter((e) => e.categories.includes(cat)) : reignEvents;
  const contemporaries = useMemo(() => {
    if (!reign) return [];
    const seen = new Set<string>();
    return eraRowsAtYear(reign.startYear)
      .filter((row) => row.polity.id !== reign.polityId && row.ruler)
      .filter((row) => (seen.has(row.ruler!.id) ? false : seen.add(row.ruler!.id)))
      .slice(0, 10);
  }, [reign]);
  const sourceIds = [...new Set(reignEras.flatMap((e) => e.sources ?? []))];

  if (!reign || !polity) return null;
  const years = reign.endYear - reign.startYear + 1;

  return (
    <dialog ref={dialog} className="ruler-dossier" aria-labelledby="ruler-name" onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <header className="rd-head">
        <div>
          <p className="rd-eyebrow">CHRONOCHINA · 君主档案</p>
          <h2 id="ruler-name"><Han text={reign.title}/>{reign.name && <span className="rd-name"><Han text={reign.name}/></span>}</h2>
          <p className="rd-polity"><span className="ghost-chip" style={{ color: polity.color }}><Han text={polity.name}/></span><span>{formatYearFull(reign.startYear)}—{formatYearFull(reign.endYear)}</span></p>
        </div>
        <button className="rd-close" onClick={onClose} autoFocus aria-label="合上君主档案">×</button>
      </header>

      <div className="rd-meta">
        <div><span>在位</span><strong>{years} 年</strong></div>
        <div><span>元年</span><strong>{ganzhiOf(reign.startYear)}年</strong></div>
        <div><span>政权</span><strong>{formatYear(polity.startYear)}—{formatYear(polity.endYear)}</strong></div>
        <div><span>纪年事件</span><strong>{reignEvents.length} 条</strong></div>
      </div>

      {reign.note && <p className="rd-note">{reign.note}</p>}

      <section className="rd-section">
        <h3>年号 <small>{reignEras.length ? `${reignEras.length} 条` : '无自建年号'}</small></h3>
        {reignEras.length ? (
          <ol className="rd-eras">
            {reignEras.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onJump(e.startYear)} title={`定位至${formatYear(e.startYear)}年`}>
                  <Han text={eraDisplayName(e.name)}/>
                  <span>{formatYear(e.startYear)}—{formatYear(e.endYear)}</span>
                </button>
                <small>
                  {e.reignIds.length > 1 ? '跨君主沿用' : `${e.endYear - e.startYear + 1} 年`}
                  {e.startMonth ? ` · ${e.startMonth}月改元` : ''}
                  {e.disputed ? ' · 异说' : ''}
                </small>
              </li>
            ))}
          </ol>
        ) : <p className="dim">本段在位未见自建年号，奉行当朝正朔。</p>}
      </section>

      <section className="rd-section">
        <h3>在位纪事 <small>{reignEvents.length} 条</small></h3>
        <EventCategoryFilter events={reignEvents} value={cat} onChange={setCat}/>
        {reignEvents.length === 0 && <p className="dim">在位期间尚未收录纪事，可先查阅年号与同期君主。</p>}
        {reignEvents.length > 0 && shownEvents.length === 0 && <p className="dim">本类暂无纪事，可切换「全部」。</p>}
        <ul className="rd-events">
          {shownEvents.slice(0, 24).map((ev) => (
            <li key={ev.id}>
              <button type="button" className="rd-event-year" onClick={() => onJump(ev.year)}>{formatYear(ev.year)}{ev.month ? ` · ${ev.month}月` : ''}</button>
              <div>
                <p className="rd-event-title"><Han text={ev.title}/>{ev.confidence === 'low' && <span className="badge low">存疑</span>}</p>
                <p className="rd-event-summary"><Han text={ev.summary}/></p>
              </div>
            </li>
          ))}
        </ul>
        {shownEvents.length > 24 && <p className="dim">另有 {shownEvents.length - 24} 条，可在年度档案中按年查阅。</p>}
      </section>

      <section className="rd-section">
        <h3>元年同期君主 <small>{contemporaries.length} 人</small></h3>
        {contemporaries.length ? (
          <ul className="rd-peers">
            {contemporaries.map((row) => (
              <li key={row.ruler!.id}>
                <button type="button" onClick={() => onOpenRuler(row.ruler!.id)}>
                  <span><Han text={row.polity.name}/></span>
                  <Han text={reignLabel(row.ruler)}/>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="dim">元年别无同期君主记录。</p>}
        <p className="rd-hint">仅列元年在位者，按南北次序；同名年号不代表同一政权。</p>
      </section>

      {sourceIds.length > 0 && (
        <section className="rd-section rd-sources">
          <h3>依据</h3>
          <p>{sourceIds.map((id) => {
            const s = sourceById.get(id);
            return s?.url ? <a key={id} href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a> : <span key={id}>{s?.name ?? id}</span>;
          })}</p>
          <p className="dim">在位与年号按当前纪年表整理；纪事为节引，具体异说待条目级复核。</p>
        </section>
      )}

      <footer className="rd-foot">
        <button type="button" onClick={() => onJump(reign.startYear)}>定位 {formatYear(reign.startYear)} 年</button>
        {reign.endYear !== reign.startYear && <button type="button" onClick={() => onJump(reign.endYear)}>定位末年 {formatYear(reign.endYear)} 年</button>}
        <button type="button" className="ghost" onClick={onClose}>合上档案</button>
      </footer>
    </dialog>
  );
}
