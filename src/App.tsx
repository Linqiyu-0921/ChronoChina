import { useEffect, useRef, useState } from 'react';
import Timeline from './views/Timeline';
import YearBook from './views/YearBook';
import SearchPalette from './components/SearchPalette';
import NavIcon from './components/NavIcon';
import RulerDossier from './components/RulerDossier';
import MobileNavigation from './components/MobileNavigation';
import { PERIOD_GROUPS } from './lib/navigation';
import type { SearchHit } from './lib/search';
import EraTable from './views/EraTable';
import Sites from './views/Sites';
import { eraCoverage, meta, sources, persons, events, sites, polities, eras } from './lib/data';
import { eraDisplayName, formatYear, formatYearFull } from './lib/time';
import { applyLang, detectLang, ensureLang, getLang, rememberLang, S, t, type Lang, LANGS, LANG_LABEL } from './lib/i18n';

type View = 'reading' | 'timeline' | 'table' | 'sites' | 'about';
const readState = () => {
  const p = new URLSearchParams(location.search);
  const valid = (key: string, fallback: number) => { const n = Number(p.get(key)); return p.has(key) && Number.isFinite(n) ? n : fallback; };
  const start = Math.max(eraCoverage.min, valid('from', eraCoverage.min));
  const end = Math.min(eraCoverage.max, valid('to', eraCoverage.max));
  const raw = p.get('view') === 'sources' ? 'about' : p.get('view');
  const hashEvent = location.hash.startsWith('#event-') ? decodeURIComponent(location.hash.slice(7)) : '';
  const requestedEvent = p.get('event') || hashEvent;
  const linkedEvent = requestedEvent ? events.find((ev) => ev.id === requestedEvent) : undefined;
  const year = linkedEvent ? linkedEvent.year : Math.max(eraCoverage.min, Math.min(eraCoverage.max, Math.round(valid('year', 1127))));
  return { view: (['reading', 'timeline', 'table', 'sites', 'about'].includes(raw ?? '') ? raw : 'reading') as View, year, domain: (end - start >= 3 ? [start, end] : [eraCoverage.min, eraCoverage.max]) as [number, number], q: p.get('q') ?? '', event: linkedEvent?.id ?? null, lang: detectLang() };
};

