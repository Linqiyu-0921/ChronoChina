import { useEffect, useRef, useState } from 'react';
import { eraRowsAtYear } from '../lib/data';
import { eraDisplayName, eraYearLabel, formatYear, formatYearFull, ganzhiOf } from '../lib/time';
import { getLang, S, t } from '../lib/i18n';

export default function YearPoster({year,onClose}:{year:number;onClose:()=>void}) {
 const [style,setStyle]=useState<'light'|'dark'>(()=>document.documentElement.dataset.theme==='light'?'light':'dark');
 const dialog=useRef<HTMLDialogElement>(null);
 const [url,setUrl]=useState('');
 const [error,setError]=useState('');
 const blob=useRef<Blob|null>(null);
 useEffect(()=>{
  setUrl('');setError('');blob.current=null;
  const before=document.activeElement as HTMLElement;
  const el=dialog.current;if(!el?.open)el?.showModal();
  let disposed=false,objectUrl='';
  const generate=async()=>{
   await document.fonts.ready;
   const ornament=new Image();ornament.src='./assets/icons/gold-outline/08-compass.png';
   await ornament.decode();
   const light=style==='light';
   const ink=light?'#40382b':'#eee1c6',goldColor=light?'#846538':'#d6bd8b',muted=light?'#756957':'#a99d87',rule=light?'#c9b997':'#655237';
   const rows=eraRowsAtYear(year);
   const height=Math.max(1700,1170+rows.length*120);
   const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=height;
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error(t('po.canvasFail'));
   ctx.fillStyle=light?'#f5f0e5':'#11100d';ctx.fillRect(0,0,1080,height);
   ctx.strokeStyle=rule;ctx.lineWidth=1;ctx.strokeRect(44,44,992,height-88);
   ctx.textAlign='center';ctx.fillStyle=goldColor;ctx.font='34px serif';ctx.fillText(t('po.brand'),540,126);
   ctx.font='24px serif';ctx.fillStyle=muted;ctx.fillText(t('po.motto'),540,180);
   ctx.save();ctx.globalAlpha=light?.8:.95;ctx.drawImage(ornament,470,216,140,140);ctx.restore();
   const value=formatYear(year);ctx.font=`${value.length>4?200:260}px Georgia`;ctx.lineWidth=2;
   const gold=ctx.createLinearGradient(100,230,900,620);gold.addColorStop(0,'#957443');gold.addColorStop(.5,light?'#a27d43':'#f0dba6');gold.addColorStop(1,'#b08c55');ctx.strokeStyle=gold;ctx.strokeText(value,540,630);
   ctx.fillStyle=goldColor;ctx.font='34px serif';ctx.fillText(getLang()==='en'?`${formatYearFull(year)} · ${ganzhiOf(year)}`:`${year<=0?t('unit.bce'):t('unit.ce')} · ${ganzhiOf(year)}年`,540,720);
   ctx.strokeStyle=rule;ctx.beginPath();ctx.moveTo(110,790);ctx.lineTo(970,790);ctx.stroke();
   ctx.font='25px serif';ctx.fillText(t('po.eras'),540,850);
   ctx.textAlign='left';
   rows.forEach((r,i)=>{const y=940+i*120;ctx.fillStyle=goldColor;ctx.font='26px serif';ctx.fillText(S(r.polity.name),120,y);ctx.fillStyle=ink;ctx.font='34px serif';const label=`${S(eraDisplayName(r.era.name))} · ${eraYearLabel(r.eraYearNo)}`;let size=34;while(ctx.measureText(label).width>580&&size>18){ctx.font=`${--size}px serif`;}ctx.fillText(label,370,y);ctx.fillStyle=muted;ctx.font='21px serif';ctx.fillText(`${formatYear(r.era.startYear)}—${formatYear(r.era.endYear)}${r.era.disputed?` · ${t('tl.disputed')}`:r.era.precision==='approx'?` · ${t('tl.approx')}`:''}`,370,y+36);});
   if(!rows.length){ctx.textAlign='center';ctx.fillStyle='#c4b595';ctx.font='30px serif';ctx.fillText(t('po.empty'),540,980);}
   ctx.textAlign='center';ctx.fillStyle=muted;ctx.font='22px serif';ctx.fillText(t('po.note1'),540,height-200);ctx.fillText(t('po.note2'),540,height-155);
   ctx.fillStyle=goldColor;ctx.font='26px Georgia';ctx.fillText('cinian.laneqiyu.cn',540,height-95);
   const result=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error(t('po.imageFail'))),'image/png'));
   if(disposed)return;blob.current=result;objectUrl=URL.createObjectURL(result);setUrl(objectUrl);
  };
  generate().catch(()=>{if(!disposed)setError(t('po.fail'));});
  return()=>{disposed=true;el?.close();if(objectUrl)URL.revokeObjectURL(objectUrl);before?.focus();};
 },[year,style]);
 const share=async()=>{
  if(!blob.current)return;
  const file=new File([blob.current],(getLang()==='en'?`chronochina-${formatYear(year)}`:`此年-${formatYear(year)}`)+'.png',{type:'image/png'});
  if(navigator.canShare?.({files:[file]})){try{await navigator.share({files:[file],title:t('po.shareTitle',{year:formatYear(year)})});}catch(e){if((e as Error).name!=='AbortError')setError(t('po.shareFail'));}}
  else setError(t('po.shareUnsupported'));
 };
 return <dialog ref={dialog} className={`year-poster poster-${style}`} aria-label={t('po.aria')} onCancel={e=>{e.preventDefault();onClose();}}><header><span>{t('po.title')}</span><button onClick={onClose} aria-label={t('po.close')}>×</button></header><div className="poster-style-switch" role="group" aria-label={t('po.style')}><button aria-pressed={style==='light'} onClick={()=>setStyle('light')}>{t('po.light')}</button><button aria-pressed={style==='dark'} onClick={()=>setStyle('dark')}>{t('po.dark')}</button></div>{url?<img src={url} alt={t('po.alt',{year:formatYear(year)})}/>:<p role="status">{error||t('po.generating')}</p>}<footer>{url&&<><a href={url} download={(getLang()==='en'?`chronochina-${formatYear(year)}`:`此年-${formatYear(year)}`)+'.png'}>{t('po.download')}</a><button onClick={share}>{t('po.share')}</button></>}{error&&<p role="status">{error}</p>}</footer></dialog>;
}
