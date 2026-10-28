/**
 * 供视图使用的组合查询助手。
 */
import { eras, polityById, reignById, sourceShort, type EraUse, type Polity, type Reign } from './data';

export interface EraInfo {
  era: EraUse;
  polity: Polity;
  reigns: Reign[];
}

export function eraByIdWithPolity(eraId: string): EraInfo | null {
  const era = eras.find((e) => e.id === eraId);
  if (!era) return null;
  const polity = polityById.get(era.polityId);
  if (!polity) return null;
  const reigns = era.reignIds
    .map((id) => reignById.get(id))
    .filter((r): r is Reign => !!r)
    .sort((a, b) => a.startYear - b.startYear);
  return { era, polity, reigns };
}

export { polityById, sourceShort };
