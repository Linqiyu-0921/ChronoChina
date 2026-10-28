export const PERIOD_GROUPS = [
  { name: '秦汉', start: -305, end: 220, ids: ['qin', 'western-han', 'xin', 'gengshi', 'eastern-han'] },
  { name: '三国两晋', start: 220, end: 420, ids: ['wei', 'shu-han', 'wu', 'western-jin', 'eastern-jin'] },
  { name: '南北朝', start: 386, end: 589, ids: ['northern-wei', 'liu-song', 'southern-qi', 'liang', 'chen', 'eastern-wei', 'western-wei', 'northern-qi', 'northern-zhou'] },
  { name: '隋唐五代', start: 581, end: 960, ids: ['sui', 'tang', 'later-liang', 'later-tang', 'later-jin', 'later-han', 'later-zhou'] },
  { name: '宋辽金夏元', start: 907, end: 1368, ids: ['song', 'liao', 'xia', 'jin', 'dali', 'karakhitai', 'yuan'] },
  { name: '明清', start: 1368, end: 1911, ids: ['ming', 'southern-ming', 'qing'] },
];
export const POLITY_ALIASES: Record<string, string[]> = {
  qin: ['qin', '秦朝'], 'western-han': ['xihan'], xin: ['xin', '新朝'], gengshi: ['gengshi'], 'eastern-han': ['donghan'],
  wei: ['wei', '曹魏'], 'shu-han': ['shuhan', '蜀'], wu: ['wu', '东吴'], 'western-jin': ['xijin'], 'eastern-jin': ['dongjin'],
  'northern-wei': ['beiwei'], 'liu-song': ['liusong', '刘宋'], 'southern-qi': ['nanqi', '南齐'], liang: ['liang', '南梁'], chen: ['chen', '南陈'],
  'eastern-wei': ['dongwei'], 'western-wei': ['xiwei'], 'northern-qi': ['beiqi'], 'northern-zhou': ['beizhou'], sui: ['sui'], tang: ['tang'],
  'later-liang': ['houliang'], 'later-tang': ['houtang'], 'later-jin': ['houjin'], 'later-han': ['houhan'], 'later-zhou': ['houzhou'],
  song: ['song', 'zhaosong', '宋', '赵宋'], liao: ['liao'], xia: ['xixia'], jin: ['jin'], dali: ['dali'], karakhitai: ['xiliao'], yuan: ['yuan'], ming: ['ming'], qing: ['qing'], 'southern-ming': ['nanming'],
};
