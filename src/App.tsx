import { useEffect, useRef, useState } from 'react';
import Timeline from './views/Timeline';
import YearBook from './views/YearBook';
import SearchPalette from './components/SearchPalette';
import NavIcon from './components/NavIcon';
import { PERIOD_GROUPS } from './lib/navigation';
import type { SearchHit } from './lib/search';
import EraTable from './views/EraTable';
import Sites from './views/Sites';
import { eraCoverage, meta, sources, persons, events, sites, reigns, polities, eras } from './lib/data';
import { eraDisplayName, formatYear, formatYearFull } from './lib/time';

type View = 'reading' | 'timeline' | 'table' | 'sites' | 'about';
const readState = () => {
  const p = new URLSearchParams(location.search);
  const valid = (key: string, fallback: number) => { const n = Number(p.get(key)); return p.has(key) && Number.isFinite(n) ? n : fallback; };
  const start = Math.max(eraCoverage.min, valid('from', eraCoverage.min));
  const end = Math.min(eraCoverage.max, valid('to', eraCoverage.max));
  const raw = p.get('view') === 'sources' ? 'about' : p.get('view');
  return { view: (['reading', 'timeline', 'table', 'sites', 'about'].includes(raw ?? '') ? raw : 'reading') as View, year: Math.max(eraCoverage.min, Math.min(eraCoverage.max, Math.round(valid('year', 1127)))), domain: (end - start >= 3 ? [start, end] : [eraCoverage.min, eraCoverage.max]) as [number, number], q: p.get('q') ?? '', event: p.get('event') };
};

