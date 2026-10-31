import { Fragment, type ReactNode } from 'react';
import { RARE_PINYIN } from '../lib/pinyin';
import { S } from '../lib/i18n';

/**
 * 在生僻字后以括注排出拼音，如「郢（yǐng）」。
 * 只注音表里的字，常用字保持原样；括注随字号缩放，不顶高行距。
 * 繁体模式下先整体转换再逐字注音；若转换改变了字数，只排文字不注音。
 */
export default function Han({ text, className }: { text?: string | null; className?: string }) {
  if (!text) return null;
  const shown = S(text);
  const notes = shown.length === text.length;
  const nodes: ReactNode[] = [];
  let plain = '';
  for (let i = 0; i < text.length; i++) {
    const reading = notes ? RARE_PINYIN[text[i]] : undefined;
    if (!reading) {
      plain += shown[i];
      continue;
    }
    if (plain) {
      nodes.push(plain);
      plain = '';
    }
    nodes.push(
      <span key={nodes.length} className="han">
        {shown[i]}
        <span className="han-py">({reading})</span>
      </span>,
    );
  }
  if (plain) nodes.push(plain);
  const body = <Fragment>{nodes}</Fragment>;
  return className ? <span className={className}>{body}</span> : body;
}
