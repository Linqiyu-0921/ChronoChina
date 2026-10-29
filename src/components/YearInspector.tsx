import { useEffect, useRef, useState } from 'react';
import { fitPanel, resizePanel, type PanelRect } from '../lib/panelGeometry';
import YearPanel from './YearPanel';
import { eraRowsAtYear, eventsByYear } from '../lib/data';
import { eraDisplayName, eraYearLabel, formatYearFull, ganzhiOf } from '../lib/time';

interface Props { year: number; anchor: number; height: number; width: number; anchorX: number; onPinChange: (pinned: boolean) => void; }
export default function YearInspector({ year, anchor, anchorX, onPinChange }: Props) {
  const [mode, setMode] = useState<'closed' | 'short' | 'long' | 'pinned'>('closed');
  const [pinnedYear, setPinnedYear] = useState(year);
  const [position, setPosition] = useState({ left: 12, top: 80 });
  const [link, setLink] = useState({ x: 0, from: 0, to: 0 });
  const [floating, setFloating] = useState<PanelRect | null>(null);
  const gesture = useRef<{ edge: string; x: number; y: number; rect: PanelRect } | null>(null);
  useEffect(() => { onPinChange(mode === 'pinned'); }, [mode, onPinChange]);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const open = mode !== 'closed';
  const readingYear = mode === 'pinned' ? pinnedYear : year;
  const rows = eraRowsAtYear(readingYear);
  const events = eventsByYear.get(readingYear) ?? [];
  const close = () => { setFloating(null); setMode('closed'); trigger.current?.focus({ preventScroll: true }); };
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus({ preventScroll: true });
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { setMode('closed'); trigger.current?.focus({ preventScroll: true }); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = trigger.current?.getBoundingClientRect();
      const card = panel.current;
      if (!r || !card) return;
      if (floating) { const box = fitPanel(floating, window.innerWidth, window.innerHeight); if (JSON.stringify(box) !== JSON.stringify(floating)) setFloating(box); setLink({ x: r.left + 18, from: r.top + r.height / 2, to: box.y + box.height / 2 }); return; }
      const left = Math.max(12, Math.min(r.right - card.offsetWidth, window.innerWidth - card.offsetWidth - 12));
      const below = r.bottom + 14;
      const top = below + card.offsetHeight <= window.innerHeight - 12 ? below : Math.max(12, r.top - card.offsetHeight - 14);
      setPosition({ left, top });
      setLink({ x: Math.min(r.left + 18, left + card.offsetWidth - 16), from: r.top + r.height / 2, to: top > r.top ? top : top + card.offsetHeight });
    };
    place();
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', place);
    return () => { observer.disconnect(); window.removeEventListener('resize', place); };
  }, [open, mode, anchor, anchorX, year, floating]);
  return <>
    <button ref={trigger} className="year-inspector-toggle suijian-trigger" style={{ top: anchor, left: anchorX }} aria-expanded={open} aria-controls="year-inspector" onClick={() => open ? close() : setMode('short')}>
      <span aria-hidden="true">◇</span> 岁笺 {mode === 'pinned' ? <small>已固定 · {formatYearFull(pinnedYear)}</small> : <small>{(eventsByYear.get(year)?.length ?? 0) > 0 ? `${eventsByYear.get(year)!.length} 条纪事` : '阅此年'}</small>}
    </button>
    {open && mode !== 'pinned' && <svg className="suijian-link" aria-hidden="true"><path d={`M${link.x} ${link.from}V${link.to}`} /></svg>}
    {open && <section ref={panel} id="year-inspector" aria-label={`${formatYearFull(readingYear)}岁笺`} className={`suijian-paper suijian-${mode} ${floating ? 'is-positioned' : ''}`} style={mode === 'pinned' ? undefined : floating ? { left: floating.x, top: floating.y, width: floating.width, height: floating.height } : position}>
      {mode !== 'pinned' && ['n','e','s','w','ne','se','sw','nw'].map(edge => <div key={edge} className={`inspector-resize resize-${edge}`} role="separator" tabIndex={0} aria-label={`调整岁笺 ${edge} 边缘`} onPointerDown={e => {
        if (e.button !== 0 || !panel.current) return;
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
        const r = panel.current.getBoundingClientRect(); gesture.current = { edge, x:e.clientX, y:e.clientY, rect:{x:r.x,y:r.y,width:r.width,height:r.height} };
      }} onPointerMove={e => { const g=gesture.current; if(g) setFloating(resizePanel(g.rect,g.edge,e.clientX-g.x,e.clientY-g.y,window.innerWidth,window.innerHeight)); }} onPointerUp={() => { gesture.current=null; }} onPointerCancel={() => { gesture.current=null; }} onKeyDown={e => {
        if (!e.key.startsWith('Arrow') || !panel.current) return; e.preventDefault(); e.stopPropagation(); const r=panel.current.getBoundingClientRect(); setFloating(resizePanel({x:r.x,y:r.y,width:r.width,height:r.height},edge,e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0,e.key==='ArrowUp'?-10:e.key==='ArrowDown'?10:0,window.innerWidth,window.innerHeight));
      }} />)}
      <header className="suijian-tools" onPointerDown={e => {
        if(mode==='pinned' || e.button!==0 || (e.target as HTMLElement).closest('button') || !panel.current) return;
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const r=panel.current.getBoundingClientRect(); gesture.current={edge:'move',x:e.clientX,y:e.clientY,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
      }} onPointerMove={e => { const g=gesture.current; if(g?.edge==='move') setFloating(fitPanel({...g.rect,x:g.rect.x+e.clientX-g.x,y:g.rect.y+e.clientY-g.y},window.innerWidth,window.innerHeight)); }} onPointerUp={() => {gesture.current=null;}} onPointerCancel={() => {gesture.current=null;}}><span>{mode === 'pinned' ? '岁笺 · 侧页' : '岁笺'}</span><div>
        <button aria-label={mode === 'pinned' ? '取消固定' : '固定为侧页'} title={mode === 'pinned' ? '取消固定' : '固定为侧页'} onClick={() => { if (mode === 'pinned') setMode('long'); else { setPinnedYear(year); setMode('pinned'); } }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M8 3h8l-1 7 4 4H5l4-4-1-7ZM12 14v7"/></svg></button>
        <button ref={closeButton} aria-label="收起岁笺" title="收起岁笺" onClick={close}><svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
      </div></header>
      <div className="suijian-body">
        {mode === 'short' ? <><h2>{formatYearFull(readingYear)}</h2><p className="suijian-subtitle">{ganzhiOf(readingYear)}年 · {new Set(rows.map(r => r.polity.id)).size} 政权纪年已录</p>
          <div className="suijian-eras">{rows.slice(0, 4).map(row => <p key={row.era.id}><span>{row.polity.name}</span><strong>{eraDisplayName(row.era.name)}{eraYearLabel(row.eraYearNo)}</strong></p>)}{!rows.length && <p>本年纪年尚待补录。</p>}{rows.length > 4 && <small>另有 {rows.length - 4} 条纪年，详见本年档。</small>}</div>
          <div className="suijian-excerpt"><h3>这一年</h3>{events.length ? <><p>{events[0].title}</p><p>{events[0].summary}</p></> : <p>本年尚未收录纪事，亦可展开查阅同期纪年与人物。</p>}</div>
        </> : <YearPanel year={readingYear} />}
      </div>
      <footer className="suijian-footer">{mode === 'short' ? <button onClick={() => setMode('long')}>展开本年档 <span aria-hidden="true">↗</span></button> : mode === 'long' ? <button onClick={() => setMode('short')}>收为短笺</button> : <span>已留存此年 · 可继续滚动对照</span>}</footer>
    </section>}
  </>;
}
