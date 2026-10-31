export const PERIOD_GROUPS = [
  { name: '春秋战国', start: -769, end: -220, ids: ['zhou', 'jin-guo', 'qi', 'chu-guo', 'yan', 'lu', 'song-guo', 'wei-state', 'zheng', 'wu-guo', 'yue', 'zhao', 'wei-ws', 'han-ws'] },
  { name: '秦汉', start: -305, end: 220, ids: ['qin', 'western-han', 'xin', 'gengshi', 'eastern-han'] },
  { name: '三国两晋', start: 220, end: 420, ids: ['wei', 'shu-han', 'wu', 'western-jin', 'eastern-jin'] },
  { name: '十六国', start: 303, end: 439, ids: ['cheng-han', 'han-zhao', 'qian-liang', 'hou-zhao', 'qian-yan', 'qian-qin', 'hou-qin', 'hou-yan', 'xi-qin', 'hou-liang', 'bei-liang', 'nan-liang', 'nan-yan', 'xi-liang', 'bei-yan', 'helian-xia', 'ran-wei', 'xi-yan', 'zhai-wei', 'dai', 'northern-wei'] },
  { name: '南北朝', start: 386, end: 589, ids: ['northern-wei', 'liu-song', 'southern-qi', 'liang', 'chen', 'eastern-wei', 'western-wei', 'northern-qi', 'northern-zhou'] },
  { name: '隋唐五代', start: 581, end: 960, ids: ['sui', 'tang', 'later-liang', 'later-tang', 'later-jin', 'later-han', 'later-zhou'] },
  { name: '周边政权', start: 629, end: 935, ids: ['tubo', 'nanzhao', 'huihu', 'bohai', 'silla', 'khitan'] },
  { name: '十国', start: 902, end: 979, ids: ['yang-wu', 'chu', 'wu-yue', 'min', 'nan-han', 'qian-shu', 'jing-nan', 'hou-shu', 'nan-tang', 'bei-han', 'qi-qi', 'jie-yan', 'qingyuan', 'guiyi'] },
  { name: '宋辽金夏元', start: 907, end: 1368, ids: ['song', 'liao', 'xia', 'jin', 'dali', 'karakhitai', 'yuan'] },
  { name: '明清', start: 1368, end: 1911, ids: ['ming', 'southern-ming', 'qing'] },
];
export const POLITY_ALIASES: Record<string, string[]> = {
  zhou: ['zhou', '东周'], 'jin-guo': ['jinguo', '晋国'], qi: ['qiguo', '齐国'], 'chu-guo': ['chuguo', '楚国'], yan: ['yanguo', '燕国'], lu: ['luguo', '鲁国'], 'song-guo': ['songguo', '宋国'], 'wei-state': ['weiguo', '卫国'], zheng: ['zhengguo', '郑国'], 'wu-guo': ['wuguo', '吴国'], yue: ['yueguo', '越国'], zhao: ['zhaoguo', '赵国'], 'wei-ws': ['weiguo', '魏国'], 'han-ws': ['hanguo', '韩国'],
  qin: ['qin', '秦朝'], 'western-han': ['xihan'], xin: ['xin', '新朝'], gengshi: ['gengshi'], 'eastern-han': ['donghan'],
  wei: ['wei', '曹魏'], 'shu-han': ['shuhan', '蜀'], wu: ['wu', '东吴'], 'western-jin': ['xijin'], 'eastern-jin': ['dongjin'],
  'northern-wei': ['beiwei'], 'liu-song': ['liusong', '刘宋'], 'southern-qi': ['nanqi', '南齐'], liang: ['liang', '南梁'], chen: ['chen', '南陈'],
  'eastern-wei': ['dongwei'], 'western-wei': ['xiwei'], 'northern-qi': ['beiqi'], 'northern-zhou': ['beizhou'], sui: ['sui'], tang: ['tang'],
  'later-liang': ['houliang'], 'later-tang': ['houtang'], 'later-jin': ['houjin'], 'later-han': ['houhan'], 'later-zhou': ['houzhou'],
  'ran-wei': ['ranwei', '冉魏'], 'xi-yan': ['xiyan', '西燕'], 'zhai-wei': ['zhaiwei', '翟魏'], dai: ['dai', '代国', '拓跋代'], 'qi-qi': ['qiqi', '岐国', '凤翔', '李茂贞'], 'jie-yan': ['jieyan', '桀燕', '刘守光'], qingyuan: ['qingyuan', '清源军', '平海军', '泉漳'], guiyi: ['guiyi', '归义军', '敦煌'],
  tubo: ['tubo', '吐蕃', '吐蕃国'], nanzhao: ['nanzhao', '南诏', '蒙舍诏'], huihu: ['huihu', '回鹘', '回纥'], bohai: ['bohai', '渤海', '渤海国', '震国'], silla: ['silla', '新罗'], khitan: ['khitan', '契丹', '契丹国'],
  song: ['song', 'zhaosong', '宋', '赵宋'], liao: ['liao'], xia: ['xixia'], jin: ['jin'], dali: ['dali'], karakhitai: ['xiliao'], yuan: ['yuan'], ming: ['ming'], qing: ['qing'], 'southern-ming': ['nanming'],
};