export default function App() {
  const [initial] = useState(readState);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  useEffect(() => { document.documentElement.dataset.theme = theme; try { localStorage.setItem('chronochina-original-theme', theme); } catch {} }, [theme]);
  const [view, setView] = useState<View>(initial.view);
  const [year, setYear] = useState(initial.year);
  const [domain, setDomain] = useState<[number, number]>(initial.domain);
  const [q, setQ] = useState(initial.q);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(initial.event);
  const [searchOpen, setSearchOpen] = useState(new URLSearchParams(location.search).get('view') === 'convert');
  const [paletteSeed, setPaletteSeed] = useState('');
  const [paletteNonce, setPaletteNonce] = useState(0);
  const [coverageJump, setCoverageJump] = useState(0);
  const [detail, setDetail] = useState<{ title: string; text: string; year: number | null } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!detail || !dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, [detail]);
  const [target, setTarget] = useState<{ polityId?: string; eraId?: string; key: number }>({ key: 0 });
  const jumpToYear = (y: number, polityId?: string, eraId?: string) => {
    setTarget(t => ({ polityId, eraId, key: t.key + 1 }));
    setSearchOpen(false); setYear(y); setSelectedEvent(null); setView(view === 'timeline' ? 'timeline' : 'reading');
    setDomain([Math.max(eraCoverage.min, y - 25), Math.min(eraCoverage.max, y + 25)]);
  };
  useEffect(() => {
    const p = new URLSearchParams({ view, year: String(year), from: String(domain[0]), to: String(domain[1]) });
    if (q) p.set('q', q);
    if (selectedEvent) p.set('event', selectedEvent);
    history.replaceState(null, '', `?${p}`);
  }, [view, year, domain, q, selectedEvent]);
  useEffect(() => {
    const onPop = () => { const s = readState(); setView(s.view); setYear(s.year); setDomain(s.domain); setQ(s.q); setSelectedEvent(s.event); };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (searchOpen) setSearchOpen(false); else openPalette(q); return; }
      if (e.key === 'Escape') { setDetail(null); }
      if (view !== 'timeline' || detail || searchOpen || /INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY/.test((e.target as HTMLElement).tagName) || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault(); const next = Math.max(eraCoverage.min, Math.min(eraCoverage.max, year + (e.shiftKey ? 10 : 1) * (e.key === 'ArrowLeft' ? -1 : 1)));
      setYear(next); setSelectedEvent(null);
      if (next < domain[0] || next > domain[1]) setDomain([Math.max(eraCoverage.min, next - 25), Math.min(eraCoverage.max, next + 25)]);
    };
    window.addEventListener('keydown', onKey); window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('popstate', onPop); };
  }, [view, year, domain, detail, searchOpen]);
  const openPalette = (seed: string) => { setPaletteSeed(seed); setPaletteNonce(n => n + 1); setSearchOpen(true); };
  const selectHit = (hit: SearchHit) => {
    setQ(hit.title); jumpToYear(hit.year, hit.polityId, hit.eraId);
    if (hit.category === '政权') { const p = polities.find(p => p.id === hit.polityId); if (p) setDomain([p.startYear, p.endYear]); }
    else if (hit.category === '时期') { const g = PERIOD_GROUPS.find(g => `period-${g.name}` === hit.id); if (g) setDomain([g.start, g.end]); }
  };
  useEffect(() => { if (coverageJump) document.getElementById('source-coverage')?.scrollIntoView(); }, [coverageJump]);
  const openCoverage = () => { setView('about'); setCoverageJump(n => n + 1); };
  return <div className={`app book-app ${view === 'timeline' ? 'book-timeline' : view === 'reading' ? 'book-reading' : ''}`}>
    <a className="skip-content" href="#chronicle-content">跳到正文</a>
    <header className="site-head book-head">
      <div className="brand"><h1><button aria-label="此年 ChronoChina · 返回阅年" onClick={() => { setView('reading'); setSearchOpen(false); }}><img className="brand-mark" src="/favicon-art.png" alt="" /><span className="book-english">ChronoChina</span></button></h1></div>
      <nav className="book-nav" aria-label="主导航">
        <button title="阅年 · 一年一页" aria-label="阅年" aria-current={view === 'reading' ? 'page' : undefined} onClick={() => { setView('reading'); setSearchOpen(false); }}><NavIcon name="reading" /></button>
        <button title="并世 · 同期对照" aria-label="并世" aria-current={view === 'timeline' ? 'page' : undefined} onClick={() => { setView('timeline'); setSearchOpen(false); }}><NavIcon name="timeline" /></button>
        <button className="nav-entry" title="纪年资料库" aria-label="纪年资料库" aria-current={view === 'table' ? 'page' : undefined} onClick={() => { setSearchOpen(false); setView('table'); }}><NavIcon name="chronology" /></button>
        <button className="nav-entry" title="历史遗产" aria-label="历史遗产" aria-current={view === 'sites' ? 'page' : undefined} onClick={() => { setSearchOpen(false); setView('sites'); }}><NavIcon name="heritage" /></button>
        <button className="nav-entry" title="搜索 · Ctrl / ⌘ K" aria-label="搜索" aria-expanded={searchOpen} aria-haspopup="dialog" onClick={() => { if (searchOpen) setSearchOpen(false); else openPalette(q); }}><NavIcon name="search" /></button>
        <button className="nav-entry" title="关于本站" aria-label="关于本站" aria-current={view === 'about' ? 'page' : undefined} onClick={() => { setSearchOpen(false); setView('about'); }}><NavIcon name="about" /></button>
        <button className="theme-toggle" title={theme === 'dark' ? '切换浅色册页' : '切换暗色展厅'} aria-label={theme === 'dark' ? '切换浅色册页' : '切换暗色展厅'} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}><NavIcon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
      </nav>
    </header>
    {searchOpen && <SearchPalette key={paletteNonce} initialQuery={paletteSeed} year={year} onClose={() => setSearchOpen(false)} onSelect={selectHit} onPickDynasty={p => { jumpToYear(p.startYear, p.id); setDomain([p.startYear, p.endYear]); }} onPickPeriod={g => { jumpToYear(g.start); setDomain([g.start, g.end]); }} />}
    <main id="chronicle-content" tabIndex={-1}>
      {view === 'reading' && <YearBook year={year} onYear={setYear} blocked={searchOpen || !!detail} />}
      {view === 'about' && <section className="sources-page about-intro"><p className="eyebrow">关于本站 · ChronoChina</p><h2>岁月同流，山河异纪。</h2><p>以统一年份比较同时代政权、帝王与年号，按需查阅历史资料。</p><h3>如何阅读</h3><p>「阅年」一年一页，上下翻阅年份，横向阅读同期政权；点击年份或纪事，展开年度档案。「并世」保留连续时间轴，可上下滚动选年，Ctrl / Command + 滚轮缩放时段，点击当前年份输入年代。两种模式共用当前年份。</p><p>搜索窗口留空时列出历史时期与政权，点击直达开朝年并保留同期比较；输入年份、年号、姓名片段或政权拼音则转为检索，也可按 Ctrl / Command + K 打开。</p><p>区间端点按年标示且包含末年。同年改元可能出现重合，月份沿用原记载，并不等于精确公历日期。</p><p>阅年档案在侧边展开，合上后回到原页；并世中的年档案支持拖动、八向缩放、透明度调节和固定到侧边。</p><a className="book-read-more" href="#source-coverage">阅读来源与覆盖 ↓</a></section>}
      {view === 'about' && <section id="source-coverage" className="sources-page about-evidence"><p className="eyebrow">此年 · ChronoChina</p><p className="brand-motto">岁月同流，山河异纪。</p><h2>每一次定位，都应知道依据与缺口。</h2><div className="coverage-grid"><article className="card"><h3>主要政权纪年</h3><p>{formatYear(eraCoverage.min)}—{formatYear(eraCoverage.max)} 年，{polities.length} 个政权、{eras.length} 个年号。十六国与十国已补录，大理、西夏、西辽年号已补齐；分裂时期并立政权仍有少数旁支未录。</p></article><article className="card"><h3>事件、人物与遗产</h3><p>{events.length} 条事件、{persons.length} 位精选人物、{sites.length} 处遗产。空白年份表示尚未收录；事件参与政权、人物事迹及遗产年代仍需条目级复核。</p></article><article className="card"><h3>时间与复核规则</h3><p>界面使用公元／公元前，无公元 0 年。改元月份按原记载，不自动换算公历。计算校验通过不等于史实审定；异说、约数与复核状态分别说明。</p></article></div><h3>当前来源目录</h3>{sources.map(s => <article className="source-row" key={s.id}><h3>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> : s.name}</h3><p>{s.license} · {s.note || '汇总来源，具体条目出处待逐步完善。'}</p></article>)}</section>}

      {view === 'timeline' && <>
        <Timeline target={target} onNavigateYear={setYear} year={year} domain={domain} onOpenRecord={(kind, id) => {
          if (kind === 'polity') { const p = polities.find(p => p.id === id)!; setDetail({ title: p.name, text: `${formatYearFull(p.startYear)}—${formatYearFull(p.endYear)}。${p.note ?? '政权存续范围依据当前纪元资料整理。'} 年号收录与政权存续分别表达；具体出处见来源目录。`, year: p.startYear }); }
          if (kind === 'reign') { const r = reigns.find(r => r.id === id)!; setDetail({ title: `${r.title} · ${r.name}`, text: `${formatYearFull(r.startYear)}—${formatYearFull(r.endYear)}。${r.note ?? '在位区间按当前资料整理，待条目级复核。'}`, year: r.startYear }); }
          if (kind === 'era') { const e = eras.find(e => e.id === id)!; setDetail({ title: `${polities.find(p => p.id === e.polityId)?.name} · ${eraDisplayName(e.name)}`, text: `${formatYearFull(e.startYear)}—${formatYearFull(e.endYear)}。${e.startMonth ? e.startMonth + '月改元。' : ''}${e.note ?? ''}${e.disputed ? '本条存在异说。' : ''} 来源：${e.sources?.map(id => sources.find(s => s.id === id)?.name).join('、')}`, year: e.startYear }); }
        }} />
      </>}
      {<section className="collection-page" hidden={view !== 'table'}><header className="collection-head"><span className="collection-seal">纪元</span><div><p>CHRONOCHINA / CHRONOLOGY</p><h2>纪年资料库</h2><p>循年号，识君主，核对每一段历史的起讫。</p></div><small>{polities.length} 政权 · {eras.length} 条纪年</small></header><EraTable onJumpToYear={jumpToYear}/><p className="collection-note">起讫包含末年；涉及年份数不等于实际持续时长。点击年号，回到该纪年的起年。</p></section>}
      {<section className="collection-page" hidden={view !== 'sites'}><header className="collection-head"><span className="collection-seal">遗存</span><div><p>CHRONOCHINA / HERITAGE</p><h2>历史遗产</h2><p>从一处遗存，回望它所记录的时代。</p></div><small>{sites.length} 处精选遗产</small></header><Sites onJumpToYear={jumpToYear}/><p className="collection-note">精选资料，非完整名录。定位仅表示所录年代，不推断遗址持续存在或使用。</p></section>}
    </main>
    {view !== 'timeline' && view !== 'reading' && <footer className="foot"><span>此年 · ChronoChina · 数据 v{meta.version}</span><span>主要政权覆盖 · 精选资料 · 待条目复核</span><button className="ghost" onClick={openCoverage}>查看来源与覆盖范围</button></footer>}
    {(detail) && <dialog ref={dialogRef} className="detail-panel" aria-label={detail?.title ?? "年份历史档案"} onCancel={() => { setDetail(null); }}><button autoFocus className="ghost" onClick={() => { setDetail(null); document.getElementById('global-query')?.focus(); }}>关闭详情</button><p className="folio-label">历史档案</p>{<><h2>{detail.title}</h2><p>{detail.text}</p><p className="dim">当前展示整理资料；具体来源与异说仍需核对。</p>{detail.year !== null && detail.year >= eraCoverage.min && detail.year <= eraCoverage.max && <button className="jump" onClick={() => { jumpToYear(detail.year!); setDetail(null); }}>定位 {formatYearFull(detail.year)}</button>}<div className="archive-sources">{sources.filter(s => detail.text.includes(s.name)).map(s => s.url && <p key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a></p>)}</div></>}</dialog>}
  </div>;
}
