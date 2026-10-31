/**
 * add-neighbor-events.mjs — 为周边政权补挂与新增关键纪事。
 *
 * 1. 把已有唐蕃、唐诏、唐回鹘、唐渤海、唐新罗、唐契丹纪事补挂到新政权。
 * 2. 新增开国、统一、覆亡等节点事件；同时写入 curated，避免下次重导丢失。
 *
 * 用法：node scripts/add-neighbor-events.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => JSON.parse(readFileSync(join(ROOT, `data/${name}`), 'utf8'));
const write = (name, value) => writeFileSync(join(ROOT, `data/${name}`), JSON.stringify(value, null, 1) + '\n');

const PATCH = {
  'x-634-01': ['tubo'],
  'x-638-01': ['tubo'],
  'w-641-01': ['tubo'],
  'tz-650-01': ['tubo'],
  'tz-667-02': ['tubo'],
  'w-710-01': ['tubo'],
  'x-763-01': ['tubo'],
  'x-823-01': ['tubo'],
  'tz-842-01': ['tubo'],

  'x-750-01': ['nanzhao'],
  'tz-752-01': ['nanzhao', 'tubo'],
  'x-794-01': ['nanzhao'],
  'tz-795-02': ['nanzhao', 'tubo'],
  'tz-823-01': ['nanzhao'],

  'x-744-01': ['huihu'],
  'x-765-01': ['huihu'],
  'x-788-01': ['huihu'],
  'tz-789-02': ['huihu'],
  'tz-795-01': ['huihu'],
  'tz-814-01': ['huihu'],
  'x-840-01': ['huihu'],

  'at-698-01': ['bohai'],
  'x-699-01': ['bohai'],
  'x-713-01': ['bohai'],
  'tz-809-01': ['bohai'],
  'tz-818-02': ['bohai'],
  'x-926-02': ['bohai'],

  'tz-654-02': ['silla'],
  'w-670-01': ['silla'],
  'tz-674-01': ['silla'],
  'w-677-01': ['silla'],
  'tz-693-01': ['silla'],

  'x-696-01': ['khitan'],
  'tz-718-02': ['khitan'],
  'tz-734-02': ['khitan'],
  'x-736-01': ['khitan'],
};

const ADD = [
  {
    id: 'ev-629-01', year: 629, title: '松赞干布即位，统一青藏高原诸部', categories: ['政治'],
    polityIds: ['tubo'], sources: ['S15', 'S4'],
    summary: '松赞干布继为吐蕃赞普，定都逻些，创制文字，逐步统一青藏高原诸部。',
  },
  {
    id: 'ev-648-01', year: 648, title: '契丹内属，唐置松漠都督府', categories: ['政治', '外交'],
    polityIds: ['khitan', 'tang'], sources: ['S17', 'S6'],
    summary: '契丹大贺氏首领窟哥率部内属，唐置松漠都督府，赐姓李。',
  },
  {
    id: 'ev-676-01', year: 676, title: '新罗统一三国', categories: ['军事', '政治'],
    polityIds: ['silla', 'tang'], sources: ['S16', 'S6'],
    summary: '新罗文武王金法敏借唐军灭百济、高句丽之势，676 年统一朝鲜半岛中南部。',
  },
  {
    id: 'ev-738-01', year: 738, title: '皮逻阁统一六诏，受唐封云南王', categories: ['政治'],
    polityIds: ['nanzhao', 'tang'], sources: ['S15', 'S6'],
    summary: '蒙舍诏皮逻阁兼并五诏，统一洱海地区，唐册封为云南王。',
  },
  {
    id: 'ev-902-01', year: 902, title: '郑买嗣灭南诏，建大长和国', categories: ['政治'],
    polityIds: ['nanzhao'], sources: ['S15', 'S4'],
    summary: '南诏权臣郑买嗣废舜化贞，杀南诏王族，建大长和国，南诏亡。',
  },
  {
    id: 'ev-935-01', year: 935, title: '敬顺王降高丽，新罗亡', categories: ['政治'],
    polityIds: ['silla'], sources: ['S16', 'S4'],
    summary: '新罗敬顺王金傅降高丽，新罗亡；高丽统一朝鲜半岛。',
  },
];

const events = read('events.json');
let patched = 0;
for (const ev of events) {
  const add = PATCH[ev.id];
  if (!add) continue;
  const before = ev.polityIds.length;
  for (const id of add) if (!ev.polityIds.includes(id)) ev.polityIds.push(id);
  if (ev.polityIds.length !== before) patched++;
}

const existing = new Set(events.map((e) => e.id));
const added = [];
for (const ev of ADD) {
  if (existing.has(ev.id)) continue;
  const record = { id: ev.id, year: ev.year, ...(ev.month ? { month: ev.month } : {}), title: ev.title, categories: ev.categories, polityIds: ev.polityIds, summary: ev.summary, sources: ev.sources };
  events.push(record);
  added.push(record);
}

events.sort((a, b) => a.year - b.year || (a.month ?? 13) - (b.month ?? 13));
write('events.json', events);

const curated = read('curated/events.json');
const curatedIds = new Set(curated.map((e) => e.id));
for (const ev of added) if (!curatedIds.has(ev.id)) curated.push(ev);
curated.sort((a, b) => a.year - b.year || (a.month ?? 13) - (b.month ?? 13));
write('curated/events.json', curated);

console.log(`补挂政权 ${patched} 条，新增纪事 ${added.length} 条；事件总数 ${events.length}，curated ${curated.length}`);
