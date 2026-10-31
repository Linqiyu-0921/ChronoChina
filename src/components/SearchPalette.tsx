import { useEffect, useMemo, useRef, useState } from 'react';
import { searchHistory, type SearchHit } from '../lib/search';
import { PERIOD_GROUPS } from '../lib/navigation';
import { polities } from '../lib/data';
import { formatYear } from '../lib/time';
import { S, t } from '../lib/i18n';
const PLACEHOLDER_KEYS = ['sp.placeholder1', 'sp.placeholder2', 'sp.placeholder3', 'sp.placeholder4', 'sp.placeholder5', 'sp.placeholder6'];
interface Props {
  initialQuery: string;
  year: number;
  onClose: () => void;
  onSelect: (hit: SearchHit) => void;
  onPickDynasty: (p: { id: string; startYear: number; endYear: number }) => void;
  onPickPeriod: (g: { start: number; end: number }) => void;
}
export default function SearchPalette({ initialQuery, year, onClose, onSelect, onPickDynasty, onPickPeriod }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const [limit, setLimit] = useState(20);
  const [placeholder] = useState(() => t(PLACEHOLDER_KEYS[Math.floor(Math.random() * PLACEHOLDER_KEYS.length)]));
  const composing = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const all = useMemo(() => searchHistory(query), [query]);
  const suggestions = ['1127', '前214', '建炎元年', '秦始皇', 'donghan', '三国'];
  const hits = all.slice(0, limit);
  const browse = !query.trim();
  useEffect(() => { const before = document.activeElement as HTMLElement; dialog.current?.showModal(); input.current?.focus(); input.current?.select(); return () => { dialog.current?.close(); before?.focus(); }; }, []);
  useEffect(() => { document.getElementById(`search-hit-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active]);
  return <dialog ref={dialog} className="search-palette" aria-label={t('sp.dialogAria')} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <div className="palette-input"><input ref={input} aria-label={t('sp.inputAria')} role="combobox" aria-expanded={hits.length > 0} aria-controls="search-results" aria-activedescendant={hits[active] ? `search-hit-${active}` : undefined} value={query} placeholder={placeholder} onChange={e => { setQuery(e.target.value); setActive(0); setLimit(20); }} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={e => {
      if (composing.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, Math.min(hits.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))); }
      if (e.key === 'Enter') { e.preventDefault(); if (hits[active]) onSelect(hits[active]); }
    }} /><button onClick={onClose} aria-label={t('sp.close')}><span className="desktop-paging-hint">Esc</span><span className="mobile-paging-hint">{t('sp.closeMobile')}</span></button></div>
    {browse && <div className="palette-dynasties">
      <div className="menu-caption">{t('sp.menuCaption')} <span>{t('sp.menuHint')}</span></div>
      <div className="dynasty-groups">{PERIOD_GROUPS.map(group => <section key={group.name}>
        <button className={`period-heading${year >= group.start && year <= group.end ? ' selected' : ''}`} onClick={() => onPickPeriod(group)}>{group.name}<small>{formatYear(group.start)}—{formatYear(group.end)}</small></button>
        <div>{group.ids.map(id => { const p = polities.find(x => x.id === id)!; const on = year >= p.startYear && year <= p.endYear; return <button key={id} className={on ? 'selected' : ''} aria-pressed={on} onClick={() => onPickDynasty(p)}>{p.name}</button>; })}</div>
      </section>)}</div>
    </div>}
    {browse && <div className="search-suggestions"><p>{t('sp.tryFind')}</p>{suggestions.map(q => <button key={q} onClick={() => { setQuery(q); setActive(0); }}>{q}</button>)}</div>}
    {!browse && <div className="palette-results" id="search-results" role="listbox" aria-label={t('sp.resultsAria')}>{hits.map((hit, i) => <div key={hit.id} id={`search-hit-${i}`} role="option" aria-selected={i === active} className={i === active ? 'selected' : ''} onMouseMove={() => setActive(i)} onClick={() => onSelect(hit)}><span className="hit-kind">{hit.category}</span><div><strong>{S(hit.title)}</strong><small>{S(hit.subtitle)}{hit.score! >= 50 ? t('sp.fuzzy') : ''}</small></div><span aria-hidden="true">↵</span></div>)}</div>}
    {!browse && !hits.length && <p className="search-empty">{t('sp.empty')}</p>}
    {all.length > limit && <button className="search-load" onClick={() => setLimit(n => n + 30)}>{t('sp.loadMore', { n: all.length })}</button>}
    <footer>{browse ? <span>{t('sp.footerBrowse')}</span> : <span>{t('sp.footerQuery')}<button type="button" className="footer-link" onClick={() => setQuery('')}>{t('sp.browseDynasties')}</button></span>}<span>{t('sp.footerKinds')}</span></footer>
  </dialog>;
}
