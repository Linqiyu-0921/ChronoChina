import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = path => JSON.parse(readFileSync(new URL(`../data/${path}`, import.meta.url), 'utf8'));
const eras = read('eras.json');
const coverage = { min: Math.min(...eras.map(e => e.startYear)), max: Math.max(...eras.map(e => e.endYear)) };
function load(path, deps = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/lib/${path}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('exports', 'require', code)(exports, name => { assert.ok(name in deps, `Unexpected dependency ${name}`); return deps[name]; });
  return exports;
}
const time = load('time');
const { parseQuery } = load('convert', { './time': time, './data': { eras, eraCoverage: coverage } });
assert.equal(time.formatYear(0), '前1');
assert.equal(time.formatYear(-220), '前221');
assert.equal(parseQuery('前221').year, -220);
assert.equal(parseQuery('0').kind, 'none');
assert.equal(parseQuery('前0').kind, 'none');
assert.equal(parseQuery('-220').kind, 'none');
assert.deepEqual(parseQuery('天会十三年').matches.map(m => m.year).sort((a, b) => a - b), [969, 1135]);
assert.equal(parseQuery('靖康九十九年').kind, 'none');
assert.ok(parseQuery('天祐').matches.length >= 2);
assert.equal(time.eraDisplayName('建兴（复）'), '建兴');
assert.equal(time.eraDisplayName('无年号（932）'), '无年号');
assert.equal(time.eraYearDisplay('无年号', 8, 23), '');
assert.equal(time.eraYearDisplay('无年号', 1, 14), '十四年');
assert.ok(parseQuery('建兴二年').matches.length >= 2, '去重后缀的年号应能按本名检索');
assert.equal(parseQuery('无年号').kind, 'none');
const { RARE_PINYIN } = load('pinyin');
assert.equal(RARE_PINYIN['郢'], 'yǐng');
assert.equal(RARE_PINYIN['亹'], 'wěi');
assert.equal(RARE_PINYIN['嬴'], 'yíng');
assert.equal(RARE_PINYIN['諲'], 'yīn');
assert.equal(RARE_PINYIN['馺'], 'sà');
assert.equal(RARE_PINYIN['啜'], 'chuò');
assert.ok(parseQuery('丁未').years.length > 12);
const events = read('events.json');
assert.ok(events.every(e => /^[A-Za-z0-9_-]+$/.test(e.id)), '事件 id 必须可用于 URL 锚点');
const citation = load('citation', { './time': time });
assert.equal(citation.eventPath({ id: 'p-p-liuzongyuan-death', year: 819 }), '/?year=819&event=p-p-liuzongyuan-death');
const cite = citation.eventCitation(
  { id: 'p-p-liuzongyuan-death', year: 819, title: '柳宗元去世', categories: ['人物'], polityIds: ['tang'], summary: '', sources: ['S4'] },
  read('sources.json'),
  'https://cinian.laneqiyu.cn',
);
assert.ok(cite.includes('“柳宗元去世”'));
assert.ok(cite.includes('公元 819 年'));
assert.ok(cite.includes('https://cinian.laneqiyu.cn/?year=819&event=p-p-liuzongyuan-death'));
assert.ok(cite.includes('编者综合整理'));
assert.ok(!events.some(e => ['w-1127-02', 'w-1127-03'].includes(e.id)));
assert.ok(events.some(e => e.id === 'ev-1127-01'));
assert.ok(events.some(e => e.id === 'ev-1127-03'));
assert.ok(eras.every(e => e.sources?.length));
assert.ok(events.every(e => e.sources?.length));
console.log('通过：日期边界、无零年、纪年越界、同名年号、干支候选、事件合并、来源必填。');

