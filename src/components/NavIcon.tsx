type IconName = 'reading' | 'timeline' | 'chronology' | 'heritage' | 'search' | 'about' | 'sun' | 'moon';

const paths: Record<IconName, string[]> = {
 reading: ['M12 5Q7 2 3 4V20Q7 18 12 21Q17 18 21 20V4Q17 2 12 5V21', 'M6 8H9M6 12H9M15 8H18M15 12H18'],
 timeline: ['M5 3V21M12 3V21M19 3V21M3 8H7M10 15H14M17 10H21'],
  chronology: [
    'M5 4H19V18H7M5 4a2 2 0 0 0-2 2v12a2 2 0 0 0 4 0V6a2 2 0 0 0-2-2Z',
    'M7 18a2 2 0 0 1-2 2H19a2 2 0 0 0 2-2V16H19',
    'M10 8H16M10 11H16M10 14H14',
  ],
  heritage: [
    'M5 8V3H8V8M16 8V3H19V8M4 8H20',
    'M5 8L6 15Q6 17 9 17H15Q18 17 18 15L19 8',
    'M8 17L7 21M16 17L17 21M12 17V21',
    'M9 11H15M10 14H14',
  ],
  search: [
    'M4 10a6 6 0 1 0 12 0a6 6 0 1 0-12 0',
    'M7 10a3 3 0 0 1 3-3M15 15L21 21M17 16L16 17',
  ],
  about: [
    'M3 19L8 10L13 19M10 14L15 6L21 19M15 6L17 13',
    'M4 21H20M4 6H8M5 8H7',
    'M17 5a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  ],
  sun: [
    'M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
    'M12 2V4M12 20V22M2 12H4M20 12H22M5 5L6.5 6.5M17.5 17.5L19 19M5 19L6.5 17.5M17.5 6.5L19 5',
  ],
  moon: ['M20 15A8.5 8.5 0 0 1 9 4A8.5 8.5 0 1 0 20 15Z'],
};

export default function NavIcon({ name }: { name: IconName }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" width="24" height="24"
      fill="none" stroke="currentColor" strokeWidth="1.15"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name].map(d => <path key={d} d={d} />)}
    </svg>
  );
}
