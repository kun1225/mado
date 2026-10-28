import type { CnFunction } from 'cn';
import { createCn } from 'cn/config';

// Without this, cn keeps both `t-b-3` and a caller's `t-b-4` or `text-xs`, and CSS order picks the winner instead of the caller.
export const cn: CnFunction = createCn({
  extend: {
    classGroups: {
      typography: [
        {
          t: [
            ...['h-1', 'h-2', 'h-3', 'h-4', 'h-5', 'h-6', 'h-7', 'h-8', 'h-9'],
            ...['b-1', 'b-2', 'b-3', 'b-4'],
            ...['l-1', 'l-2', 'l-3', 'l-4'],
          ],
        },
      ],
    },
    conflictingClassGroups: {
      typography: ['font-size', 'leading', 'font-weight', 'tracking'],
      'font-size': ['typography'],
    },
  },
});
