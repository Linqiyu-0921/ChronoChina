/**
 * 纪年双向换算引擎
 * 输入形态：公元年（1127 / 前221）、干支（丁未）、年号纪年（靖康二年 / 建炎元年 / 天会13年）。
 */
import { eras, eraCoverage } from './data';
import { eraDisplayName, ganzhiYears, parseChineseNum, STEMS, BRANCHES } from './time';

export interface EraMatch {
  eraId: string;
  /** 给了年次则可定位到具体公元年 */
  yearNo?: number;
  year?: number;
}

export type Query =
  | { kind: 'year'; year: number }
  | { kind: 'ganzhi'; ganzhi: string; years: number[] }
  | { kind: 'era'; matches: EraMatch[] }
  | { kind: 'none'; hint: string };

const eraNames = [...new Set(eras.filter((e) => !e.name.includes('无年号')).map((e) => eraDisplayName(e.name)))].sort((a, b) => b.length - a.length);

export function parseQuery(raw: string): Query {
  const q = raw.trim().replace(/\s+/g, '').replace(/［［］〕（）]/g, '');
  if (!q) return { kind: 'none', hint: '输入年份、年号或干支' };
  if (q.includes('无年号')) return { kind: 'none', hint: '「无年号」表示该时段未建年号，可直接输入年份查询。' };

  // 1. 公元年：1127 / 1127年 / 前221 / 公元前221 / -220（天文纪年）
  let m = q.match(/^(?:公元)?(\d{1,4})年?$/);
  if (m) return Number(m[1]) === 0 ? { kind: 'none', hint: '历史纪年没有公元 0 年，请输入前1或公元1年。' } : { kind: 'year', year: Number(m[1]) };
  m = q.match(/^(?:前|公元前)(\d{1,4})年?$/);
  if (m) return Number(m[1]) === 0 ? { kind: 'none', hint: '没有公元前 0 年。' } : { kind: 'year', year: 1 - Number(m[1]) };
  m = q.match(/^[-−](\d{1,4})$/);
  if (m) return { kind: 'none', hint: '请使用历史纪年，例如前221，不使用负数。' };

  // 2. 干支：丁未 / 丁未年
  m = q.match(new RegExp(`^([${STEMS.join('')}])[${BRANCHES.join('')}]年?$`));
  if (m) {
    const gz = q.slice(0, 2);
    const years = ganzhiYears(gz, eraCoverage.min, eraCoverage.max);
    return years.length
      ? { kind: 'ganzhi', ganzhi: gz, years }
      : { kind: 'ganzhi', ganzhi: gz, years: [] };
  }

  // 3. 年号（+可选年次）：靖康二年 / 建炎元年 / 天会13年 / 绍兴
  for (const name of eraNames) {
    if (!q.startsWith(name)) continue;
    let rest = q.slice(name.length).replace(/年$/, '');
    let yearNo: number | undefined;
    if (rest === '元' || rest === '') {
      yearNo = rest === '元' ? 1 : undefined;
    } else {
      const n = /^\d{1,2}$/.test(rest) ? Number(rest) : parseChineseNum(rest);
      if (n === null || n < 1 || n > 99) return { kind: 'none', hint: `年次无法识别：${rest}` };
      yearNo = n;
    }
    const matches = eras
      .filter((e) => eraDisplayName(e.name) === name)
      .filter(e => yearNo === undefined || e.startYear + yearNo - 1 <= e.endYear)
      .map((e) => ({
        eraId: e.id,
        yearNo,
        year: yearNo !== undefined ? e.startYear + yearNo - 1 : undefined,
      }));
    return matches.length ? { kind: 'era', matches } : { kind: 'none', hint: '该年次超出已收录的纪年范围。' };
  }

  return {
    kind: 'none',
    hint: '试一试：1127、前221、靖康二年、建炎元年、天会13年、丁未',
  };
}
