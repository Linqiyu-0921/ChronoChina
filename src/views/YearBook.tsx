import { useEffect, useRef, useState } from 'react';
import { eraCoverage, eraRowsAtYear, eventsByYear, polities } from '../lib/data';
import { orderBySouthToNorth } from '../lib/geography';
import { eraDisplayName, eraYearLabel, formatYear, formatYearFull, ganzhiOf, reignLabel } from '../lib/time';
import { getLang, S, t } from '../lib/i18n';
import YearPanel from '../components/YearPanel';
import YearPoster from '../components/YearPoster';
import Han from '../components/Han';

export default function YearBook({year,onYear,blocked,onOpenRuler,selectedEvent,onSelectEvent}:{year:number;onYear:(year:number)=>void;blocked:boolean;onOpenRuler?:(reignId:string)=>void;selectedEvent?:string|null;onSelectEvent?:(id:string|null)=>void}) {
 const [archive,setArchive]=useState(false);
 const [poster,setPoster]=useState(false);
 const [selected,setSelected]=useState<string|null>(null);
 const leaf=useRef<HTMLElement>(null);
 const swipe=useRef<{x:number;y:number;vertical:boolean}|null>(null);
 const suppressClickUntil=useRef(0);
 const blockedRef=useRef(blocked);blockedRef.current=blocked;
 const archiveOrigin=useRef<HTMLElement|null>(null);
 const wheelState=useRef({sum:0,last:0});
 const archiveRef=useRef<HTMLElement>(null);
 const yearButton=useRef<HTMLButtonElement>(null);
 const currentYear=useRef(year);currentYear.current=year;
 const turn=(delta:number)=>{const next=Math.max(eraCoverage.min,Math.min(eraCoverage.max,currentYear.current+delta));currentYear.current=next;onYear(next);};
 useEffect(()=>{
  const el=leaf.current;if(!el)return;
  const state=wheelState.current;
  const wheel=(e:WheelEvent)=>{
   if(window.matchMedia('(max-width:650px)').matches||blocked||archive||e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||(e.target as HTMLElement).closest('.yearbook-polities, .yearbook-story'))return;
   e.preventDefault();if(performance.now()-state.last<420)return;
   state.sum+=e.deltaY;if(Math.abs(state.sum)<65)return;
   turn(state.sum>0?1:-1);state.sum=0;state.last=performance.now();
  };
  el.addEventListener('wheel',wheel,{passive:false});
  return()=>el.removeEventListener('wheel',wheel);
 },[year,blocked,archive]);
 useEffect(()=>{setSelected(null);},[year]);
 useEffect(()=>{if(selectedEvent)setArchive(true);},[selectedEvent]);
 useEffect(()=>{
  if(archive){archiveOrigin.current=document.activeElement as HTMLElement;archiveRef.current?.focus({preventScroll:true});}
  const mobile=matchMedia('(max-width:650px)').matches;
  const y=window.scrollY;
  const body=document.body;
  const previous={position:body.style.position,top:body.style.top,width:body.style.width};
  if(archive&&mobile){body.style.position='fixed';body.style.top=`-${y}px`;body.style.width='100%';}
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&archive&&!blockedRef.current){setArchive(false);onSelectEvent?.(null);yearButton.current?.focus({preventScroll:true});}};
  window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);if(archive&&mobile){Object.assign(body.style,previous);window.scrollTo(0,y);archiveOrigin.current?.focus({preventScroll:true});}};
 },[archive]);
 const active=polities.filter(p=>p.startYear<=year&&p.endYear>=year);
 const rows=eraRowsAtYear(year), stories=eventsByYear.get(year)??[];
 const ordered=orderBySouthToNorth(active);
 const changes=rows.filter(r=>r.era.startYear===year&&!r.era.name.includes('无年号')).slice(0,3).map(r=>t('yb.eraChange',{polity:r.polity.name,era:eraDisplayName(r.era.name)}));
 const cn=(n:number)=>n<=10?'〇一二三四五六七八九十'[n]:String(n);
 const sep=getLang()==='en'?', ':'，';
 const tail=changes.length?`${t('yb.tailJoin')}${changes.join(sep)}`:'';
 const epigraph=!ordered.length?t('yb.epigraphNone',{ganzhi:ganzhiOf(year)})
  :ordered.length===1?t('yb.epigraphSingle',{ganzhi:ganzhiOf(year),polity:ordered[0].name,tail})
  :t('yb.epigraphMany',{ganzhi:ganzhiOf(year),count:getLang()==='en'?ordered.length:cn(ordered.length),tail});
 return <section ref={leaf} className="yearbook" aria-label={t('yb.aria')} onKeyDown={e=>{if(blocked||archive||poster||/INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName))return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();turn(e.key==='ArrowDown'?1:-1);}}}>
  <aside className="book-binding"><span>此年</span><small>中國歷史紀年</small><i aria-hidden="true">歲<br/>記</i></aside>
  <div className="yearbook-leaf" onClickCapture={e=>{if(performance.now()<suppressClickUntil.current){e.preventDefault();e.stopPropagation();}}} onTouchCancel={()=>{swipe.current=null;suppressClickUntil.current=performance.now()+450;}} onTouchMove={e=>{if(!swipe.current)return;if(e.touches.length!==1){swipe.current=null;return;}const dx=Math.abs(e.touches[0].clientX-swipe.current.x),dy=Math.abs(e.touches[0].clientY-swipe.current.y);if(dy>12&&dy>dx)swipe.current.vertical=true;}} onTouchStart={e=>{if(blocked||archive||poster||e.touches.length!==1||(!matchMedia('(max-width:650px)').matches&&!(e.target as HTMLElement).closest('.yearbook-date'))){swipe.current=null;return;}swipe.current={x:e.touches[0].clientX,y:e.touches[0].clientY,vertical:false};}} onTouchEnd={e=>{if(swipe.current!==null&&!blocked&&!archive&&!poster){const mobile=window.matchMedia('(max-width:650px)').matches;const dx=swipe.current.x-e.changedTouches[0].clientX;const dy=swipe.current.y-e.changedTouches[0].clientY;const delta=mobile?dx:dy;if(mobile&&(Math.abs(dx)>12||Math.abs(dy)>12))suppressClickUntil.current=performance.now()+450;if(Math.abs(delta)>72&&(!mobile||(!swipe.current.vertical&&Math.abs(dx)>Math.abs(dy)*1.8))){turn(delta>0?1:-1);}}swipe.current=null;}}>
   <div className="yearbook-date"><p>{t('yb.kicker')}</p><button ref={yearButton} className="yearbook-year" onClick={()=>setArchive(true)} aria-label={t('yb.openArchive',{year:formatYearFull(year)})}><span className="year-ce">{formatYear(year)}</span><span className="year-ganzhi">{getLang()==='en'?ganzhiOf(year):`${year<=0?t('unit.bce'):t('unit.ce')} · ${ganzhiOf(year)}年`}</span></button><div className="yearbook-paging"><button aria-label={t('yb.prev')} disabled={year<=eraCoverage.min} onClick={()=>turn(-1)}>↑ {formatYear(year-1)}</button><span className="desktop-paging-hint">{t('yb.hintDesktop')}</span><button aria-label={t('yb.next')} disabled={year>=eraCoverage.max} onClick={()=>turn(1)}>{formatYear(year+1)} ↓</button></div></div>
   <section className="yearbook-contemporaries" aria-label={t('yb.contemporaries')}><p className="year-epigraph">{epigraph}</p><div className={`yearbook-polities${ordered.length===5?' is-pair':''}`}>{ordered.map((p,i)=><article key={p.id} className={`polity-leaf ${selected===p.id?'expanded':''}`}><span className="polity-index" aria-hidden="true">{String(i+1).padStart(2,'0')}</span><div className="polity-body"><button className="polity-leaf-title" aria-expanded={selected===p.id} onClick={()=>setSelected(selected===p.id?null:p.id)}><Han text={p.name}/><span>{selected===p.id?'−':'＋'}</span></button>{rows.filter(r=>r.polity.id===p.id).map(r=><div className="book-era" key={r.era.id}>{r.era.name.includes('无年号')?<h2 className="era-none">{t('yb.noEra')}</h2>:<h2><Han text={eraDisplayName(r.era.name)}/><small>{eraYearLabel(r.eraYearNo)}</small></h2>}<p className="era-meta"><span>{r.ruler && onOpenRuler ? <button type="button" className="reign-link" onClick={()=>onOpenRuler(r.ruler!.id)}><Han text={reignLabel(r.ruler)}/></button> : <Han text={reignLabel(r.ruler)}/>}</span><span className="era-span">{formatYear(r.era.startYear)}—{formatYear(r.era.endYear)}</span></p>{selected===p.id&&<div className="book-era-note">{r.era.startMonth?t('yb.monthChange',{month:r.era.startMonth}):''}{S(r.era.note)||t('yb.spanNote')}{r.era.disputed?` ${t('yb.disputed')}`:''}</div>}</div>)}{!rows.some(r=>r.polity.id===p.id)&&<p className="era-meta"><span>{t('yb.eraMissing')}</span></p>}</div></article>)}</div>{!ordered.length&&<p>{t('yb.empty')}</p>}{rows.length>ordered.length&&<p className="book-data-note">{t('yb.groupNote')}</p>}</section>
   <section className="yearbook-story"><span className="story-index">紀<br/>事</span><div><p className="book-section-label">{t('yb.storyLabel')}</p><button onClick={()=>{setArchive(true);if(stories[0])onSelectEvent?.(stories[0].id);}}><Han text={stories[0]?.title??t('yb.storyFallback')}/></button><p><Han text={stories[0]?.summary??t('yb.storySummaryFallback')}/></p><button className="book-read-more" onClick={()=>setArchive(true)}>{t('yb.openDossier')}{stories.length>0?t('yb.eventCount',{n:stories.length}):''} ↗</button></div></section>
  </div>
  <button className="mobile-poster-trigger" onClick={()=>setPoster(true)}><img src="./assets/icons/gold-outline/10-events.png" alt=""/>{t('yb.poster')}</button>
  {poster&&<YearPoster year={year} onClose={()=>setPoster(false)}/>}
  {archive&&<aside ref={archiveRef} tabIndex={-1} className="reading-archive" role="region" aria-label={t('yb.archive')}><button className="archive-close" onClick={()=>{setArchive(false);onSelectEvent?.(null);yearButton.current?.focus({preventScroll:true});}} aria-label={t('yb.closeArchive')}>×</button><div className="mobile-archive-heading"><img src="./assets/icons/gold-outline/09-artifact.png" alt=""/><span>此年 · 年度档案</span><button onClick={()=>{setArchive(false);onSelectEvent?.(null);yearButton.current?.focus({preventScroll:true});}}>‹ 返回阅年</button></div><YearPanel year={year} selectedEvent={selectedEvent} onSelectEvent={onSelectEvent} onOpenRuler={onOpenRuler}/></aside>}
 </section>;
}
