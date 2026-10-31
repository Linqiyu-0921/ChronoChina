/**
 * 传统学术纪元表视图：按政权筛选、排序展示，支持 CSV 导出。
 */
import { useState } from 'react';
import { erasByPolity, polities, reignById, sourceShort, type EraUse } from '../lib/data';
import { eraDisplayName, formatYear, ganzhiOf, monthLabel, reignLabel } from '../lib/time';
import { getLang, S, t } from '../lib/i18n';
import Han from '../components/Han';

export default function EraTable({onJumpToYear,onOpenRuler}:{onJumpToYear:(year:number)=>void;onOpenRuler?:(reignId:string)=>void}) {
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const sep = getLang() === 'en' ? '; ' : '；';
  const listSep = getLang() === 'en' ? ', ' : '、';
  const shown = polities.filter((p) => filter === 'all' || p.id === filter);

  const rows: { p: (typeof polities)[number]; e: EraUse }[] = [];
  for (const p of shown) {
    for (const e of erasByPolity.get(p.id) ?? []) if (`${p.name} ${e.name} ${e.reignIds.map(id => { const r = reignById.get(id); return r ? r.title + r.name : ''; }).join(' ')}`.includes(query.trim())) rows.push({ p, e });
  }

  const exportCsv = () => {
    const head = [t('et.csvPolity'), t('et.csvRuler'), t('et.csvEra'), t('et.csvStart'), t('et.csvGanzhi'), t('et.csvEnd'), t('et.csvYears'), t('et.csvMonth'), t('et.csvNote'), t('et.csvSource')];
    const lines = rows.map(({ p, e }) => {
      const rulers = e.reignIds
        .map((id) => reignById.get(id))
        .filter(Boolean)
        .map((r) => reignLabel(r!))
        .join(' → ');
      const note = [e.disputed ? t('et.noteDisputed', { note: e.note ?? '' }) : e.note, e.endNote].filter(Boolean).join(sep);
      return [
        S(p.name),
        S(rulers),
        S(eraDisplayName(e.name)),
        formatYear(e.startYear),
        ganzhiOf(e.startYear),
        formatYear(e.endYear),
        String(e.endYear - e.startYear + 1),
        e.startMonth ? monthLabel(e.startMonth) : '',
        S(note),
        sourceShort(e.sources).map(S).join(listSep),
      ]
        .map((c) => `"${c.replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = '\uFEFF' + [head.join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chronochina-era-table.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="eratable card">
      <div className="et-toolbar">
        <input aria-label={t('et.filterAria')} placeholder={t('et.filterPlaceholder')} value={query} onChange={e => setQuery(e.target.value)} />
        <select aria-label={t('et.polityAria')} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">{t('et.allPolities')}</option>
          {polities.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="dim">{t('et.count', { n: rows.length })}</span>
        <button className="ghost" onClick={exportCsv}>
          {t('et.export')}
        </button>
      </div>
      <div className="mobile-era-list">
        {!rows.length && <p className="search-empty">{t('et.empty')}</p>}
        {rows.map(({p,e}) => <details key={e.id} className="mobile-era-record">
          <summary><span><Han text={p.name}/><small>{formatYear(e.startYear)}—{formatYear(e.endYear)}</small></span><strong><Han text={eraDisplayName(e.name)}/></strong><span className="mobile-era-flags">{e.disputed ? t('et.disputed') : ''}{e.precision === 'approx' ? t('et.approx') : ''}{t('et.detail')}</span></summary>
          <p>{e.reignIds.map(id => reignById.get(id)).filter(Boolean).map(r => `${S(r!.title)} ${S(r!.name)}`).join(' → ')}</p>
          <p>{t('et.epochGanzhi', { ganzhi: ganzhiOf(e.startYear), n: e.endYear - e.startYear + 1 })}{e.startMonth ? ` · ${t('tl.eraChange', { month: e.startMonth })}` : ''}</p>
          <p>{[S(e.note),S(e.endNote),e.crossReign?t('et.crossReign'):''].filter(Boolean).join(sep) || t('et.spanNote')}</p>
          <p>{t('et.sources', { list: sourceShort(e.sources).map(S).join(listSep) || t('et.pending') })}</p>
          <button className="era-record-link" onClick={() => onJumpToYear(e.startYear)}>{t('et.jump', { year: formatYear(e.startYear) })}</button>
        </details>)}
      </div>
      <div className="et-scroll">
        <table>
          <thead>
            <tr>
              <th>{t('et.colPolity')}</th>
              <th>{t('et.colRuler')}</th>
              <th>{t('et.colEra')}</th>
              <th>{t('et.colStart')}</th>
              <th>{t('et.colGanzhi')}</th>
              <th>{t('et.colEnd')}</th>
              <th>{t('et.colYears')}</th>
              <th>{t('et.colChange')}</th>
              <th>{t('et.colNote')}</th>
              <th>{t('et.colSource')}</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && <tr><td colSpan={10} className="table-empty">{t('et.empty')}</td></tr>}
            {rows.map(({ p, e }) => {
              const note = [
                e.disputed ? t('et.noteDisputed', { note: e.note ?? '' }) : S(e.note),
                e.crossReign ? t('et.noteCross') : '',
                S(e.endNote),
                e.precision === 'approx' ? t('et.noteApprox') : '',
              ]
                .filter(Boolean)
                .join(sep);
              return (
                <tr key={e.id}>
                  <td>
                    <span className="chip" style={{ background: p.color }}>
                      <Han text={p.name}/>
                    </span>
                  </td>
                  <td>{e.reignIds.map(id => reignById.get(id)).filter(Boolean).map((r, i) => <span key={r!.id}>{i > 0 ? " → " : ""}{onOpenRuler ? <button type="button" className="reign-link" onClick={() => onOpenRuler(r!.id)}><Han text={reignLabel(r)}/></button> : <Han text={reignLabel(r)}/>}</span>)}</td>
                  <td className="strong"><button className="era-record-link" title={t('et.locate', { year: formatYear(e.startYear) })} onClick={()=>onJumpToYear(e.startYear)}><Han text={eraDisplayName(e.name)}/> ↗</button></td>
                  <td className="mono">{formatYear(e.startYear)}</td>
                  <td className="mono">{ganzhiOf(e.startYear)}</td>
                  <td className="mono">{formatYear(e.endYear)}</td>
                  <td className="mono">{e.endYear - e.startYear + 1}</td>
                  <td>{e.startMonth ? monthLabel(e.startMonth) : '—'}</td>
                  <td className="dim note-cell">{note || '—'}</td>
                  <td className="dim">{sourceShort(e.sources).map(S).join(listSep) || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
