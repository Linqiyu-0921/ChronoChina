import { useEffect, useMemo, useRef, useState } from 'react';
import { eraRowsAtYear, eraCoverage, polities, erasByPolity, reignById } from '../lib/data';
import YearInspector from '../components/YearInspector';
import { eraYearLabel, formatYear } from '../lib/time';

interface Props {
  target?: { polityId?: string; eraId?: string; key: number };
  domain: [number, number];
  year: number | null;
  onNavigateYear: (year: number) => void;
  onOpenRecord: (kind: 'polity' | 'reign' | 'era', id: string) => void;
}
const MIN = eraCoverage.min, MAX = eraCoverage.max;
const bound = (y: number) => Math.max(MIN, Math.min(MAX, y));
export default function Timeline({ target, domain, year, onNavigateYear, onOpenRecord }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const columns = useRef<HTMLDivElement>(null);
  const programmatic = useRef(false);
  const [pixelsPerYear, setPixelsPerYear] = useState(40);
  const [height, setHeight] = useState(560);
  const [width, setWidth] = useState(1000);
  const [columnWidth, setColumnWidth] = useState(260);
  const [lanePage, setLanePage] = useState(0);
  const [archiveX, setArchiveX] = useState(336);
  const [pointerOffset, setPointerOffset] = useState(180);
  const [center, setCenter] = useState(bound(year ?? 1127));
  const [input, setInput] = useState(formatYear(year ?? 1127));
  const centerRef = useRef(center);
  centerRef.current = center;
  const visibleSpan = height / pixelsPerYear;
  const [editingYear, setEditingYear] = useState(false);
  const [yearError, setYearError] = useState('');
  const yearInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editingYear) yearInput.current?.select(); }, [editingYear]);
  const lanes = useMemo(() => polities.filter(p => p.startYear <= Math.round(center) && p.endYear >= Math.round(center)), [Math.round(center)]);
  const top = center - pointerOffset / pixelsPerYear;
  const position = (y: number) => (y - top) * pixelsPerYear;
  const scrollTo = (y: number) => {
    const next = bound(y);
    centerRef.current = next;
    setCenter(next); setInput(formatYear(Math.round(next)));
    if (scroller.current) {
      programmatic.current = true;
      scroller.current.scrollTop = (next - MIN) * pixelsPerYear;
      requestAnimationFrame(() => { programmatic.current = false; });
    }
  };
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => {
      setHeight(element.clientHeight);
      setWidth(element.clientWidth);
      const available = element.clientWidth - (window.innerWidth <= 650 ? 64 : 96) - 12;
      setColumnWidth(available / Math.max(1, Math.floor(available / 240)));
      setArchiveX(element.clientWidth - 100);
      setPointerOffset(Math.max(90, Math.min(element.clientHeight - 60, window.innerHeight / 2 - element.getBoundingClientRect().top)));
    };
    const observer = new ResizeObserver(measure);
    measure();
    window.addEventListener('resize', measure);
    observer.observe(element);
    const wheel = (event: WheelEvent) => {
      if ((event.target as HTMLElement).closest('.year-inspector')) return;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        setPixelsPerYear(p => Math.max(.25, Math.min(100, p * (event.deltaY > 0 ? .85 : 1 / .85))));
        return;
      }
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey) return;
      event.preventDefault();
      if (scroller.current) scroller.current.scrollTop += event.deltaY * (event.deltaMode === 1 ? 20 : 1);
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); element.removeEventListener('wheel', wheel); };
  }, []);
  useEffect(() => { if (Math.round(centerRef.current) !== year) scrollTo(year ?? 1127); }, [year]);
  useEffect(() => { scrollTo(centerRef.current); }, [pixelsPerYear]);
  useEffect(() => {
    const mid = (domain[0] + domain[1]) / 2;
    if (centerRef.current < domain[0] || centerRef.current > domain[1]) scrollTo(mid);
    const frame = requestAnimationFrame(() => {
      const lane = columns.current?.querySelector<HTMLElement>(`[data-start="${domain[0]}"]`);
      if (lane && columns.current) columns.current.scrollLeft = lane.offsetLeft;
    });
    return () => cancelAnimationFrame(frame);
  }, [domain]);
  useEffect(() => {
    if (!target?.polityId || !columns.current) return;
    const lane = columns.current.querySelector<HTMLElement>(`[data-polity="${target.polityId}"]`);
    if (lane) columns.current.scrollTo({ left: lane.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [target, lanes.map(p => p.id).join('|')]);
  const publish = (next: number) => {
    centerRef.current = next;
    setCenter(next); setInput(formatYear(Math.round(next))); onNavigateYear(Math.round(next));
  };
  const selectedYear = Math.round(center);
  const step = pixelsPerYear >= 25 ? 1 : pixelsPerYear >= 5 ? 5 : pixelsPerYear >= 1 ? 25 : 100;
  const ticks = [];
  for (let y = Math.ceil(top / step) * step; y <= top + visibleSpan; y += step) if (y >= MIN && y <= MAX) ticks.push(y);
  const currentRows = eraRowsAtYear(selectedYear);
  const go = (e: React.FormEvent) => {
    e.preventDefault(); const raw = input.trim();
    const m = raw.match(/^(?:公元)?(前)?(\d+)年?$/);
    if (m && Number(m[2]) > 0) {
      const y = m[1] ? 1 - Number(m[2]) : Number(m[2]);
      if (y < MIN || y > MAX) { setYearError(`请输入 ${formatYear(MIN)}—${formatYear(MAX)} 年`); return; }
      scrollTo(y); onNavigateYear(y); setEditingYear(false); setYearError('');
    } else setYearError('请输入年份，如 1127 或前221');
  };
  return <section className="vertical-atlas" aria-label="纵向历史比较">
    <div ref={viewport} className="vertical-viewport">
      <div className="vertical-date-lane" aria-hidden="true"><span className="date-heading">公元纪年</span>{ticks.filter(y => position(y) > 84 && Math.abs(position(y) - pointerOffset) > 30).map(y => <div key={y} className="vertical-tick" style={{ top: position(y) }}>{formatYear(y)}</div>)}</div>
      <div ref={columns} onScroll={e => setLanePage(Math.round(e.currentTarget.scrollLeft / columnWidth))} className="vertical-columns" tabIndex={0} aria-label="同期政权，横向滚动查看更多" style={{ gridTemplateColumns: `repeat(${Math.max(1, lanes.length)}, ${columnWidth}px)` }}>
        {lanes.map(p => {
          const es = (erasByPolity.get(p.id) ?? []).filter(e => e.startYear <= top + visibleSpan && e.endYear >= top);
          const rows = currentRows.filter(r => r.polity.id === p.id);
          const occupied: { top: number; bottom: number }[] = [];
          const placements = new Map<string, number>();
          const eligible = es.filter(e => rows.some(r => r.era.id === e.id) || (e.endYear + 1 - e.startYear) * pixelsPerYear >= 68);
          eligible.sort((a, b) => Number(rows.some(r => r.era.id === b.id)) - Number(rows.some(r => r.era.id === a.id)) || a.startYear - b.startYear);
          for (const e of eligible) {
            const a = Math.max(90, position(e.startYear));
            const b = Math.min(height - 8, position(e.endYear + 1));
            if (b < 90 || a > height - 92) continue;
            const active = rows.some(r => r.era.id === e.id);
            const desired = active ? Math.max(a + 4, Math.min(pointerOffset + 10, b - 88)) : a + 4;
            const candidates = [desired, ...occupied.flatMap(o => [o.bottom + 8, o.top - 96])];
            const fit = candidates.filter(y => y >= 90 && y + 88 <= height - 8 && occupied.every(o => y + 88 <= o.top - 6 || y >= o.bottom + 6)).sort((x, y) => Math.abs(x - desired) - Math.abs(y - desired))[0];
            if (fit !== undefined && (active || Math.abs(fit - desired) < 60)) { placements.set(e.id, fit); occupied.push({ top: fit, bottom: fit + 88 }); }
          }
          return <div className={`vertical-polity ${target?.polityId === p.id ? 'target-polity' : ''}`} key={p.id} data-polity={p.id} data-start={p.startYear}>
            <button className="vertical-column-title" title={`跳转至${p.name}开朝：${formatYear(p.startYear)}年`} onClick={() => { scrollTo(p.startYear); onNavigateYear(p.startYear); }}>{p.name}<small>{formatYear(p.startYear)}—{formatYear(p.endYear)}</small></button>
            <div className="polity-spine" style={{ top: Math.max(82, position(p.startYear)), height: Math.max(0, Math.min(height, position(p.endYear + 1)) - Math.max(82, position(p.startYear))) }} />
            {es.map(e => {
              const start = position(e.startYear), end = position(e.endYear + 1);
              const a = Math.max(84, start), b = Math.min(height, end);
              if (b <= a) return null;
              const row = rows.find(r => r.era.id === e.id);
              const labelTop = placements.get(e.id);
              const ruler = row?.ruler ?? e.reignIds.map(id => reignById.get(id)).find(r => r && r.startYear <= e.endYear && r.endYear >= e.startYear);
              const rail = 24;
              const linkY = labelTop === undefined ? a : Math.max(a + 2, Math.min(b - 2, labelTop + 30));
              return <div key={e.id} className={`era-segment ${row ? 'is-current' : ''} ${target?.eraId === e.id ? 'target-era' : ''}`}>
                <button className={`era-bracket ${e.disputed || e.precision === 'approx' ? 'uncertain' : ''}`} style={{ top: a, height: b - a, left: rail }} onClick={() => onOpenRecord('era', e.id)} aria-label={`${p.name} · ${e.name} ${formatYear(e.startYear)}—${formatYear(e.endYear)}，含末年`}>
                  {start >= 84 && <i className="era-cap start" />}{end <= height && <i className="era-cap end" />}
                </button>
                {labelTop !== undefined && <>
                  <svg className="era-connector" aria-hidden="true"><path d={`M ${rail + 1} ${linkY} H 42 V ${labelTop + 30} H 48`} /></svg>
                  <div className="era-label" style={{ top: labelTop }}>
                    {ruler && <button className="segment-ruler" onClick={() => onOpenRecord('reign', ruler.id)}>{ruler.title} · {ruler.name.split('（')[0]}</button>}
                    <button className="segment-name" onClick={() => onOpenRecord('era', e.id)}>{e.name}{row && <span>{eraYearLabel(row.eraYearNo)}</span>}</button>
                    <span className="segment-range">{formatYear(e.startYear)}—{formatYear(e.endYear)}{e.startMonth ? ` · ${e.startMonth}月改元` : ''}{e.disputed ? ' · 异说' : e.precision === 'approx' ? ' · 约年' : ''}</span>
                  </div>
                </>}
              </div>;
            })}
            {rows.length === 0 && <p className="missing-era" style={{ top: pointerOffset + 12 }}>本年纪年待补录</p>}
          </div>;
        })}
        {lanes.length === 0 && <p className="empty-period">本年尚未收录政权纪年</p>}
      </div>
      <div className="fixed-year-pointer" style={{ top: pointerOffset }}>
        {editingYear ? <form onSubmit={go} className="pointer-edit"><input ref={yearInput} aria-label="直达年代" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setEditingYear(false); setYearError(''); } }} /><button aria-label="前往年份">↵</button>{yearError && <span role="alert">{yearError}</span>}</form> : <button className="pointer-year" onClick={() => { setInput(formatYear(selectedYear)); setEditingYear(true); }} title="点击输入年份" aria-label={`当前 ${formatYear(selectedYear)} 年，点击修改`}>{formatYear(selectedYear)}<small>年</small></button>}
      </div>
      <YearInspector year={selectedYear} anchor={pointerOffset} height={height} width={width} anchorX={archiveX} />
      <div ref={scroller} className="year-scroll-surface" tabIndex={0} aria-label="上下滚动选择历史年份" onKeyDown={e => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
          e.preventDefault(); const next = e.key === 'Home' ? MIN : e.key === 'End' ? MAX : bound(center + (e.key.endsWith('Up') ? -1 : 1) * (e.key.startsWith('Page') ? Math.max(1, visibleSpan / 2) : 1));
          scrollTo(next); onNavigateYear(Math.round(next));
        }
      }} onScroll={e => { if (!programmatic.current) publish(bound(MIN + e.currentTarget.scrollTop / pixelsPerYear)); }}><div style={{ height: (MAX - MIN) * pixelsPerYear + height - 84 }} /></div>
    </div>
    <div className="book-bottom"><span className="book-gesture">上下阅年 · 横移对照 <span>· Ctrl / ⌘ + 滚轮缩放</span></span><span className="interval-note">端点按年标示 · 区间含末年</span><div className="lane-navigation"><button aria-label="查看前一组政权" disabled={lanePage === 0} onClick={() => columns.current?.scrollBy({ left: -columns.current.clientWidth, behavior: 'smooth' })}>‹</button><span>{Math.min(lanePage + 1, lanes.length)} / {lanes.length}</span><button aria-label="查看后一组政权" disabled={(lanePage + Math.round((width - (window.innerWidth <= 650 ? 64 : 96) - 12) / columnWidth)) >= lanes.length} onClick={() => columns.current?.scrollBy({ left: columns.current.clientWidth, behavior: 'smooth' })}>›</button></div><div className="book-zoom"><button aria-label="缩小，扩大时段" onClick={() => setPixelsPerYear(p => Math.max(.25, p / 1.5))}>−</button><button aria-label="放大，细读纪年" onClick={() => setPixelsPerYear(p => Math.min(100, p * 1.5))}>+</button></div></div>
  </section>;
}
