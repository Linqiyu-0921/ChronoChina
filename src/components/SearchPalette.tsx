import { useEffect, useMemo, useRef, useState } from 'react';
import { searchHistory, type SearchHit } from '../lib/search';
interface Props { initialQuery: string; onClose: () => void; onSelect: (hit: SearchHit) => void; }
export default function SearchPalette({ initialQuery, onClose, onSelect }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [active, setActive] = useState(0);
  const [limit, setLimit] = useState(20);
  const composing = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const all = useMemo(() => searchHistory(query), [query]);
  const suggestions = ['1127', '前214', '建炎元年', '秦始皇', 'donghan', '三国'];
  const hits = all.slice(0, limit);
  useEffect(() => { const before = document.activeElement as HTMLElement; dialog.current?.showModal(); input.current?.focus(); input.current?.select(); return () => { dialog.current?.close(); before?.focus(); }; }, []);
  useEffect(() => { document.getElementById(`search-hit-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active]);
  return <dialog ref={dialog} className="search-palette" aria-label="全局历史搜索" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <div className="palette-input"><input ref={input} aria-label="搜索年份、人物、年号或事件" role="combobox" aria-expanded={hits.length > 0} aria-controls="search-results" aria-activedescendant={hits[active] ? `search-hit-${active}` : undefined} value={query} placeholder="年份、人物、年号或事件…" onChange={e => { setQuery(e.target.value); setActive(0); setLimit(20); }} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={e => {
      if (composing.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, Math.min(hits.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))); }
      if (e.key === 'Enter') { e.preventDefault(); if (hits[active]) onSelect(hits[active]); }
    }} /><button onClick={onClose} aria-label="关闭搜索">Esc</button></div>
    {!query.trim() && <div className="search-suggestions"><p>试着寻找</p>{suggestions.map(q => <button key={q} onClick={() => { setQuery(q); setActive(0); }}>{q}</button>)}</div>}
    <div className="palette-results" id="search-results" role="listbox" aria-label="搜索结果">{hits.map((hit, i) => <div key={hit.id} id={`search-hit-${i}`} role="option" aria-selected={i === active} className={i === active ? 'selected' : ''} onMouseMove={() => setActive(i)} onClick={() => onSelect(hit)}><span className="hit-kind">{hit.category}</span><div><strong>{hit.title}</strong><small>{hit.subtitle}{hit.score! >= 50 ? ' · 模糊匹配' : ''}</small></div><span aria-hidden="true">↵</span></div>)}</div>
    {query.trim() && !hits.length && <p className="search-empty">没有匹配的已收录条目。可尝试姓名片段、政权拼音或“建炎元年”。</p>}
    {all.length > limit && <button className="search-load" onClick={() => setLimit(n => n + 30)}>显示更多结果（共 {all.length} 条）</button>}
    <footer>↑ ↓ 选择 · Enter 定位 · Esc 关闭<span>政权支持拼音 / 片段匹配</span></footer>
  </dialog>;
}
