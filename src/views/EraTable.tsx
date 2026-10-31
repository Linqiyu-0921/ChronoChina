/**
 * 传统学术纪元表视图：按政权筛选、排序展示，支持 CSV 导出。
 */
import { useState } from 'react';
import { erasByPolity, polities, reignById, sourceShort, type EraUse } from '../lib/data';
import { chineseNum, eraDisplayName, formatYear, ganzhiOf, reignLabel } from '../lib/time';
import Han from '../components/Han';

export default function EraTable({onJumpToYear,onOpenRuler}:{onJumpToYear:(year:number)=>void;onOpenRuler?:(reignId:string)=>void}) {
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const shown = polities.filter((p) => filter === 'all' || p.id === filter);

  const rows: { p: (typeof polities)[number]; e: EraUse }[] = [];
  for (const p of shown) {
    for (const e of erasByPolity.get(p.id) ?? []) if (`${p.name} ${e.name} ${e.reignIds.map(id => { const r = reignById.get(id); return r ? r.title + r.name : ''; }).join(' ')}`.includes(query.trim())) rows.push({ p, e });
  }

  const exportCsv = () => {
    const head = ['政权', '君主', '年号', '起年(前=公元前)', '元年干支', '末年(前=公元前)', '涉及年份数', '改元月份', '异说/备注', '来源'];
    const lines = rows.map(({ p, e }) => {
      const rulers = e.reignIds
        .map((id) => reignById.get(id))
        .filter(Boolean)
        .map((r) => reignLabel(r!))
        .join(' → ');
      const note = [e.disputed ? '[异说] ' + (e.note ?? '') : e.note, e.endNote].filter(Boolean).join('；');
      return [
        p.name,
        rulers,
        eraDisplayName(e.name),
        formatYear(e.startYear),
        ganzhiOf(e.startYear),
        formatYear(e.endYear),
        String(e.endYear - e.startYear + 1),
        e.startMonth ? chineseNum(e.startMonth) + '月' : '',
        note,
        sourceShort(e.sources).join('、'),
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
        <input aria-label="筛选纪年资料" placeholder="年号 / 君主 / 政权" value={query} onChange={e => setQuery(e.target.value)} />
        <select aria-label="选择政权" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">全部政权</option>
          {polities.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="dim">{rows.length} 条纪年记录</span>
        <button className="ghost" onClick={exportCsv}>
          导出 CSV
        </button>
      </div>
      <div className="et-scroll">
        <table>
          <thead>
            <tr>
              <th>政权</th>
              <th>君主</th>
              <th>纪年名称</th>
              <th>起年（前＝公元前）</th>
              <th>元年干支</th>
              <th>末年</th>
              <th>涉及年份数</th>
              <th>改元</th>
              <th>备注 / 异说</th>
              <th>来源</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && <tr><td colSpan={10} className="table-empty">没有匹配的纪年，试试更换关键词或政权。</td></tr>}
            {rows.map(({ p, e }) => {
              const note = [
                e.disputed ? `[异说] ${e.note ?? ''}` : e.note,
                e.crossReign ? '跨君主沿用' : '',
                e.endNote,
                e.precision === 'approx' ? '年份系约数' : '',
              ]
                .filter(Boolean)
                .join('；');
              return (
                <tr key={e.id}>
                  <td>
                    <span className="chip" style={{ background: p.color }}>
                      <Han text={p.name}/>
                    </span>
                  </td>
                  <td>{e.reignIds.map(id => reignById.get(id)).filter(Boolean).map((r, i) => <span key={r!.id}>{i > 0 ? " → " : ""}{onOpenRuler ? <button type="button" className="reign-link" onClick={() => onOpenRuler(r!.id)}><Han text={reignLabel(r)}/></button> : <Han text={reignLabel(r)}/>}</span>)}</td>
                  <td className="strong"><button className="era-record-link" title={`定位至${formatYear(e.startYear)}年`} onClick={()=>onJumpToYear(e.startYear)}><Han text={eraDisplayName(e.name)}/> ↗</button></td>
                  <td className="mono">{formatYear(e.startYear)}</td>
                  <td className="mono">{ganzhiOf(e.startYear)}</td>
                  <td className="mono">{formatYear(e.endYear)}</td>
                  <td className="mono">{e.endYear - e.startYear + 1}</td>
                  <td>{e.startMonth ? `${chineseNum(e.startMonth)}月` : '—'}</td>
                  <td className="dim note-cell">{note || '—'}</td>
                  <td className="dim">{sourceShort(e.sources).join('、') || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