const reignsFor = id => read('reigns.json').filter(r => r.polityId === id);
const erasFor = id => read('eras.json').filter(e => e.polityId === id);
const navigation = load('navigation');
const searchData = { eras, eraCoverage: coverage, polities: read('polities.json'), reigns: read('reigns.json'), persons: read('persons.json'), events, sites: read('sites.json') };
const { searchHistory } = load('search', { './data': searchData, './convert': { parseQuery }, './time': time, './navigation': navigation });
assert.equal(searchHistory('donghan')[0].polityId, 'eastern-han');
assert.equal(searchHistory('建炎元年')[0].year, 1127);
assert.equal(searchHistory('前214')[0].year, -213);
assert.ok(searchHistory('秦始皇').some(h => h.title.includes('嬴政')));
assert.ok(searchHistory('嬴政').some(h => h.polityId === 'qin'));
assert.ok(searchHistory('北迁').some(h => h.category === '事件'));
assert.equal(searchHistory('冉魏')[0].polityId, 'ran-wei');
assert.equal(searchHistory('西燕')[0].polityId, 'xi-yan');
assert.ok(searchHistory('敦煌').some(h => h.polityId === 'guiyi'));
assert.ok(reignsFor('dai').length === 9 && erasFor('dai').length === 2);
assert.equal(searchHistory('吐蕃')[0].polityId, 'tubo');
assert.equal(searchHistory('南诏')[0].polityId, 'nanzhao');
assert.equal(searchHistory('回鹘')[0].polityId, 'huihu');
assert.equal(searchHistory('渤海')[0].polityId, 'bohai');
assert.equal(searchHistory('新罗')[0].polityId, 'silla');
assert.equal(searchHistory('契丹')[0].polityId, 'khitan');
assert.ok(reignsFor('tubo').length === 9 && erasFor('tubo').length === 1);
assert.ok(reignsFor('silla').length === 28 && erasFor('silla').length === 1);
assert.equal(searchHistory('0').length, 0);
assert.equal(searchHistory('2026').length, 0);
assert.equal(searchHistory('靖康九十九年').length, 0);
assert.equal(searchHistory('无年号').length, 0);
const geography = load('geography');
const polityList = read('polities.json');
assert.deepEqual(polityList.filter(p => !(p.id in geography.polityNorthings)).map(p => p.id), [], '每个政权都要有南北次序');
const lanesAt = year => geography.orderBySouthToNorth(polityList.filter(p => p.startYear <= year && p.endYear >= year)).map(p => p.id);
assert.deepEqual(lanesAt(819), ['nanzhao', 'tubo', 'tang', 'silla', 'khitan', 'bohai', 'huihu']);
assert.deepEqual(lanesAt(934), ['nan-han', 'min', 'chu', 'wu-yue', 'jing-nan', 'hou-shu', 'yang-wu', 'later-tang', 'silla', 'guiyi', 'liao']);
assert.deepEqual(lanesAt(1160), ['dali', 'song', 'xia', 'jin', 'karakhitai']);
console.log('通过：并世各栏按都城由南向北排列。');
assert.ok(searchHistory('建兴').every(h => h.title === '建兴' || h.category !== '年号'));
console.log('通过：搜索纪年直达、姓名别名、政权拼音、事件片段与越界年份。');
const { resizePanel, fitPanel } = load('panelGeometry');
const panel = { x: 40, y: 80, width: 300, height: 400 };
for (const edge of ['n','s','e','w','ne','nw','se','sw']) {
  for (const delta of [-1000, 1000]) {
    const r = resizePanel(panel, edge, delta, delta, 390, 844);
    assert.ok(r.x >= 12 && r.y >= 12 && r.x + r.width <= 378 && r.y + r.height <= 832);
    assert.ok(r.width >= 280 && r.height >= 220);
  }
}
assert.deepEqual(resizePanel(panel, 'w', -20, 0, 390, 844), { x: 20, y: 80, width: 320, height: 400 });
const fitted = fitPanel({ x: 700, y: 600, width: 500, height: 700 }, 320, 480);
assert.ok(fitted.x + fitted.width <= 308 && fitted.y + fitted.height <= 468);
console.log('通过：档案四边四角缩放、最小尺寸、视口收窄约束。');
