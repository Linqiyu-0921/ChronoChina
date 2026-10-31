import { CAT_GLYPHS, type HistEvent } from '../lib/data';
import { S, t } from '../lib/i18n';

interface Props {
  events: readonly HistEvent[];
  value: string | null;
  onChange: (category: string | null) => void;
}

const ORDER = Object.keys(CAT_GLYPHS);

export default function EventCategoryFilter({ events, value, onChange }: Props) {
  const counts = new Map<string, number>();
  for (const ev of events) for (const c of ev.categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  if (counts.size < 2) return null;
  const order = [
    ...ORDER.filter((c) => counts.has(c)),
    ...[...counts.keys()].filter((c) => !ORDER.includes(c)),
  ];
  return <div className="event-filter" role="group" aria-label={t('ev.filterAria')}>
    <button type="button" className={value === null ? 'is-on' : undefined} aria-pressed={value === null} onClick={() => onChange(null)}>
      {t('common.all')}<span>{events.length}</span>
    </button>
    {order.map((c) => (
      <button key={c} type="button" className={value === c ? 'is-on' : undefined} aria-pressed={value === c} onClick={() => onChange(value === c ? null : c)}>
        {S(c)}<span>{counts.get(c)}</span>
      </button>
    ))}
  </div>;
}
