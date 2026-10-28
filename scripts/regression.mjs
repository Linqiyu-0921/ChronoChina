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
assert.equal(parseQuery('天会十三年').matches[0].year, 1135);
assert.equal(parseQuery('靖康九十九年').kind, 'none');
assert.ok(parseQuery('天祐').matches.length >= 2);
assert.ok(parseQuery('丁未').years.length > 12);
const events = read('events.json');
assert.ok(!events.some(e => ['w-1127-02', 'w-1127-03'].includes(e.id)));
assert.ok(events.some(e => e.id === 'ev-1127-01'));
assert.ok(events.some(e => e.id === 'ev-1127-03'));
assert.ok(eras.every(e => e.sources?.length));
assert.ok(events.every(e => e.sources?.length));
console.log('通过：日期边界、无零年、纪年越界、同名年号、干支候选、事件合并、来源必填。');

const navigation = load('navigation');
const searchData = { eras, eraCoverage: coverage, polities: read('polities.json'), reigns: read('reigns.json'), persons: read('persons.json'), events, sites: read('sites.json') };
const { searchHistory } = load('search', { './data': searchData, './convert': { parseQuery }, './time': time, './navigation': navigation });
assert.equal(searchHistory('donghan')[0].polityId, 'eastern-han');
assert.equal(searchHistory('建炎元年')[0].year, 1127);
assert.equal(searchHistory('前214')[0].year, -213);
assert.ok(searchHistory('秦始皇').some(h => h.title.includes('嬴政')));
assert.ok(searchHistory('嬴政').some(h => h.polityId === 'qin'));
assert.ok(searchHistory('北迁').some(h => h.category === '事件'));
assert.equal(searchHistory('0').length, 0);
assert.equal(searchHistory('2026').length, 0);
assert.equal(searchHistory('靖康九十九年').length, 0);
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
