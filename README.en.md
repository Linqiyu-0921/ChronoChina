English · [简体中文](README.md)

<p><img src="public/favicon-art.png" width="64" alt="此年 ChronoChina logo" align="left"></p>

# ChronoChina · 此年

**此年，山河同阅。** — *One year, many realms; read them side by side.*

## Why I built this

I mostly work with spatial data, so my first instinct is to put everything into a coordinate system: an origin, a scale, and only then does a position mean anything. Reading history, I kept missing the equivalent for time — dynasties are written volume by volume, and so they get read volume by volume.

The first thing that tripped me up was a simple question: which era names were actually in use in 1127? The answer spans several volumes. The Song went from Jingkang to Jianyan, the Jin were already in Tianhui, Western Xia in Zhengde, Qara Khitai in Yanqing, Dali still in Yongjia. Different books, same year — and I had to stack them in my head to see it.

So this site starts by aligning the ruler: give it a year, then read every regime that existed in that year side by side. When you want to dig in, each era can be traced to its sources, and years with no data are marked as blank, not as "nothing happened". Line the ruler up and settle the rules, and reading history stops giving you heartburn.

It deliberately is not a map, and not a decorative scroll. "此年，山河同阅" is both the framing and the constraint: give the simultaneity back to history, and leave the judgement to you.

## Project name

- **Site name**: 此年 · ChronoChina (ChronoChina = Chronology + China)
- **Slogan**: 此年，山河同阅。
- **Logo**: a seal-style 「此年」 stamp, see `public/favicon-art.png`

## Overview

A chronological atlas of Chinese history. It builds one shared time coordinate: pick any year and you see the Gregorian year, the sexagenary (ganzhi) cycle, every regime alive in that year, each one's era name and ruler, and what happened.

Unlike an exhibition-style timeline, every entry here can be located, checked, and traced to a source. Disputed dates are dashed, approximate years are flagged, and missing coverage is stated as missing. All data is static JSON — no backend, no database, no runtime requests.

It is for anyone who wants to know how many regimes existed in a given year and what each of them called it — and for teaching or writing that needs a date reference you can verify.

## Live demo

**<https://chronochina.pages.dev>** — hosted on Cloudflare Pages.

Open it as is, or run it locally (see [Getting started](#getting-started)) if you want to change something. The build is fully static, and `base: './'` works from any subpath.

## Screenshots

**Reading (阅年), dark**: one year per page, laid out like an almanac. The year leads and the ganzhi follows; contemporary regimes are numbered 01—05 by founding order, and a one-line epigraph states the year's shape.

![Reading view (dark)](docs/preview/01-reading-dark.png)

**Reading (阅年), light**: the same page on paper white — vermilion and gold only on the year, the seals, and the rules.

![Reading view (light)](docs/preview/02-reading-light.png)

**Timeline (并世), dark**: a vertical time canvas. Gregorian years on the left, a vermilion line at the current year, and one exhibition label per surviving regime, with era names drawn as duration bars at their true start and end.

![Timeline view (dark)](docs/preview/03-timeline-dark.png)

**Timeline (并世), light**: the same ruler, a different paper.

![Timeline view (light)](docs/preview/04-timeline-light.png)

**Search, browse**: `Ctrl / ⌘ + K`. With an empty box it is a table of contents — six periods and their regimes.

![Search (browse)](docs/preview/05-search-browse-dark.png)

**Search, query**: type an era name, year, ganzhi, person, or pinyin, press Enter, and land on that year.

![Search (results)](docs/preview/06-search-result-dark.png)

## Features

- **Reading (阅年)** — one year per page: the year, its ganzhi, and how many regimes stood at once; the epigraph is generated from that year's era changes ("丁未之年，五政权并立；赵宋改元建炎，西夏改元正德。"); regimes are numbered by founding order and split into two columns when five coexist; expand one to see its era name, ruler, span, and month of change; turn pages with the wheel / `↑ ↓` / swipe. Each page opens an "annual dossier" gathering the year's events, contemporary eras, and people alive.
- **Timeline (并世)** — vertical multi-year comparison: Gregorian years on the left, a vermilion line at the current year; each surviving regime gets a column with an exhibition label, era names are drawn as duration bars at their true extent, and regimes crossing the current year open their era, ruler, and month of change; disputed and approximate dates are marked; `Ctrl / ⌘ + wheel` changes time density, `‹ ›` pages through regime groups.
- **Search** — `Ctrl / ⌘ + K`: empty means browse by period and regime, and a click jumps to the founding year with the comparison window kept; typing searches years (`1127`, `前221`), era names (`建炎元年`, `绍兴`), ganzhi (`丁未`), person aliases (`秦始皇`), and regime pinyin (`donghan`).
- **Annual dossier** — a floating record you can drag, resize on all eight handles, fade, or dock to the side; it follows the current year.
- **Chronology reference** — polities, rulers, era names, spans, ganzhi, months of change, disputes, and sources in one table, filterable and exportable to CSV.
- **Heritage** — 82 selected sites, filterable by category / dynasty / keyword, each linking back to its founding year.
- **Themes** — paper white and ink-black with gold share a single layout; only the paper changes, never the grid. Your choice is remembered.
- **Keyboard and accessibility** — a "skip to content" link leads straight to the main view; `Esc` closes the search or the dossier and returns focus; search is a `combobox` navigable with arrow keys.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, TypeScript (strict), plain CSS with custom properties |
| Build | Vite 5 |
| Time mapping | d3-scale (year ↔ pixels) |
| Data | static JSON, read at build time, no backend, no database |
| Data scripts | Node ESM + cheerio (dev-time import and validation only) |

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
| `public/` | fonts, icon originals, site icons |
| `src/views/` | reading, timeline, chronology reference, heritage |
| `src/components/` | search palette, annual dossier, year panel, icons |
| `src/lib/` | data access, time and ganzhi, search, conversion |
| `src/styles.css` | time canvas, search palette, global layout |
| `src/reading-collections.css` | reading page, reference and heritage styling |
| `docs/preview/` | screenshots used in the README |
| `index.html` | entry point |

## Roadmap

**Done**

- full era import (36 polities / 242 rulers / 540 era names), with ganzhi cross-checked entry by entry;
- a full event base (753 entries across 555 years) linked to 78 people's birth and death;
- vertical timeline, almanac-style reading page, chronology reference, heritage, glass search, annual dossier;
- the dynasty browser folded into the search palette, matching light and dark layouts, data validation and regression tests.

**Planned**

- fill in the Sixteen Kingdoms, Ten Kingdoms, and Qara Khitai eras after 1143;
- event categories and ruler profile pages;
- linking history to place: a heritage map plus deep links into the timeline, without drawing borders of our own;
- expanding the heritage list toward the full national key heritage register.

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
- open-source dependencies: [React](https://react.dev/), [Vite](https://vite.dev/), [d3-scale](https://github.com/d3/d3-scale);
- the typography uses a Song-dynasty style face (simplified / traditional) bundled with the site; check its license before redistributing.
