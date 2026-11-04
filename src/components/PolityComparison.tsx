import { useEffect, useRef, useState } from 'react';
import type { Polity } from '../lib/data';
import { orderBySouthToNorth } from '../lib/geography';
import { formatYear, formatYearFull } from '../lib/time';
import { getLang, S } from '../lib/i18n';

interface Props { year: number; polities: Polity[]; selected: string[]; onApply: (ids: string[]) => void; onDetails: () => void; onClose: () => void; }
export default function PolityComparison({ year, polities, selected, onApply, onDetails, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(selected);
  const [query, setQuery] = useState('');
  const en = getLang() === 'en';
  const label = (cn: string, english: string) => en ? english : S(cn);
  const list = orderBySouthToNorth(polities).filter(p => `${p.name} ${p.fullName ?? ''} ${p.id} ${S(p.name)}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => { dialog.current?.showModal(); return () => { if (dialog.current?.open) dialog.current.close(); }; }, []);
  const toggle = (id: string) => setDraft(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  return <dialog ref={dialog} className="polity-comparison" aria-label={label('选择对照政权', 'Choose regimes to compare')} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target !== e.currentTarget) return; const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); }}>
    <header><div><small>{label('此年 · 并世', 'CHRONOCHINA · COMPARE')}</small><h2>{label('选择对照政权', 'Choose regimes to compare')}</h2></div><button aria-label={label('关闭对照', 'Close comparison')} onClick={onClose}>×</button></header>
    <p className="compare-hint">{label('选定后跨年份保留；未选择时自动显示同期政权。', 'Selections remain across years; no selection shows contemporary regimes automatically.')} {label('当前', 'Current year')}: {formatYearFull(year)}</p>
    <label className="compare-search">{label('搜索政权', 'Search regimes')}<input value={query} onChange={e => setQuery(e.target.value)} placeholder={label('输入政权名称', 'Enter a regime name')} /></label>
    <p className="compare-hint">{label('已选择', 'Selected')}: {draft.length}</p>
    <div className="compare-options">{list.map(p => <label key={p.id}><input type="checkbox" checked={draft.includes(p.id)} onChange={() => toggle(p.id)} /><span>{S(p.name)} <small>{formatYear(p.startYear)}—{formatYear(p.endYear)}</small>{(year < p.startYear || year > p.endYear) && <small> · {label('此年未存续', 'Not active this year')}</small>}</span></label>)}{list.length === 0 && <p>{label('没有匹配的政权', 'No matching regimes')}</p>}</div>
    <div className="compare-actions"><button className="compare-start" disabled={polities.filter(p => p.startYear <= year && p.endYear >= year).length < 2} onClick={onDetails}>{label('查看同期纪事', 'Compare events this year')}</button><button className="compare-start" onClick={() => { onApply([]); onClose(); }}>{label('恢复同期政权', 'Show contemporary regimes')}</button><button className="compare-start" onClick={() => { onApply(draft); onClose(); }}>{label('应用对照', 'Apply selection')}</button></div>
  </dialog>;
}
