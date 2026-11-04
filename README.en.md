English · [简体中文](README.md)

<p><img src="public/favicon-art.png" width="64" alt="此年 ChronoChina logo" align="left"></p>

# ChronoChina · 此年

**此年，山河同阅。** — *One year, many realms; read them side by side.*

![ChronoChina cover: a timeline laid over an ink-wash landscape, from Xia to the Republic](docs/assets/cover.jpg)

## Why I built this

Reading history books, historical fiction, or the standard histories, these questions come up again and again:

- *Which year is the twelfth year of Shaoxing?* — first recall the first year of Shaoxing, then count twelve years forward yourself.
- *Which year is dingwei?* — the sexagenary cycle repeats every sixty years, so two characters alone never tell you which dynasty you are in.
- *Who was actually using the Qianzhen era in its first year?* — after flipping through several dynastic volumes, it turns out to be Yang Pu of Wu.

None of these asks "what happened". They ask "in this one year, who existed, and what did each of them call it". Histories are written volume by volume, so readers have to stack the same year from different volumes back into one line inside their heads.

I mostly work with spatial data, so my first instinct is to put everything into one coordinate system: an origin, a scale, and only then does a position mean anything. Time deserves the same ruler. So this site gives you the year first, then lays the coexisting regimes, era names, and events side by side — searchable, checkable, and traceable to sources.

It deliberately is not a map, and not a decorative scroll. "此年，山河同阅" is both the framing and the constraint: give the simultaneity back to history, and leave the judgement to you. Line the ruler up, settle the rules, and reading history stops giving you heartburn.

## Live site and deployment

| Address | What it is |
|---|---|
| **<https://www.laneqiyu.cn/Cinian-ChronoChina/>** | The main address. Served from the `/Cinian-ChronoChina/` subpath of the `laneqiyu.cn` site (`laneqiyu.cn` redirects to `www`) |
| **<https://chronochina.pages.dev>** | Mirror address, the default domain of the Cloudflare Pages project `chronochina` |

Both addresses currently serve the same build. The build is fully static and `vite.config.ts` uses `base: './'`, so it runs both at a domain root and from any subpath.

> The old custom domain `cinian.laneqiyu.cn` is currently offline: it has no DNS record and is not attached to the Cloudflare Pages project `chronochina`. To restore it, add a CNAME for `cinian` pointing at `chronochina.pages.dev` in Cloudflare DNS, then bind the domain again in Pages.

Publishing a new mirror build:

```bash
npm run build
npx wrangler pages deploy dist --project-name chronochina
```

The subpath deployment picks up the same `dist` build through the `laneqiyu.cn` site.

## How to use it

The three questions above, one search each:

| Question | Do this | You get |
|---|---|---|
| Which year is the twelfth year of Shaoxing? | `Ctrl / ⌘ + K`, type `绍兴十二年` | 1142: Song, Shaoxing 12 — alongside Jin Huangtong 2, Western Xia Daqing 3, Qara Khitai Kangguo 9, Dali Guangyun |
| Which year is dingwei? | Type `丁未` | Every dingwei year in range (1127, 1067, 1007 …), repeating every sixty years; pick one to enter |
| Who used Qianzhen in its first year? | Type `乾贞` | 927: Wu, Yang Pu, Qianzhen 1 — alongside Later Tang Tiancheng 2, Wuyue Baozheng, Southern Han Bailong 3, Liao Tianxian |

Land on a year and you are in Reading (阅年): scroll up and down to change the year, read the coexisting regimes across; open any regime to see its era name, ruler, span, and month of change, and flip out the annual dossier at the bottom for that year's events, contemporary eras, and people alive. For a multi-year comparison, switch to Timeline (并世); to follow just two or three regimes, open Regime comparison there — the selection is kept across years.

The address bar carries the state, so a view can be shared directly: `?year=1142`, `?view=timeline`, `?lang=zh-Hant`, `?event=<event id>`.

## Screenshots

**Reading (阅年), dark**: one year per page, laid out like an almanac. The year leads and the ganzhi follows; contemporary regimes are numbered south to north by the latitude of their capital, and a one-line epigraph states the year's shape.

![Reading view (dark)](docs/preview/01-reading-dark.png)

**Reading (阅年), light**: the same page on paper white — vermilion and gold only on the year, the seals, and the rules.

![Reading view (light)](docs/preview/02-reading-light.png)

