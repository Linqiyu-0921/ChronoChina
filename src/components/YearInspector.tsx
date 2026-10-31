import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fitPanel, resizePanel, type PanelRect } from '../lib/panelGeometry';
import YearPanel from './YearPanel';
import { eraRowsAtYear, eventsByYear } from '../lib/data';
import { eraDisplayName, eraYearDisplay, formatYearFull, ganzhiOf } from '../lib/time';
import { getLang, S, t } from '../lib/i18n';

interface Props { year: number; anchor: number; height: number; width: number; anchorX: number; onPinChange: (pinned: boolean) => void; onOpenRuler?: (reignId: string) => void; }
export default function YearInspector({ year, anchor, anchorX, onPinChange, onOpenRuler }: Props) {
  const [mode, setMode] = useState<'closed' | 'short' | 'long' | 'pinned'>('closed');
  const [position, setPosition] = useState({ left: 12, top: 80 });
  const [link, setLink] = useState({ x: 0, from: 0, to: 0 });
  const [floating, setFloating] = useState<PanelRect | null>(null);
  const [settling, setSettling] = useState(false);
  const gesture = useRef<{ edge: string; x: number; y: number; rect: PanelRect } | null>(null);
  const saved = useRef<{ rect: PanelRect; mode: 'short' | 'long' } | null>(null);
  const fromRect = useRef<PanelRect | null>(null);
  const returnFocus = useRef(false);
  const settleTimer = useRef<number | null>(null);
  useEffect(() => { onPinChange(mode === 'pinned'); }, [mode, onPinChange]);
  useEffect(() => () => { if (settleTimer.current) window.clearTimeout(settleTimer.current); }, []);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const open = mode !== 'closed';
  const readingYear = year;
  const rows = eraRowsAtYear(readingYear);
  const events = eventsByYear.get(readingYear) ?? [];
  const story = events[0];
  const storyLead = story ? story.title.replace(/…$/, '') : '';
  const storyBody = story?.summary && !story.summary.startsWith(storyLead) ? story.summary : '';
  useEffect(() => { if (!open && returnFocus.current) { returnFocus.current = false; trigger.current?.focus({ preventScroll: true }); } }, [open]);
  const close = () => { returnFocus.current = true; setFloating(null); setMode('closed'); };
  const settle = () => {
    setSettling(true);
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => setSettling(false), 460);
  };
  useLayoutEffect(() => {
    const el = panel.current, from = fromRect.current;
    fromRect.current = null;
    if (!el || !from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const to = el.getBoundingClientRect();
    el.animate([
      { left: `${from.x}px`, top: `${from.y}px`, width: `${from.width}px`, height: `${from.height}px` },
      { left: `${to.x}px`, top: `${to.y}px`, width: `${to.width}px`, height: `${to.height}px` },
    ], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
  }, [mode]);
  const togglePin = () => {
    const here = panel.current?.getBoundingClientRect();
    if (here) fromRect.current = { x: here.x, y: here.y, width: here.width, height: here.height };
    if (mode === 'pinned') {
      settle();
      const back = saved.current;
      if (back) { setFloating(back.rect); setMode(back.mode); } else setMode('long');
      return;
    }
    saved.current = fromRect.current
      ? { rect: fromRect.current, mode: mode === 'short' ? 'short' : 'long' }
      : null;
    settle();
    setMode('pinned');
  };
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus({ preventScroll: true });
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { returnFocus.current = true; setMode('closed'); } };
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
    {mode !== 'pinned' && <button ref={trigger} className="year-inspector-toggle suijian-trigger" style={{ top: anchor, left: anchorX }} aria-expanded={open} aria-controls="year-inspector" onClick={() => open ? close() : setMode('short')}>
      <span aria-hidden="true">◇</span> {t('sj.trigger')} <small>{(eventsByYear.get(year)?.length ?? 0) > 0 ? t('sj.triggerCount', { n: eventsByYear.get(year)!.length }) : t('sj.triggerOpen')}</small>
    </button>}
    {open && mode !== 'pinned' && <svg className="suijian-link" aria-hidden="true"><path d={`M${link.x} ${link.from}V${link.to}`} /></svg>}
    {open && <section ref={panel} id="year-inspector" aria-label={t('sj.aria', { year: formatYearFull(readingYear) })} className={`suijian-paper suijian-${mode} ${floating ? 'is-positioned' : ''} ${settling ? 'is-settling' : ''}`} style={mode === 'pinned' ? undefined : floating ? { left: floating.x, top: floating.y, width: floating.width, height: floating.height } : position}>
      {mode !== 'pinned' && ['n','e','s','w','ne','se','sw','nw'].map(edge => <div key={edge} className={`inspector-resize resize-${edge}`} role="separator" tabIndex={0} aria-label={t('sj.resize', { edge })} onPointerDown={e => {
        if (e.button !== 0 || !panel.current) return;
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
        const r = panel.current.getBoundingClientRect(); gesture.current = { edge, x:e.clientX, y:e.clientY, rect:{x:r.x,y:r.y,width:r.width,height:r.height} };
      }} onPointerMove={e => { const g=gesture.current; if(g) setFloating(resizePanel(g.rect,g.edge,e.clientX-g.x,e.clientY-g.y,window.innerWidth,window.innerHeight)); }} onPointerUp={() => { gesture.current=null; }} onPointerCancel={() => { gesture.current=null; }} onKeyDown={e => {
        if (!e.key.startsWith('Arrow') || !panel.current) return; e.preventDefault(); e.stopPropagation(); const r=panel.current.getBoundingClientRect(); setFloating(resizePanel({x:r.x,y:r.y,width:r.width,height:r.height},edge,e.key==='ArrowLeft'?-10:e.key==='ArrowRight'?10:0,e.key==='ArrowUp'?-10:e.key==='ArrowDown'?10:0,window.innerWidth,window.innerHeight));
      }} />)}
      <header className="suijian-tools" onPointerDown={e => {
        if(mode==='pinned' || e.button!==0 || (e.target as HTMLElement).closest('button') || !panel.current) return;
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const r=panel.current.getBoundingClientRect(); gesture.current={edge:'move',x:e.clientX,y:e.clientY,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
      }} onPointerMove={e => { const g=gesture.current; if(g?.edge==='move') setFloating(fitPanel({...g.rect,x:g.rect.x+e.clientX-g.x,y:g.rect.y+e.clientY-g.y},window.innerWidth,window.innerHeight)); }} onPointerUp={() => {gesture.current=null;}} onPointerCancel={() => {gesture.current=null;}}><span>{mode === 'pinned' ? t('sj.pinned') : t('sj.title')}</span><div>
        <button aria-label={mode === 'pinned' ? t('sj.unpin') : t('sj.pin')} title={mode === 'pinned' ? t('sj.unpin') : t('sj.pin')} onClick={togglePin}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M8 3h8l-1 7 4 4H5l4-4-1-7ZM12 14v7"/></svg></button>
        <button ref={closeButton} aria-label={t('sj.close')} title={t('sj.close')} onClick={close}><svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button>
      </div></header>
      <div className="suijian-body">
        {mode === 'short' ? <><h2>{formatYearFull(readingYear)}</h2><p className="suijian-subtitle">{t('sj.subtitle', { ganzhi: getLang() === 'en' ? ganzhiOf(readingYear) : `${ganzhiOf(readingYear)}年`, n: new Set(rows.map(r => r.polity.id)).size })}</p>
          <div className="suijian-eras">{rows.slice(0, 4).map(row => <p key={row.era.id}><span>{S(row.polity.name)}</span><strong>{S(eraDisplayName(row.era.name))}{eraYearDisplay(eraDisplayName(row.era.name), row.era.reignIds.length, row.eraYearNo)}</strong></p>)}{!rows.length && <p>{t('sj.pending')}</p>}{rows.length > 4 && <small>{t('sj.more', { n: rows.length - 4 })}</small>}</div>
          <div className="suijian-excerpt"><h3>{t('sj.story')}</h3>{story ? <><p>{S(story.title)}</p>{storyBody && <p>{S(storyBody)}</p>}</> : <p>{t('sj.noStory')}</p>}</div>
        </> : <YearPanel year={readingYear} onOpenRuler={onOpenRuler}/>}
      </div>
      <footer className="suijian-footer">{mode === 'short' ? <button onClick={() => setMode('long')}>{t('sj.expand')} <span aria-hidden="true">↗</span></button> : mode === 'long' ? <button onClick={() => setMode('short')}>{t('sj.collapse')}</button> : <span>{t('sj.synced')}</span>}</footer>
    </section>}
  </>;
}
