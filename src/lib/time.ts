/**
 * ChronoChina 时间模型
 * 内部统一使用天文纪年整数：公元 1127 = 1127，公元 前1 = 0，前2 = -1（无公元 0 年）。
 * 干支由算法计算，不落库，保证单一事实来源。
 */
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export function ganzhiOf(year: number): string {
  const s = ((year - 4) % 10 + 10) % 10;
  const b = ((year - 4) % 12 + 12) % 12;
  return STEMS[s] + BRANCHES[b];
}

/** 数据里为区分同名年号加了「（复）」，无年号占位带年份，显示时还原为年号本名 */
export const eraDisplayName = (name: string) => name.replace(/（复）$/, '').replace(/^无年号（\d+）$/, '无年号');

/** 天文纪年 → 展示文本：1127 → "1127"，-220 → "前221" */
export function formatYear(year: number): string {
  return year > 0 ? String(year) : `前${1 - year}`;
}

export function formatYearFull(year: number): string {
  return year > 0 ? `公元 ${year} 年` : `公元前 ${1 - year} 年`;
}

/** 某干支在区间内的所有候选年（60 年一循环） */
export function ganzhiYears(ganzhi: string, from: number, to: number): number[] {
  const s = STEMS.indexOf(ganzhi[0]);
  const b = BRANCHES.indexOf(ganzhi[1]);
  if (s < 0 || b < 0) return [];
  const out: number[] = [];
  for (let y = from; y <= to; y++) {
    if (((y - 4) % 10 + 10) % 10 === s && ((y - 4) % 12 + 12) % 12 === b) out.push(y);
  }
  return out;
}

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const CN_MAP: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 廿: 20, 卅: 30,
};

/** 1–99 的中文数字 */
export function chineseNum(n: number): string {
  if (n <= 0 || n >= 100) return String(n);
  if (n < 10) return CN[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return (t === 1 ? '十' : CN[t] + '十') + (u === 0 ? '' : CN[u]);
}

/** 年号纪年表述：1 → 元年，13 → 十三年 */
export function eraYearLabel(n: number): string {
  return n === 1 ? '元年' : `${chineseNum(n)}年`;
}

/** 解析中文数字（一 ~ 九十九，含 十/廿/卅 组合）；不是中文数字返回 null */
export function parseChineseNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (/^[一二三四五六七八九]$/.test(t)) return CN_MAP[t];
  const m = t.match(/^([一二三四五六七八九]?)十([一二三四五六七八九]?)$/);
  if (m) return (m[1] ? CN_MAP[m[1]] : 1) * 10 + (m[2] ? CN_MAP[m[2]] : 0);
  const m2 = t.match(/^([廿卅])([一二三四五六七八九]?)$/);
  if (m2) return CN_MAP[m2[1]] + (m2[2] ? CN_MAP[m2[2]] : 0);
  return null;
}
