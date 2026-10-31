/**
 * 并列政权的南北次序。
 * 数值取各政权主要都城的近似纬度，仅用于把并世各栏由南向北排列，不代表疆域中心或面积。
 */
export const polityNorthings: Record<string, number> = {
  qin: 34.3, // 咸阳
  zhou: 34.6, // 洛邑
  'jin-guo': 35.6, // 绛、新田
  qi: 36.9, // 临淄
  'chu-guo': 30.4, // 郢
  yan: 39.9, // 蓟
  lu: 35.6, // 曲阜
  'song-guo': 34.4, // 商丘
  'wei-state': 35.7, // 朝歌、濮阳
  zheng: 34.4, // 新郑
  'wu-guo': 31.3, // 姑苏
  yue: 30.0, // 会稽
  zhao: 36.6, // 邯郸
  'wei-ws': 34.8, // 大梁
  'han-ws': 34.4, // 新郑
  'western-han': 34.3, // 长安
  xin: 34.3, // 长安
  gengshi: 34.3, // 宛、长安
  'eastern-han': 34.6, // 洛阳
  wei: 34.6, // 洛阳
  'shu-han': 30.6, // 成都
  wu: 32.0, // 建业
  'western-jin': 34.6, // 洛阳
  'cheng-han': 30.6, // 成都
  'han-zhao': 35.2, // 平阳、长安
  'eastern-jin': 32.0, // 建康
  'qian-liang': 37.9, // 姑臧
  'hou-zhao': 36.8, // 襄国、邺
  'qian-yan': 39.9, // 龙城、蓟、邺
  'qian-qin': 34.3, // 长安
  'hou-yan': 38.5, // 中山
  'hou-qin': 34.3, // 长安
  'xi-qin': 36.0, // 金城
  'northern-wei': 38.0, // 平城、洛阳
  'hou-liang': 37.9, // 姑臧
  'nan-liang': 36.5, // 乐都
  'bei-liang': 38.9, // 张掖
  'nan-yan': 36.7, // 广固
  'xi-liang': 40.1, // 敦煌
  'bei-yan': 41.6, // 龙城
  'ran-wei': 36.3, // 邺
  'xi-yan': 36.1, // 长子
  'zhai-wei': 35.6, // 滑台
  dai: 40.1, // 盛乐
  'helian-xia': 37.6, // 统万
  'liu-song': 32.0, // 建康
  'southern-qi': 32.0, // 建康
  liang: 32.0, // 建康
  'eastern-wei': 36.6, // 邺
  'western-wei': 34.3, // 长安
  'northern-qi': 36.6, // 邺
  chen: 32.0, // 建康
  'northern-zhou': 34.3, // 长安
  sui: 34.5, // 大兴、洛阳
  tang: 34.3, // 长安
  tubo: 29.7, // 逻些
  nanzhao: 25.6, // 太和城、羊苴咩
  huihu: 47.2, // 斡耳朵八里
  bohai: 44.1, // 上京龙泉府
  silla: 35.8, // 金城
  khitan: 43.9, // 潢水、临潢
  'yang-wu': 32.4, // 扬州
  'later-liang': 34.8, // 开封
  liao: 43.9, // 上京临潢府
  'wu-yue': 30.3, // 杭州
  chu: 28.2, // 长沙
  'qian-shu': 30.6, // 成都
  min: 26.1, // 福州
  'nan-han': 23.1, // 广州
  'later-tang': 34.6, // 洛阳
  'jing-nan': 30.3, // 江陵
  'hou-shu': 30.6, // 成都
  'later-jin': 34.8, // 开封
  dali: 25.6, // 大理
  'nan-tang': 32.0, // 江宁
  'later-han': 34.8, // 开封
  'later-zhou': 34.8, // 开封
  'qi-qi': 34.5, // 凤翔
  'jie-yan': 39.9, // 幽州
  qingyuan: 24.9, // 泉州
  guiyi: 40.1, // 敦煌
  'bei-han': 37.9, // 太原
  song: 34.8, // 开封，南渡后临安
  xia: 38.5, // 兴庆
  jin: 39.9, // 中都
  karakhitai: 42.7, // 虎思斡耳朵
  yuan: 39.9, // 大都
  ming: 39.9, // 应天、北京
  qing: 39.9, // 北京
  'southern-ming': 26.0, // 应天、福州、肇庆
};

export const northingOf = (polityId: string) => polityNorthings[polityId] ?? 30;

/** 由南向北：纬度相同按开国年份，再按 id，保证每年次序稳定 */
export const bySouthToNorth = (a: { id: string; startYear: number }, b: { id: string; startYear: number }) =>
  northingOf(a.id) - northingOf(b.id) || a.startYear - b.startYear || a.id.localeCompare(b.id);

export const orderBySouthToNorth = <T extends { id: string; startYear: number }>(list: readonly T[]) =>
  [...list].sort(bySouthToNorth);
