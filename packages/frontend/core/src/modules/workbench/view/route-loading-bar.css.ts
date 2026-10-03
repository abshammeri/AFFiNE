import { cssVar } from '@toeverything/theme';
import { keyframes, style } from '@vanilla-extract/css';

const grow = keyframes({
  '0%': { transform: 'scaleX(0)' },
  '100%': { transform: 'scaleX(0.9)' },
});

export const bar = style({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: 2,
  zIndex: 10,
  pointerEvents: 'none',
  background: cssVar('primaryColor'),
  transformOrigin: 'left center',
  // ease-out: moves fast first, then slows down while still waiting
  animation: `${grow} 4s cubic-bezier(0.1, 0.8, 0.2, 1) forwards`,
  '@media': {
    print: {
      display: 'none',
    },
  },
});
