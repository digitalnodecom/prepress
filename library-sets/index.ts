/** Official library sets, by key (scripts/qa-set.ts, scripts/seed-library.ts, tests). */
import { KINETIC } from './kinetic';
import { PAPER } from './paper';

export const SETS = { kinetic: KINETIC, paper: PAPER } as const;
export type SetKey = keyof typeof SETS;