**Timeline (并世), dark**: a vertical time canvas. Gregorian years on the left, a vermilion line at the current year, and one exhibition label per surviving regime, with era names drawn as duration bars at their true start and end.

![Timeline view (dark)](docs/preview/03-timeline-dark.png)

**Timeline (并世), light**: the same ruler, a different paper.

![Timeline view (light)](docs/preview/04-timeline-light.png)

**Search, browse**: with an empty box it is a table of contents — six periods and their regimes.

![Search (browse)](docs/preview/05-search-browse-dark.png)

**Search, query**: type an era name, year, ganzhi, person, or pinyin, press Enter, and land on that year.

![Search (results)](docs/preview/06-search-result-dark.png)

## Features

- **Reading (阅年)** — one year per page: the year, its ganzhi, and how many regimes stood at once; the epigraph is generated from that year's era changes; regimes are ordered south to north by the latitude of their capital, with no "orthodox" side assumed; expand one to see its era name, ruler, span, and month of change; turn pages with the wheel / `↑ ↓` / swipe.
- **Timeline (并世)** — vertical multi-year comparison: Gregorian years on the left, a vermilion line at the current year; each surviving regime gets a column with an exhibition label, ordered south to north, era names are drawn as duration bars at their true extent; `Ctrl / ⌘ + wheel` changes time density, `‹ ›` pages through regime groups.
- **Regime comparison** — pick 2–4 regimes in Timeline and keep the selection across years; the comparison lays their eras, rulers, dispute notes, and linked events side by side, and states that coexistence does not imply participation.
- **Search** — `Ctrl / ⌘ + K`: empty means browse by period and regime, and a click jumps to the founding year with the comparison window kept; typing searches years (`1127`, `前221`, `221 BCE`), era names with an ordinal (`建炎元年`, `绍兴十二年`), ganzhi (`丁未`), person aliases (`秦始皇`), and regime pinyin (`donghan`).
- **Chronology reference** — polities, rulers, era names, spans, ganzhi, months of change, disputes, and sources in one table, filterable across several regimes and exportable to CSV.
- **Heritage** — 162 selected sites, filterable by category / dynasty / keyword, each linking back to its founding year.
- **Annual dossier and ruler dossier** — a floating record you can drag, resize on eight handles, fade, or dock to the side; ruler names open a ruler dossier with era names, reign events, and the rulers of its first year.
- **Citations and export** — every event has a permalink; citations switch between GB/T 7714 and a plain style, and can be copied one by one, copied or downloaded as `.txt` for the current filter, with optional numbering.
- **Annual poster** — the year's ganzhi and contemporary eras laid out as a 1080-wide portrait poster in light or dark, downloadable or shared through the system sheet.
- **Interface languages** — Simplified Chinese / Traditional Chinese / English, following the browser on first visit and remembering your choice; Traditional also converts the historical data, while English translates only the interface and keeps regime, era, and event names in Chinese.
- **Mobile and themes** — a mobile menu, year picker, and swipe paging; automatic night mode (light from 07:00 to 19:00, overridable), with desktop and mobile sharing one layout — only the paper changes, never the grid.
- **Keyboard and accessibility** — a "skip to content" link leads straight to the main view; `Esc` closes the search or the dossier and returns focus; search is a `combobox` navigable with arrow keys.

