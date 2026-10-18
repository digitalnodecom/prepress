/** Official library sets, by key (scripts/qa-set.ts, scripts/seed-library.ts, tests). */
import { KINETIC } from './kinetic';
import { PAPER } from './paper';
import { GARDEN } from './garden';
import { SHOWROOM } from './showroom';
import { FX } from './fx';
import { HUT } from './hut';
import { CHORUS } from './chorus';
import { PROGRAMME } from './programme';
import { SWITCHBACK } from './switchback';

export const SETS = { kinetic: KINETIC, paper: PAPER, garden: GARDEN, showroom: SHOWROOM, fx: FX, hut: HUT, chorus: CHORUS, programme: PROGRAMME, switchback: SWITCHBACK } as const;
export type SetKey = keyof typeof SETS;
