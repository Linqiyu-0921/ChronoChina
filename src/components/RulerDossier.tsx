import { useEffect, useMemo, useRef, useState } from 'react';
import {
  eraRowsAtYear,
  eras,
  events,
  polityById,
  reignById,
  sourceById,
} from '../lib/data';
import { eraDisplayName, formatYear, formatYearFull, ganzhiOf, monthLabel, reignLabel } from '../lib/time';
import { getLang, S, t } from '../lib/i18n';
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
          <p className="rd-eyebrow">{t('rd.eyebrow')}</p>
          <h2 id="ruler-name"><Han text={reign.title}/>{reign.name && <span className="rd-name"><Han text={reign.name}/></span>}</h2>
          <p className="rd-polity"><span className="ghost-chip" style={{ color: polity.color }}><Han text={polity.name}/></span><span>{formatYearFull(reign.startYear)}—{formatYearFull(reign.endYear)}</span></p>
        </div>
        <button className="rd-close" onClick={onClose} autoFocus aria-label={t('rd.close')}>×</button>
      </header>

      <div className="rd-meta">
        <div><span>{t('rd.reign')}</span><strong>{t('rd.years', { n: years })}</strong></div>
        <div><span>{t('rd.firstYear')}</span><strong>{getLang() === 'en' ? ganzhiOf(reign.startYear) : `${ganzhiOf(reign.startYear)}年`}</strong></div>
        <div><span>{t('rd.polity')}</span><strong>{formatYear(polity.startYear)}—{formatYear(polity.endYear)}</strong></div>
        <div><span>{t('rd.events')}</span><strong>{t('rd.count', { n: reignEvents.length })}</strong></div>
      </div>

      {reign.note && <p className="rd-note">{S(reign.note)}</p>}

      <section className="rd-section">
        <h3>{t('rd.eras')} <small>{reignEras.length ? t('rd.count', { n: reignEras.length }) : t('rd.noEras')}</small></h3>
        {reignEras.length ? (
          <ol className="rd-eras">
            {reignEras.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onJump(e.startYear)} title={t('et.locate', { year: formatYear(e.startYear) })}>
                  <Han text={eraDisplayName(e.name)}/>
                  <span>{formatYear(e.startYear)}—{formatYear(e.endYear)}</span>
                </button>
                <small>
                  {e.reignIds.length > 1 ? t('rd.crossReign') : t('rd.eraSpanNote', { n: e.endYear - e.startYear + 1 })}
                  {e.startMonth ? t('rd.eraMonth', { month: e.startMonth }) : ''}
                  {e.disputed ? t('rd.eraDisputed') : ''}
                </small>
              </li>
            ))}
          </ol>
        ) : <p className="dim">{t('rd.noErasBody')}</p>}
      </section>

      <section className="rd-section">
        <h3>{t('rd.reignEvents')} <small>{t('rd.count', { n: reignEvents.length })}</small></h3>
        <EventCategoryFilter events={reignEvents} value={cat} onChange={setCat}/>
        {reignEvents.length === 0 && <p className="dim">{t('rd.noEvents')}</p>}
        {reignEvents.length > 0 && shownEvents.length === 0 && <p className="dim">{t('rd.noCategory')}</p>}
        <ul className="rd-events">
          {shownEvents.slice(0, 24).map((ev) => (
            <li key={ev.id}>
              <button type="button" className="rd-event-year" onClick={() => onJump(ev.year)}>{formatYear(ev.year)}{ev.month ? ` · ${monthLabel(ev.month)}` : ''}</button>
              <div>
                <p className="rd-event-title"><Han text={ev.title}/>{ev.confidence === 'low' && <span className="badge low">{t('rd.disputedBadge')}</span>}</p>
                <p className="rd-event-summary"><Han text={ev.summary}/></p>
              </div>
            </li>
          ))}
        </ul>
        {shownEvents.length > 24 && <p className="dim">{t('rd.moreEvents', { n: shownEvents.length - 24 })}</p>}
      </section>

      <section className="rd-section">
        <h3>{t('rd.peers')} <small>{t('rd.peersCount', { n: contemporaries.length })}</small></h3>
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
        ) : <p className="dim">{t('rd.noPeers')}</p>}
        <p className="rd-hint">{t('rd.peersHint')}</p>
      </section>

      {sourceIds.length > 0 && (
        <section className="rd-section rd-sources">
          <h3>{t('rd.sources')}</h3>
          <p>{sourceIds.map((id) => {
            const s = sourceById.get(id);
            return s?.url ? <a key={id} href={s.url} target="_blank" rel="noreferrer">{S(s.name)} ↗</a> : <span key={id}>{S(s?.name) ?? id}</span>;
          })}</p>
          <p className="dim">{t('rd.sourceNote')}</p>
        </section>
      )}

      <footer className="rd-foot">
        <button type="button" onClick={() => onJump(reign.startYear)}>{t('rd.jump', { year: formatYear(reign.startYear) })}</button>
        {reign.endYear !== reign.startYear && <button type="button" onClick={() => onJump(reign.endYear)}>{t('rd.jumpEnd', { year: formatYear(reign.endYear) })}</button>}
        <button type="button" className="ghost" onClick={onClose}>{t('rd.closeFooter')}</button>
      </footer>
    </dialog>
  );
}
