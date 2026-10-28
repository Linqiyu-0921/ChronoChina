export interface PanelRect { x: number; y: number; width: number; height: number; }
export function fitPanel(rect: PanelRect, vw: number, vh: number): PanelRect {
  const width = Math.max(1, Math.min(rect.width, vw - 24));
  const height = Math.max(1, Math.min(rect.height, vh - 24));
  return { width, height, x: Math.max(12, Math.min(rect.x, vw - width - 12)), y: Math.max(12, Math.min(rect.y, vh - height - 12)) };
}
export function resizePanel(rect: PanelRect, edge: string, dx: number, dy: number, vw: number, vh: number): PanelRect {
  const minW = Math.min(280, vw - 24), minH = Math.min(220, vh - 24);
  let left = rect.x, right = rect.x + rect.width, top = rect.y, bottom = rect.y + rect.height;
  if (edge.includes('w')) left = Math.max(12, Math.min(right - minW, left + dx));
  if (edge.includes('e')) right = Math.min(vw - 12, Math.max(left + minW, right + dx));
  if (edge.includes('n')) top = Math.max(12, Math.min(bottom - minH, top + dy));
  if (edge.includes('s')) bottom = Math.min(vh - 12, Math.max(top + minH, bottom + dy));
  return fitPanel({ x: left, y: top, width: right - left, height: bottom - top }, vw, vh);
}