This site draws no borders. For territory maps of a given period, see [Jiangshan Map](https://deanchen.me/jiangshan-map/).

## Data and accuracy

- Coverage 769 BCE — 1911: 90 polities, 825 rulers, and 1,107 reign records (744 of them carry an era name), including the Spring and Autumn and Warring States states, minor Sixteen Kingdoms offshoots, the Ten States and other regional regimes, plus Tubo, Nanzhao, Uyghur, Balhae, Silla, and Khitan.
- 5,345 events across 2,200 years, 668 selected people, and 162 heritage sites.
- Every era name and event carries sources; disputed dates (`disputed`) and approximate ones (`approx`) are distinguished in the interface by dashed lines and badges; years with no data are left blank — blank does not mean nothing happened.
- Internal time is stored as astronomical year integers (1 BCE = 0); ganzhi is computed, never stored; months of era change follow the original record and are never auto-converted to Gregorian days.
- Passing validation is not historical certification: events, people, and heritage still await entry-level review; source differences for the Song–Liao–Jin–Xia period are recorded in `docs/1126-1128来源复核.md`.

## Getting started

Requires Node.js 18+.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # type check + data validation + build to dist/
npm run preview    # preview the build
```

Data commands:

```bash
npm run validate   # data validation (required after editing data/*.json; build runs it too)
npm test           # regression tests for dates, conversion, search, and dossier layout
```

## Project structure

| Path | Purpose |
|---|---|
| `data/` | static data: polities, rulers, eras, events, people, heritage, sources |
| `data/curated/` | hand-curated overlays, highest priority |
| `scripts/` | data import, validation, regression tests |
| `src/views/` | reading, timeline, chronology reference, heritage |
| `src/components/` | search palette, annual dossier, ruler dossier, regime comparison, annual poster, mobile navigation and year picker |
| `src/lib/` | data access, time and ganzhi, search, conversion, citations, i18n |
| `src/styles.css`, `reading-collections.css`, `dark-theme.css`, `mobile.css` | global layout, reading pages, dark theme, mobile styles |
| `public/` | fonts, icon originals, site icons |
| `docs/preview/` | screenshots used in the README |
| `docs/assets/` | cover image for the README and external showcases |

## Roadmap

**Done**

- reign data for 769 BCE — 1911: 90 polities / 825 rulers / 1,107 reign records, with ganzhi cross-checked entry by entry;
- minor Sixteen Kingdoms offshoots (Ran Wei, Western Yan, Zhai Wei, Dai), the regional regimes beyond the Ten States (Qi, Jie Yan, Qingyuan, Guiyi), and Tubo, Nanzhao, Uyghur, Balhae, Silla, and Khitan;
- 5,345 events linked to 668 people's birth and death, plus 162 selected heritage sites;
- almanac-style reading page, vertical timeline, regime comparison, chronology reference, heritage, glass search, annual dossier, and ruler dossier;
- citation styles, batch citations, the annual poster; mobile menu, year picker, and automatic day/night mode;
- Simplified / Traditional / English interface, with Traditional data conversion and Traditional search;
- matching light and dark layouts, data validation, and regression tests.

**Planned**

- add the remaining short-lived polities and regional era names;
- entry-level source review and dispute notes for reign records;
- expanding heritage toward the full national key heritage register, with coordinate linking (no borders of our own; territory maps link out to Jiangshan Map);
- month-level lunar–Gregorian conversion.

## Contributing

- **Report a problem**: open an [issue](https://github.com/Linqiyu-0921/ChronoChina/issues) with the symptom, browser, and steps; attach sources for historical corrections.
- **Send a change**: fork, branch, keep each change focused; run `npm run validate` before touching `data/*.json`, and run `npm run build` and `npm test` before opening a PR.
- **Historical standards**: no undated sources, no silent edits; disputes must set `disputed` with the reasoning; lunar dates are never converted to Gregorian days automatically.

## License

| Part | License |
|---|---|
| Code | [MIT](LICENSE) |
| Data (`data/`) | [CC BY-SA 4.0](LICENSE-DATA.md) |
| Icons and gold line art (`public/assets/icons/`) | CC BY 4.0 |
| Fonts (`public/fonts/`) | third-party fonts, not licensed with this repository |

Please keep the attribution **此年 · ChronoChina (Linqiyu)** when reposting or adapting; data also requires attribution to the Wikipedia source listed below.

## Credits

- event chronology follows [Wikipedia: 中国历史年表](https://zh.wikipedia.org/wiki/中国历史年表) (CC BY-SA 4.0; all text independently rewritten);
- era spans and disputed dates checked against [Y. T. Liu's Chinese chronology tables](https://ytliu0.github.io/ChineseCalendar/era_names_simp.html);
- era data imported from [中国历代纪元表](https://home.olemiss.edu/~gg/lidaijiy.htm);
- heritage entries draw on the UNESCO World Heritage list and the public national key heritage register;
- for territory and place names, see [Jiangshan Map](https://deanchen.me/jiangshan-map/) by Dean Chen;
- Simplified–Traditional conversion uses [OpenCC](https://github.com/BYVoid/OpenCC) (opencc-js);
- open-source dependencies: [React](https://react.dev/), [Vite](https://vite.dev/), [d3-scale](https://github.com/d3/d3-scale);
- the typography uses a Song-dynasty style face (simplified / traditional) bundled with the site; check its license before redistributing.
