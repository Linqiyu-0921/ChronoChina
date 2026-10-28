import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { fitPanel, resizePanel, type PanelRect } from '../lib/panelGeometry';
import YearPanel from './YearPanel';
interface Props { year: number; anchor: number; height: number; width: number; anchorX: number; }
export default function YearInspector({ year, anchor, height, anchorX }: Props) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [closing, setClosing] = useState(false);
  const [opacity, setOpacity] = useState(86);
  const [size, setSize] = useState({ width: 380, height: 460 });
  const resizing = useRef<{ pointer: number; edge: string; x: number; y: number; rect: PanelRect } | null>(null);
  const [position, setPosition] = useState({ x: 16, y: 88 });
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const drag = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(null);
  const cardHeight = Math.min(460, Math.max(260, height - 40));
  const constrain = (x: number, y: number) => ({ x: Math.max(12, Math.min(x, window.innerWidth - (panel.current?.offsetWidth ?? Math.min(380, window.innerWidth - 24)) - 12)), y: Math.max(12, Math.min(y, window.innerHeight - (panel.current?.offsetHeight ?? cardHeight) - 12)) });
  const place = () => {
    const r = trigger.current?.getBoundingClientRect();
    if (!r) return;
    const y = r.bottom + cardHeight + 12 < window.innerHeight ? r.bottom + 12 : Math.max(88, r.top - cardHeight - 12);
    const box = fitPanel({ x: r.right - size.width, y, ...size }, window.innerWidth, window.innerHeight);
    setPosition({ x: box.x, y: box.y }); setSize({ width: box.width, height: box.height });
  };
  const close = () => { clearTimeout(timer.current); setClosing(true); timer.current = setTimeout(() => { setOpen(false); setClosing(false); setPinned(false); trigger.current?.focus(); }, 180); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus({ preventScroll: true });
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { e.preventDefault(); close(); } };
    const resize = () => {
      const r = panel.current?.getBoundingClientRect();
      if (!r) return;
      const box = fitPanel({ x: r.x, y: r.y, width: r.width, height: r.height }, window.innerWidth, window.innerHeight);
      setPosition({ x: box.x, y: box.y }); setSize({ width: box.width, height: box.height });
    };
    const observer = new ResizeObserver(resize);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', escape);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('keydown', escape); };
  }, [open]);
  return <>
    <button ref={trigger} className="year-inspector-toggle" style={{ top: anchor, left: anchorX }} aria-expanded={open} aria-controls="year-inspector" onClick={() => { if (open) close(); else { place(); setOpen(true); } }}>年档案 <span>{open ? '−' : '+'}</span></button>
    {open && <section ref={panel} id="year-inspector" role="region" aria-label="年份笺注" className={`year-inspector glass-inspector ${pinned ? 'is-pinned' : ''} ${closing ? 'is-closing' : ''}`} style={{ left: position.x, top: position.y, width: size.width, height: size.height, maxHeight: 'calc(100dvh - 24px)', '--inspector-opacity': opacity / 100 } as CSSProperties}>
      {(['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'] as const).map(edge => <div key={edge} className={`inspector-resize resize-${edge}`} role="separator" tabIndex={0} aria-label={`调整档案${({ n: '上边', e: '右边', s: '下边', w: '左边', ne: '右上角', se: '右下角', sw: '左下角', nw: '左上角' })[edge]}尺寸`} onPointerDown={e => {
        if (e.button !== 0) return;
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId);
        resizing.current = { pointer: e.pointerId, edge, x: e.clientX, y: e.clientY, rect: { ...position, ...size } };
      }} onPointerMove={e => {
        const r = resizing.current; if (!r || r.pointer !== e.pointerId) return;
        const b = resizePanel(r.rect, r.edge, e.clientX - r.x, e.clientY - r.y, window.innerWidth, window.innerHeight);
        setPosition({ x: b.x, y: b.y }); setSize({ width: b.width, height: b.height });
      }} onPointerUp={e => { resizing.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { resizing.current = null; }} onKeyDown={e => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault(); e.stopPropagation();
        const step = e.shiftKey ? 30 : 10;
        const b = resizePanel({ ...position, ...size }, edge, e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0, window.innerWidth, window.innerHeight);
        setPosition({ x: b.x, y: b.y }); setSize({ width: b.width, height: b.height });
      }} />)}
      <header className="inspector-tools"><button className="inspector-drag" aria-label="拖动年份档案，或使用方向键移动" title="拖动摆放 · 方向键微调" onPointerDown={e => {
        if (e.button !== 0) return;
        e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { pointer: e.pointerId, x: e.clientX, y: e.clientY, left: position.x, top: position.y };
      }} onPointerMove={e => { const d = drag.current; if (d && d.pointer === e.pointerId) setPosition(constrain(d.left + e.clientX - d.x, d.top + e.clientY - d.y)); }} onPointerUp={e => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { drag.current = null; }} onKeyDown={e => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault(); const step = e.shiftKey ? 30 : 10;
        setPosition(p => constrain(p.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0), p.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)));
      }}>{pinned ? '完整档案' : '年份笺注'} <span>⠿</span></button><button onClick={() => { if (!pinned) { const b = fitPanel({ x: window.innerWidth - 404, y: 64, width: size.width, height: window.innerHeight - 88 }, window.innerWidth, window.innerHeight); setPosition({ x: b.x, y: b.y }); setSize({ width: b.width, height: b.height }); } else place(); setPinned(v => !v); }}>{pinned ? '回到笺注' : '固定到侧边'}</button><button ref={closeButton} onClick={close} aria-label="收起年份档案">×</button></header>
      <div className="inspector-settings"><label>纸面不透明度 <input aria-label="档案纸面不透明度" type="range" min="45" max="100" value={opacity} onChange={e => setOpacity(Number(e.target.value))} /><output>{opacity}%</output></label><button onClick={place}>归位</button></div>
      <div className="inspector-scroll"><YearPanel year={year} compact={!pinned} /></div>
    </section>}
  </>;
}
