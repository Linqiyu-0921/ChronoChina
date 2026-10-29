import { useEffect, useRef, useState } from 'react';
import { eraCoverage, eraRowsAtYear, eventsByYear, polities } from '../lib/data';
import { eraDisplayName, eraYearLabel, formatYear, formatYearFull, ganzhiOf } from '../lib/time';
import YearPanel from '../components/YearPanel';

export default function YearBook({year,onYear,blocked}:{year:number;onYear:(year:number)=>void;blocked:boolean}) {
 const [archive,setArchive]=useState(false);
 const [selected,setSelected]=useState<string|null>(null);
 const leaf=useRef<HTMLElement>(null);
 const swipe=useRef<number|null>(null);
 const wheelState=useRef({sum:0,last:0});
 const archiveRef=useRef<HTMLElement>(null);
 const yearButton=useRef<HTMLButtonElement>(null);
 const turn=(delta:number)=>onYear(Math.max(eraCoverage.min,Math.min(eraCoverage.max,year+delta)));
 useEffect(()=>{
  const el=leaf.current;if(!el)return;
  const state=wheelState.current;
  const wheel=(e:WheelEvent)=>{
   if(blocked||archive||e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||(e.target as HTMLElement).closest('.yearbook-polities, .yearbook-story'))return;
   e.preventDefault();if(performance.now()-state.last<420)return;
   state.sum+=e.deltaY;if(Math.abs(state.sum)<65)return;
   turn(state.sum>0?1:-1);state.sum=0;state.last=performance.now();
  };
  el.addEventListener('wheel',wheel,{passive:false});
  return()=>el.removeEventListener('wheel',wheel);
 },[year,blocked,archive]);
 useEffect(()=>{setSelected(null);},[year]);
 useEffect(()=>{
  if(archive)archiveRef.current?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&archive){setArchive(false);yearButton.current?.focus();}};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[archive]);
 const active=polities.filter(p=>p.startYear<=year&&p.endYear>=year);
 const rows=eraRowsAtYear(year), stories=eventsByYear.get(year)??[];
 const ordered=[...active].sort((a,b)=>a.startYear-b.startYear);
 const changes=rows.filter(r=>r.era.startYear===year&&!r.era.name.includes('无年号')).slice(0,3).map(r=>`${r.polity.name}改元${eraDisplayName(r.era.name)}`);
 const cn=(n:number)=>n<=10?'〇一二三四五六七八九十'[n]:String(n);
 const tail=changes.length?`；${changes.join('，')}`:'';
 const epigraph=!ordered.length?`${ganzhiOf(year)}之年，此年政权资料尚未收录。`
  :ordered.length===1?`${ganzhiOf(year)}之年，${ordered[0].name}纪年${tail}。`
  :`${ganzhiOf(year)}之年，${cn(ordered.length)}政权并立${tail}。`;
 return <section ref={leaf} className="yearbook" aria-label="一年一页" onKeyDown={e=>{if(blocked||archive||/INPUT|TEXTAREA/.test((e.target as HTMLElement).tagName))return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();turn(e.key==='ArrowDown'?1:-1);}}}>
  <aside className="book-binding"><span>此年</span><small>中國歷史紀年</small><i aria-hidden="true">歲<br/>記</i></aside>
  <div className="yearbook-leaf" key={year}>
   <div className="yearbook-date" onTouchStart={e=>{swipe.current=e.touches[0].clientY;}} onTouchEnd={e=>{if(swipe.current!==null&&!blocked&&!archive){const delta=swipe.current-e.changedTouches[0].clientY;if(Math.abs(delta)>60)turn(delta>0?1:-1);}swipe.current=null;}}><p>CHRONOCHINA · 年度册页</p><button ref={yearButton} className="yearbook-year" onClick={()=>setArchive(true)} aria-label={`${formatYearFull(year)}，打开年档案`}><span className="year-ce">{formatYear(year)}</span><span className="year-ganzhi">{year<0?'公元前':'公元'} · {ganzhiOf(year)}年</span></button><div className="yearbook-paging"><button aria-label="上一年" disabled={year<=eraCoverage.min} onClick={()=>turn(-1)}>↑ {formatYear(year-1)}</button><span>上下阅年</span><button aria-label="下一年" disabled={year>=eraCoverage.max} onClick={()=>turn(1)}>{formatYear(year+1)} ↓</button></div></div>
   <section className="yearbook-contemporaries" aria-label="同期政权"><p className="year-epigraph">{epigraph}</p><div className={`yearbook-polities${ordered.length===5?' is-pair':''}`}>{ordered.map((p,i)=><article key={p.id} className={`polity-leaf ${selected===p.id?'expanded':''}`}><span className="polity-index" aria-hidden="true">{String(i+1).padStart(2,'0')}</span><div className="polity-body"><button className="polity-leaf-title" aria-expanded={selected===p.id} onClick={()=>setSelected(selected===p.id?null:p.id)}>{p.name}<span>{selected===p.id?'−':'＋'}</span></button>{rows.filter(r=>r.polity.id===p.id).map(r=><div className="book-era" key={r.era.id}>{r.era.name.includes('无年号')?<h2 className="era-none">无年号</h2>:<h2>{eraDisplayName(r.era.name)}<small>{eraYearLabel(r.eraYearNo)}</small></h2>}<p className="era-meta"><span>{r.ruler?.title} · {r.ruler?.name.split('（')[0]}</span><span className="era-span">{formatYear(r.era.startYear)}—{formatYear(r.era.endYear)}</span></p>{selected===p.id&&<div className="book-era-note">{r.era.startMonth?`${r.era.startMonth}月改元。`:''}{r.era.note??'起讫按年标示，包含末年。'}{r.era.disputed?' 本条存在异说。':''}</div>}</div>)}{!rows.some(r=>r.polity.id===p.id)&&<p className="era-meta"><span>纪年尚未收录</span></p>}</div></article>)}</div>{!ordered.length&&<p>本年政权资料尚未收录。</p>}{rows.length>ordered.length&&<p className="book-data-note">同年改元分别列出，不表示全年同时使用。</p>}</section>
   <section className="yearbook-story"><span className="story-index">紀<br/>事</span><div><p className="book-section-label">这一年 · 历史纪事</p><button onClick={()=>setArchive(true)}>{stories[0]?.title??'这一年的故事，尚待补录。'}</button><p>{stories[0]?.summary??'可先阅读同期纪年；空白不表示这一年没有历史事件。'}</p><button className="book-read-more" onClick={()=>setArchive(true)}>阅此年档案 {stories.length>0?`· ${stories.length} 条纪事`:''} ↗</button></div></section>
  </div>
  {archive&&<aside ref={archiveRef} tabIndex={-1} className="reading-archive" role="region" aria-label="年度阅读档案"><button className="archive-close" onClick={()=>{setArchive(false);yearButton.current?.focus();}} aria-label="合上年度档案">×</button><YearPanel year={year}/></aside>}
 </section>;
}
