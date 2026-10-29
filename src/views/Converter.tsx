/**
 * 纪年检索：公元年 ⇄ 干支 ⇄ 年号纪年 双向换算。
 */
import { useState } from 'react';
import { parseQuery, type EraMatch } from '../lib/convert';
import { eraByIdWithPolity, sourceShort } from '../lib/queryHelpers';
import { eraDisplayName, eraYearLabel, formatYear, formatYearFull, ganzhiOf } from '../lib/time';
import YearPanel from '../components/YearPanel';

interface Props {
  query?: string;
  onQueryChange?: (q: string) => void;
  onJumpToYear: (y: number) => void;
}

const EXAMPLES = ['1127', '1135', '前221', '靖康二年', '建炎元年', '天会13年', '丁未'];

export default function Converter({ onJumpToYear, query, onQueryChange }: Props) {
  const [localQuery, setLocalQuery] = useState('1127');
  const q = query ?? localQuery;
  const setQ = onQueryChange ?? setLocalQuery;
  const result = parseQuery(q);

  return (
    <div className="converter">
      <div className="card conv-box">
        <div className="conv-input-row">
          <input
            aria-label="纪年查询"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="输入：1127 / 前221 / 靖康二年 / 建炎元年 / 丁未"
          />
          <button className="ghost" onClick={() => setQ('')}>
            清空
          </button>
        </div>
        <div className="chips-row">
          {EXAMPLES.map((e) => (
            <button key={e} className="chip-btn" onClick={() => setQ(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {result.kind === 'none' && <p className="card hint-card dim">{result.hint || '等待输入'}</p>}

      {result.kind === 'year' && (
        <div className="conv-result">
          <button className="jump" onClick={() => onJumpToYear(result.year)}>
            ↦ 在时间轴上查看
          </button>
          <YearPanel year={result.year} />
        </div>
      )}

      {result.kind === 'ganzhi' && (
        <div className="card conv-result">
          <h3>
            {result.ganzhi}年 · 干支检索
          </h3>
          {result.years.length === 0 ? (
            <p className="dim">当前数据覆盖范围内没有匹配年份。</p>
          ) : (
            <p className="gz-years">
              {result.years.map((y) => (
                <button key={y} className="chip-btn" onClick={() => onJumpToYear(y)}>
                  {formatYearFull(y)}
                </button>
              ))}

            </p>
          )}
        </div>
      )}

      {result.kind === 'era' &&
        result.matches.map((m: EraMatch) => <EraCard key={m.eraId} match={m} onJumpToYear={onJumpToYear} />)}
    </div>
  );
}

function EraCard({ match, onJumpToYear }: { match: EraMatch; onJumpToYear: (y: number) => void }) {
  const info = eraByIdWithPolity(match.eraId);
  if (!info) return null;
  const { era, polity, reigns } = info;
  return (
    <div className="conv-result">
      <div className="card era-card">
        <h3>
          <span className="ghost-chip" style={{ color: polity.color }}>
            {polity.name}
          </span>
          {polity.id === era.polityId ? '' : ''}
          {eraDisplayName(era.name)}
          {match.yearNo ? eraYearLabel(match.yearNo) : `（${formatYear(era.startYear)}—${formatYear(era.endYear)}）`}
        </h3>
        <table className="kv">
          <tbody>
            <tr>
              <td>君主</td>
              <td>{reigns.map((r) => `${r.title} ${r.name.split('（')[0]}`).join(' → ')}</td>
            </tr>
            <tr>
              <td>元年</td>
              <td>
                {formatYear(era.startYear)} 年（{ganzhiOf(era.startYear)}）
                {era.startMonth ? ` · ${era.startMonth} 月改元` : ''}
              </td>
            </tr>
            <tr>
              <td>末年</td>
              <td>
                {formatYear(era.endYear)} 年（{ganzhiOf(era.endYear)}）
              </td>
            </tr>
            {era.crossReign && (
              <tr>
                <td>备注</td>
                <td>跨君主沿用：在位区间与年号区间分离</td>
              </tr>
            )}
            {era.disputed && (
              <tr>
                <td>异说</td>
                <td>{era.note}</td>
              </tr>
            )}
            {era.note && !era.disputed && (
              <tr>
                <td>备注</td>
                <td>{era.note}</td>
              </tr>
            )}
            <tr>
              <td>来源</td>
              <td>{sourceShort(era.sources).join('、') || '—'}</td>
            </tr>
          </tbody>
        </table>
        {match.year !== undefined ? (
          <>
            <p className="conv-loc">
              定位 → {formatYearFull(match.year)}（{ganzhiOf(match.year)}）
            </p>
            <button className="jump" onClick={() => onJumpToYear(match.year!)}>
              ↦ 在时间轴上查看
            </button>
          </>
        ) : (
          <button className="jump" onClick={() => onJumpToYear(era.startYear)}>
            ↦ 跳到元年
          </button>
        )}
      </div>
      {match.year !== undefined && <YearPanel year={match.year} />}
    </div>
  );
}
