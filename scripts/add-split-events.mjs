/**
 * add-split-events.mjs — 为十六国旁支与十国之外的割据政权补几条关键纪事。
 *
 * 1. 把已有纪事补挂到新政权（冉闵、西燕、翟魏、桀燕、归义军等）。
 * 2. 新增开国、覆亡等节点事件；同时写入 curated，避免下次重导丢失。
 *
 * 用法：node scripts/add-split-events.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => JSON.parse(readFileSync(join(ROOT, `data/${name}`), 'utf8'));
const write = (name, value) => writeFileSync(join(ROOT, `data/${name}`), JSON.stringify(value, null, 1) + '\n');

const PATCH = {
  'w-350-02': ['ran-wei'],
  'w-352-01': ['ran-wei'],
  'w-384-02': ['xi-yan'],
  'w-386-03': ['xi-yan'],
  'tz-388-02': ['zhai-wei'],
  'w-394-01': ['xi-yan'],
  'x-911-01': ['jie-yan'],
  'at-848-01': ['guiyi'],
};

const ADD = [
  {
    id: 'ev-315-01', year: 315, title: '拓跋猗卢受晋封代王', categories: ['政治', '外交'],
    polityIds: ['dai', 'western-jin'], sources: ['S13', 'S6'],
    summary: '西晋愍帝封拓跋猗卢为代王，拓跋部以代国立于盛乐，总摄三部。',
  },
  {
    id: 'ev-376-01', year: 376, title: '前秦灭代，什翼犍败死', categories: ['军事'],
    polityIds: ['dai', 'qian-qin'], sources: ['S13', 'S6'],
    summary: '苻坚遣军攻代，拓跋什翼犍败走云中，为其子所杀，代国亡。',
  },
  {
    id: 'ev-392-01', year: 392, title: '后燕破滑台，翟魏亡', categories: ['军事'],
    polityIds: ['zhai-wei', 'hou-yan'], sources: ['S12', 'S6'],
    summary: '慕容垂遣慕容镇等攻滑台，翟钊败走，翟魏亡。',
  },
  {
    id: 'ev-887-01', year: 887, title: '李茂贞据凤翔', categories: ['政治', '军事'],
    polityIds: ['qi-qi', 'tang'], sources: ['S14', 'S6'],
    summary: '李茂贞出任凤翔节度使，逐步割据关中西部，唐末封岐王。',
  },
  {
    id: 'ev-913-01', year: 913, title: '晋军破幽州，桀燕亡', categories: ['军事'],
    polityIds: ['jie-yan'], sources: ['S14', 'S6'],
    summary: '晋王李存勖遣周德威攻幽州，刘守光被俘，桀燕亡。',
  },
  {
    id: 'ev-923-01', year: 923, title: '李茂贞向后唐称臣，岐亡', categories: ['政治'],
    polityIds: ['qi-qi', 'later-tang'], sources: ['S14', 'S6'],
    summary: '后唐灭后梁后，李茂贞上表称臣，岐国结束；次年李茂贞卒。',
  },
  {
    id: 'ev-949-01', year: 949, title: '留从效据泉漳，受南唐封', categories: ['政治'],
    polityIds: ['qingyuan', 'nan-tang'], sources: ['S14', 'S6'],
    summary: '留从效据泉州、漳州，南唐授清源军节度使、封晋江王，泉漳自此自成一隅。',
  },
  {
    id: 'ev-978-01', year: 978, title: '陈洪进纳土归宋，清源军亡', categories: ['政治'],
    polityIds: ['qingyuan', 'song'], sources: ['S14', 'S6'],
    summary: '陈洪进献泉、漳二州图籍于宋，清源军（平海军）结束。',
  },
  {
    id: 'ev-1036-01', year: 1036, title: '西夏攻陷沙州，归义军亡', categories: ['军事'],
    polityIds: ['guiyi', 'xia'], sources: ['S15', 'S4'],
    summary: '西夏攻取沙州，曹氏归义军终结；敦煌此后处于西夏统治之下。',
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
