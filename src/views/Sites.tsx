import { formatYear } from '../lib/time';
/**
 * 文化遗产视图：按类别/朝代/关键词筛选遗址卡片，可跳转时间轴定位始建年代。
 * 数据为世遗与国保精选（约 80 处），全量 5000+ 处文保为后续导入工程。
 */
import { useMemo, useState } from 'react';
import {
  polities,
  polityById,
  SITE_CATS,
  siteJumpYear,
  sitePeriodLabel,
  sites,
  sourceShort,
  type Site,
} from '../lib/data';

interface Props {
  onJumpToYear: (y: number) => void;
}

export default function Sites({ onJumpToYear }: Props) {
  const [cat, setCat] = useState('all');
  const [polity, setPolity] = useState('all');
  const [q, setQ] = useState('');

  const dynastyOptions = useMemo(() => {
    // 政权下拉沿用时间轴政权；另加「史前/无政权关联」聚合项
    return polities;
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim();
    return sites.filter((s) => {
      if (cat !== 'all' && s.category !== cat) return false;
      if (polity === 'none' && s.polityIds.length > 0) return false;
      if (polity !== 'all' && polity !== 'none' && !s.polityIds.includes(polity)) return false;
      if (kw && !`${s.name}${s.place}${s.dynasty}${s.note ?? ''}`.includes(kw)) return false;
      return true;
    });
  }, [cat, polity, q]);

  const whsCount = filtered.filter((s) => s.whs).length;

  return (
    <div className="sites-view">
      <div className="card sites-toolbar">
        <select aria-label="遗产类别" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">全部类别</option>
          {SITE_CATS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select aria-label="遗产政权" value={polity} onChange={(e) => setPolity(e.target.value)}>
          <option value="all">全部朝代</option>
          <option value="none">史前 / 无政权关联</option>
          {dynastyOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}（{formatYear(p.startYear)}—{formatYear(p.endYear)}）</option>
          ))}
        </select>
        <input aria-label="搜索遗产" value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索名称 / 地点 / 备注…" />
        <span className="dim">
          {filtered.length} 处{whsCount ? ` · 世遗 ${whsCount}` : ''}
        </span>
      </div>

      <div className="sites-grid">
        {filtered.map((s) => (
          <SiteCard key={s.id} site={s} onJumpToYear={onJumpToYear} />
        ))}
      </div>
      {filtered.length === 0 && <p className="card hint-card dim">没有匹配的遗址，试试放宽筛选。</p>}
    </div>
  );
}

function SiteCard({ site, onJumpToYear }: { site: Site; onJumpToYear: (y: number) => void }) {
  const jump = siteJumpYear(site);
  return (
    <article className="card site-card">
      <header>
        <h3>{site.name}</h3>
        <span className="ghost-chip cat-chip">{site.category}</span>
        {site.whs && <span className="badge whs">世遗 {site.whs}</span>}
      </header>
      <p className="site-meta">
        <b>{site.dynasty}</b> ｜ {sitePeriodLabel(site)}
      </p>
      <p className="site-place">{site.place}</p>
      {site.polityIds.length > 0 && (
        <p className="site-polity">
          {site.polityIds
            .map((pid) => ({ pid, p: polityById.get(pid) }))
            .filter((x) => x.p)
            .map(({ pid, p }) => (
              <span key={pid} className="ghost-chip" style={{ color: p!.color }}>
                {p!.name}
              </span>
            ))}
        </p>
      )}
      {site.note && <p className="site-note">{site.note}</p>}
      <footer className="site-foot">
        {site.coords && <span className="mono dim">{site.coords[0].toFixed(2)}, {site.coords[1].toFixed(2)}</span>}
        {jump !== null && jump >= -305 && jump <= 1911 ? (
          <button className="chip-btn" onClick={() => onJumpToYear(jump)}>定位年代：{formatYear(jump)} 年</button>
        ) : (
          <span className="dim">超出纪年轴范围或年代未定</span>
        )}
        <span className="dim">来源：{sourceShort(site.sources).join('、')}</span>
      </footer>
    </article>
  );
}
