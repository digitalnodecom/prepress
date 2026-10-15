/** Official library sets, by key (scripts/qa-set.ts, scripts/seed-library.ts, tests). */
import { KINETIC } from './kinetic';
import { PAPER } from './paper';
import { GARDEN } from './garden';

export const SETS = { kinetic: KINETIC, paper: PAPER, garden: GARDEN } as const;
export type SetKey = keyof typeof SETS;
