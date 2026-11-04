import { useEffect, useRef, useState } from 'react';
import { eraRowsAtYear, eventsByYear, sourceById, type Polity } from '../lib/data';
import { eraDisplayName, eraYearDisplay, formatYearFull } from '../lib/time';
import { getLang, S } from '../lib/i18n';

interface Props { year: number; polities: Polity[]; onClose: () => void; }
export default function PolityComparison({ year, polities, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string[]>(() => polities.slice(0, 2).map(p => p.id));
  const [view, setView] = useState(false);
  const en = getLang() === 'en';
  const label = (cn: string, english: string) => en ? english : S(cn);
  const current = selected.filter(id => polities.some(p => p.id === id));
  const rows = eraRowsAtYear(year);
  const events = eventsByYear.get(year) ?? [];
  useEffect(() => { dialog.current?.showModal(); return () => { if (dialog.current?.open) dialog.current.close(); }; }, []);
  const toggle = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  return <dialog ref={dialog} className="polity-comparison" aria-label={label('同期政权对照', 'Compare contemporary regimes')} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target !== e.currentTarget) return; const r=e.currentTarget.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) onClose(); }}>
    <header><div><small>{label('此年 · 并世', 'CHRONOCHINA · COMPARE')}</small><h2>{formatYearFull(year)} · {label('政权对照', 'Regime comparison')}</h2></div><button aria-label={label('关闭对照', 'Close comparison')} onClick={onClose}>×</button></header>
    <p className="compare-hint">{label('选择 2—4 个同期政权', 'Select 2–4 contemporary regimes')} · {current.length}/4</p>
    <div className="compare-options">{polities.map(p => <label key={p.id}><input type="checkbox" checked={current.includes(p.id)} disabled={(!current.includes(p.id) && current.length >= 4) || (view && current.includes(p.id) && current.length <= 2)} onChange={() => toggle(p.id)} /><span>{S(p.name)}</span></label>)}</div>
    {!view ? <button className="compare-start" disabled={current.length < 2} onClick={() => setView(true)}>{label('开始对照', 'Compare')}</button> : <><div className="compare-grid">{polities.filter(p => current.includes(p.id)).map(p => { const pr=rows.filter(r => r.polity.id === p.id); const ev=events.filter(e => e.polityIds.includes(p.id)); return <article key={p.id}><h3>{S(p.name)}</h3><h4>{label('纪年与君主','Era and ruler')}</h4>{pr.length ? pr.map(r => <div className="compare-era" key={r.era.id}><strong>{S(eraDisplayName(r.era.name))}{S(eraYearDisplay(r.era.name,r.era.reignIds.length,r.eraYearNo))}</strong><p>{r.ruler ? `${S(r.ruler.title)} · ${S(r.ruler.name)}` : label('君主待补录','Ruler not yet recorded')}{r.era.disputed ? ` · ${label('有异说','disputed')}` : r.era.precision === 'approx' ? ` · ${label('约年','approximate')}` : ''}</p>{(r.era.note || r.era.endNote || r.era.sources?.length) && <details><summary>{label('纪年依据','Chronology sources')}</summary>{r.era.note && <p>{S(r.era.note)}</p>}{r.era.endNote && <p>{S(r.era.endNote)}</p>}{r.era.sources?.map(id => { const source = sourceById.get(id); return source?.url ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{S(source.name)} ↗</a> : source ? <span key={id}>{S(source.name)}</span> : null; })}</details>}</div>) : <p>{label('本年纪年待补录','Era not yet recorded')}</p>}<h4>{label('收录的关联纪事 · 待复核','Recorded event links · unverified')}</h4>{ev.length ? <ul>{ev.map(e=><li key={e.id}><details><summary>{S(e.title)}{e.confidence === 'low' ? ` · ${label('存疑', 'uncertain')}` : ''}</summary><p>{S(e.summary)}</p>{e.sources.map(id => { const source = sourceById.get(id); return source?.url ? <a key={id} href={source.url} target="_blank" rel="noreferrer">{S(source.name)} ↗</a> : source ? <span key={id}>{S(source.name)}</span> : null; })}</details></li>)}</ul> : <p>{label('暂无已关联纪事','No linked events recorded')}</p>}</article>; })}</div><p className="compare-note">{label('纪事关联依据当前资料，政权同期存在不代表参与事件；同年改元不代表全年并用。','Event associations reflect the current dataset; contemporaneity does not imply participation, and eras may change within a year.')}</p><button className="compare-start" onClick={onClose}>{label('返回并世', 'Return to timeline')}</button></>}
  </dialog>;
}