export default function App() {
  const [initial] = useState(readState);
  const [lang, setLang] = useState<Lang>(initial.lang);
  applyLang(lang);
  const changeLang = (next: Lang) => {
    if (next === lang) return;
    rememberLang(next);
    ensureLang(next).then(() => { applyLang(next); setLang(next); });
  };
  const [theme, setTheme] = useState<'light' | 'dark'>(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const [automaticTheme, setAutomaticTheme] = useState(() => { try { return !localStorage.getItem('chronochina-original-theme'); } catch { return true; } });
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    if (!automaticTheme) return;
    const sync = () => { if (matchMedia('(max-width:650px)').matches) { const hour = new Date().getHours(); setTheme(hour >= 7 && hour < 19 ? 'light' : 'dark'); } };
    sync(); const timer = window.setInterval(sync, 60000);
    window.addEventListener('focus', sync);
    return () => { clearInterval(timer); window.removeEventListener('focus', sync); };
  }, [automaticTheme]);
  const toggleTheme = () => { const next = theme === 'dark' ? 'light' : 'dark'; setAutomaticTheme(false); setTheme(next); try { localStorage.setItem('chronochina-original-theme', next); } catch {} };
  const resetTheme = () => { try { localStorage.removeItem('chronochina-original-theme'); } catch {} setAutomaticTheme(true); };

  const [view, setView] = useState<View>(initial.view);
  const [year, setYear] = useState(initial.year);
  const [domain, setDomain] = useState<[number, number]>(initial.domain);
  const [q, setQ] = useState(initial.q);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(initial.event);
  const [searchOpen, setSearchOpen] = useState(new URLSearchParams(location.search).get('view') === 'convert');
  const [paletteSeed, setPaletteSeed] = useState(initial.q);
  const [paletteNonce, setPaletteNonce] = useState(0);
  const [coverageJump, setCoverageJump] = useState(0);
  const [detail, setDetail] = useState<{ title: string; text: string; year: number | null } | null>(null);
  const [rulerId, setRulerId] = useState<string | null>(null);
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
    const p = new URLSearchParams({ view, year: String(year), from: String(domain[0]), to: String(domain[1]), lang });
    if (q) p.set('q', q);
    if (selectedEvent) p.set('event', selectedEvent);
    history.replaceState(null, '', `?${p}`);
  }, [view, year, domain, q, selectedEvent, lang]);
  useEffect(() => {
    const onPop = () => {
      const s = readState();
      setView(s.view); setYear(s.year); setDomain(s.domain); setQ(s.q); setSelectedEvent(s.event);
      if (s.lang !== getLang()) ensureLang(s.lang).then(() => { applyLang(s.lang); setLang(s.lang); });
    };
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
    if (hit.category === t('cat.event')) setSelectedEvent(hit.id);
    if (hit.category === t('cat.ruler')) { setDetail(null); setRulerId(hit.id); }
    if (hit.category === t('cat.polity')) { const p = polities.find(p => p.id === hit.polityId); if (p) setDomain([p.startYear, p.endYear]); }
    else if (hit.category === t('cat.period')) { const g = PERIOD_GROUPS.find(g => `period-${g.name}` === hit.id); if (g) setDomain([g.start, g.end]); }
  };
  useEffect(() => { if (coverageJump) document.getElementById('source-coverage')?.scrollIntoView(); }, [coverageJump]);
  const openCoverage = () => { setView('about'); setCoverageJump(n => n + 1); };
  return <div className={`app book-app ${view === 'timeline' ? 'book-timeline' : view === 'reading' ? 'book-reading' : ''}`}>
    <a className="skip-content" href="#chronicle-content">{t('nav.skip')}</a>
    <header className="site-head book-head">
      <div className="brand"><h1><button aria-label={t('nav.brand')} onClick={() => { setView('reading'); setSearchOpen(false); }}><img className="brand-mark" src="/favicon-art.png" alt="" /><span className="book-english">ChronoChina</span></button></h1></div>
      <nav className="book-nav" aria-label={t('mb.nav')}>
        <button title={t('nav.readingTitle')} aria-label={t('nav.reading')} aria-current={view === 'reading' ? 'page' : undefined} onClick={() => { setView('reading'); setSearchOpen(false); }}><NavIcon name="reading" /></button>
        <button title={t('nav.timelineTitle')} aria-label={t('nav.timeline')} aria-current={view === 'timeline' ? 'page' : undefined} onClick={() => { setView('timeline'); setSearchOpen(false); }}><NavIcon name="timeline" /></button>
        <button className="nav-entry" title={t('nav.table')} aria-label={t('nav.table')} aria-current={view === 'table' ? 'page' : undefined} onClick={() => { setSearchOpen(false); setView('table'); }}><NavIcon name="chronology" /></button>
        <button className="nav-entry" title={t('nav.sites')} aria-label={t('nav.sites')} aria-current={view === 'sites' ? 'page' : undefined} onClick={() => { setSearchOpen(false); setView('sites'); }}><NavIcon name="heritage" /></button>
        <button className="nav-entry" title={t('nav.searchTitle')} aria-label={t('nav.search')} aria-expanded={searchOpen} aria-haspopup="dialog" onClick={() => { if (searchOpen) setSearchOpen(false); else openPalette(q); }}><NavIcon name="search" /></button>
        <button className="nav-entry" title={t('nav.about')} aria-label={t('nav.about')} aria-current={view === 'about' ? 'page' : undefined} onClick={() => { setSearchOpen(false); setView('about'); }}><NavIcon name="about" /></button>
        <div className="lang-switch" role="group" aria-label={t('lang.switch')}>
          {LANGS.map(item => <button key={item} aria-label={t(LANG_LABEL[item][1])} aria-pressed={lang === item} data-lang={item} onClick={() => changeLang(item)}>{t(LANG_LABEL[item][0])}</button>)}
        </div>
        <button className="theme-toggle" title={theme === 'dark' ? t('nav.themeToLight') : t('nav.themeToDark')} aria-label={theme === 'dark' ? t('nav.themeToLight') : t('nav.themeToDark')} onClick={toggleTheme}><NavIcon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
      </nav>
    </header>
    <MobileNavigation year={year} onPickYear={y => { setYear(y); setSelectedEvent(null); setView('reading'); }} view={view} theme={theme} lang={lang} onLang={changeLang} onNavigate={next => { setView(next); setSearchOpen(false); window.scrollTo(0, 0); }} onSearch={() => openPalette('')} onTheme={toggleTheme} automaticTheme={automaticTheme} onAutomaticTheme={resetTheme} />
    {searchOpen && <SearchPalette key={paletteNonce} initialQuery={paletteSeed} year={year} onClose={() => setSearchOpen(false)} onSelect={selectHit} onPickDynasty={p => { jumpToYear(p.startYear, p.id); setDomain([p.startYear, p.endYear]); }} onPickPeriod={g => { jumpToYear(g.start); setDomain([g.start, g.end]); }} />}
    <main id="chronicle-content" tabIndex={-1}>
      {view === 'reading' && <YearBook year={year} onYear={(y) => { setYear(y); setSelectedEvent(null); }} blocked={searchOpen || !!detail || !!rulerId} onOpenRuler={setRulerId} selectedEvent={selectedEvent} onSelectEvent={setSelectedEvent}/>}
      {view === 'about' && <section className="sources-page about-intro"><p className="eyebrow">{t('about.eyebrow')}</p><h2>{t('about.motto')}</h2><p>{t('about.lead')}</p><h3>{t('about.how')}</h3><p>{t('about.how1')}</p><p>{t('about.how2')}</p><p>{t('about.how3')}</p><p>{t('about.how4')}</p><a className="book-read-more" href="#source-coverage">{t('about.more')}</a></section>}
      {view === 'about' && <section id="source-coverage" className="sources-page about-evidence"><p className="eyebrow">此年 · ChronoChina</p><p className="brand-motto">{t('about.evidenceMotto')}</p><h2>{t('about.evidenceTitle')}</h2><div className="coverage-grid"><article className="card"><h3>{t('about.card1Title')}</h3><p>{t('about.card1Body', { from: formatYear(eraCoverage.min), to: formatYear(eraCoverage.max), polities: polities.length, eras: eras.length })}</p></article><article className="card"><h3>{t('about.card2Title')}</h3><p>{t('about.card2Body', { events: events.length, persons: persons.length, sites: sites.length })}</p></article><article className="card"><h3>{t('about.card3Title')}</h3><p>{t('about.card3Body')}</p></article></div><h3>{t('about.sources')}</h3>{sources.map(s => <article className="source-row" key={s.id}><h3>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{S(s.name)}</a> : S(s.name)}</h3><p>{S(s.license)} · {S(s.note) || t('about.sourceNote')}</p></article>)}</section>}

      {view === 'timeline' && <>
        <Timeline target={target} onNavigateYear={setYear} year={year} domain={domain} onOpenRecord={(kind, id) => {
          if (kind === 'polity') { const p = polities.find(p => p.id === id)!; setDetail({ title: t('tl.detailPolityTitle', { polity: S(p.name) }), text: t('tl.detailPolity', { span: `${formatYearFull(p.startYear)}—${formatYearFull(p.endYear)}`, note: S(p.note) || t('tl.detailPolityNote') }), year: p.startYear }); }
          if (kind === 'reign') { setDetail(null); setRulerId(id); }
          if (kind === 'era') { const e = eras.find(e => e.id === id)!; setDetail({ title: `${S(polities.find(p => p.id === e.polityId)?.name ?? '')} · ${S(eraDisplayName(e.name))}`, text: t('tl.detailEra', { span: `${formatYearFull(e.startYear)}—${formatYearFull(e.endYear)}`, month: e.startMonth ? t('tl.detailEraMonth', { month: e.startMonth }) : '', note: S(e.note ?? ''), disputed: e.disputed ? t('tl.detailEraDisputed') : '', sources: (e.sources ?? []).map(id => S(sources.find(s => s.id === id)?.name ?? '')).join(t('tl.listSep')) }), year: e.startYear }); }
        }} />
      </>}
      {<section className="collection-page" hidden={view !== 'table'}><header className="collection-head"><span className="collection-seal">{t('col.tableSeal')}</span><div><p>CHRONOCHINA / CHRONOLOGY</p><h2>{t('col.tableTitle')}</h2><p>{t('col.tableLead')}</p></div><small>{t('col.tableCount', { polities: polities.length, eras: eras.length })}</small></header><EraTable onJumpToYear={jumpToYear} onOpenRuler={setRulerId}/><p className="collection-note">{t('col.tableNote')}</p></section>}
      {<section className="collection-page" hidden={view !== 'sites'}><header className="collection-head"><span className="collection-seal">{t('col.sitesSeal')}</span><div><p>CHRONOCHINA / HERITAGE</p><h2>{t('col.sitesTitle')}</h2><p>{t('col.sitesLead')}</p></div><small>{t('col.sitesCount', { n: sites.length })}</small></header><Sites onJumpToYear={jumpToYear}/><p className="collection-note">{t('col.sitesNote')}</p></section>}
    </main>
    {view !== 'timeline' && view !== 'reading' && <footer className="foot"><span>{t('footer.meta', { version: meta.version })}</span><span>{t('footer.note')}</span><button className="ghost" onClick={openCoverage}>{t('footer.sources')}</button></footer>}
    {rulerId && <RulerDossier reignId={rulerId} onClose={() => setRulerId(null)} onJump={(y) => { jumpToYear(y); setRulerId(null); }} onOpenRuler={setRulerId}/>}
    {(detail) && <dialog ref={dialogRef} className="detail-panel" aria-label={detail?.title ?? t('detail.aria')} onCancel={() => { setDetail(null); }}><button autoFocus className="ghost" onClick={() => { setDetail(null); document.getElementById('global-query')?.focus(); }}>{t('detail.close')}</button><p className="folio-label">{t('detail.label')}</p>{<><h2>{detail.title}</h2><p>{detail.text}</p><p className="dim">{t('detail.note')}</p>{detail.year !== null && detail.year >= eraCoverage.min && detail.year <= eraCoverage.max && <button className="jump" onClick={() => { jumpToYear(detail.year!); setDetail(null); }}>{t('detail.jump', { year: formatYearFull(detail.year) })}</button>}<div className="archive-sources">{sources.filter(s => detail.text.includes(s.name)).map(s => s.url && <p key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{S(s.name)} ↗</a></p>)}</div></>}</dialog>}
  </div>;
}
