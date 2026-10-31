import { useEffect, useRef, useState } from 'react';
import MobileYearPicker from './MobileYearPicker';
import { t, type Lang, LANGS, LANG_LABEL } from '../lib/i18n';
const iconFiles = { menu:'21-grid',reading:'06-topic',timeline:'02-chronology',chronology:'12-archive',heritage:'03-heritage',search:'04-search',about:'05-about',sun:'27-full-moon',moon:'24-moon-phase-1' } as const;
function NavIcon({name}:{name:keyof typeof iconFiles}) { return <img className="nav-icon artifact-icon" src={`./assets/icons/gold-outline/${iconFiles[name]}.png`} alt="" aria-hidden="true" />; }

type View = 'reading' | 'timeline' | 'table' | 'sites' | 'about';
const entries = [
  { view: 'reading', icon: 'reading', name: 'mb.entryReading', description: 'mb.entryReadingDesc' },
  { view: 'timeline', icon: 'timeline', name: 'mb.entryTimeline', description: 'mb.entryTimelineDesc' },
  { view: 'table', icon: 'chronology', name: 'mb.entryTable', description: 'mb.entryTableDesc' },
  { view: 'sites', icon: 'heritage', name: 'mb.entrySites', description: 'mb.entrySitesDesc' },
] as const;

export default function MobileNavigation({ year, onPickYear, view, theme, lang, onLang, onNavigate, onSearch, onTheme, automaticTheme, onAutomaticTheme }: {
  year:number; onPickYear:(year:number)=>void; view: View; theme: 'light' | 'dark'; lang: Lang; onLang: (lang: Lang) => void; onNavigate: (view: View) => void; onSearch: () => void; onTheme: () => void; automaticTheme: boolean; onAutomaticTheme: () => void;
}) {
  const [picking,setPicking]=useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const el = dialog.current;
    const previous = document.body.style.overflow;
    el?.showModal();
    document.body.style.overflow = 'hidden';
    const media = matchMedia('(max-width:650px)');
    const resize = () => { if (!media.matches) setOpen(false); };
    media.addEventListener('change', resize);
    return () => { el?.close(); document.body.style.overflow = previous; media.removeEventListener('change', resize); trigger.current?.focus(); };
  }, [open]);
  const navigate = (next: View) => { setOpen(false); onNavigate(next); };
  return <>
    <header className="mobile-head">
      <button ref={trigger} onClick={() => setOpen(true)} aria-label={t('mb.openMenu')} aria-haspopup="dialog" aria-expanded={open}><NavIcon name="menu" /></button>
      <button className="mobile-brand" onClick={() => setPicking(true)} aria-label="此年，选择年份" aria-haspopup="dialog">{lang === 'en' ? 'ChronoChina' : '此年'}<small>CHRONOCHINA</small></button>
      <button onClick={onSearch} aria-label={t('mb.search')}><NavIcon name="search" /></button>
    </header>
    {view !== 'reading' && <div className="mobile-page-return"><button onClick={() => onNavigate('reading')}>{t('mb.backReading')}</button><span>{view === 'timeline' ? t('nav.timeline') : view === 'table' ? t('mb.entryTable') : view === 'sites' ? t('mb.entrySites') : t('mb.about')}</span></div>}
    {picking && <MobileYearPicker year={year} onPick={onPickYear} onClose={()=>setPicking(false)}/>}
    {open && <dialog ref={dialog} className="mobile-menu" aria-labelledby="mobile-menu-title" onCancel={e => { e.preventDefault(); setOpen(false); }}>
      <header><span id="mobile-menu-title">{t('mb.menuTitle')}</span><button autoFocus onClick={() => setOpen(false)} aria-label={t('mb.closeMenu')}>×</button></header>
      <p className="mobile-menu-motto">{t('mb.motto')}</p>
      <nav aria-label={t('mb.nav')}>{entries.map(entry => <button key={entry.view} aria-current={view === entry.view ? 'page' : undefined} onClick={() => navigate(entry.view)}><NavIcon name={entry.icon} /><span>{t(entry.name)}<small>{t(entry.description)}</small></span><i aria-hidden="true">{view === entry.view ? '·' : '›'}</i></button>)}</nav>
      <div className="mobile-lang" role="group" aria-label={t('lang.switch')}>{LANGS.map(item => <button key={item} aria-label={t(LANG_LABEL[item][1])} aria-pressed={lang === item} onClick={() => onLang(item)}>{t(LANG_LABEL[item][0])}</button>)}</div>
      <button className="mobile-auto-theme" aria-pressed={automaticTheme} onClick={onAutomaticTheme}>{automaticTheme ? t('mb.autoThemeOn') : t('mb.autoThemeReset')}</button>
      <footer><button onClick={onTheme}><NavIcon name={theme === 'dark' ? 'sun' : 'moon'} />{theme === 'dark' ? t('mb.toLight') : t('mb.toDark')}</button><button onClick={() => navigate('about')}><NavIcon name="about" />{t('mb.about')}</button></footer>
    </dialog>}
  </>;
}
