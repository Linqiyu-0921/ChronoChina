import { Fragment, type ReactNode } from 'react';
import { RARE_PINYIN } from '../lib/pinyin';

/**
 * 在生僻字后以括注排出拼音，如「郢（yǐng）」。
 * 只注音表里的字，常用字保持原样；括注随字号缩放，不顶高行距。
 */
export default function Han({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null;
  const nodes: ReactNode[] = [];
  let plain = '';
  for (const ch of text) {
    const reading = RARE_PINYIN[ch];
    if (!reading) {
      plain += ch;
      continue;
    }
    if (plain) {
      nodes.push(plain);
      plain = '';
    }
    nodes.push(
      <span key={nodes.length} className="han">
        {ch}
        <span className="han-py">({reading})</span>
      </span>,
    );
  }
  if (plain) nodes.push(plain);
  const body = <Fragment>{nodes}</Fragment>;
  return className ? <span className={className}>{body}</span> : body;
}
