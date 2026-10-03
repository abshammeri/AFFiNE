import { cssVarV2 } from '@toeverything/theme/v2';
import { keyframes, style } from '@vanilla-extract/css';

export const root = style({});
const expandIn = keyframes({
  from: { opacity: 0, transform: 'translateY(-2px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
});

export const content = style({
  paddingTop: 6,
  selectors: {
    '&[data-state="open"]': {
      animation: `${expandIn} 150ms ease-out`,
    },
  },
});

export const header = style({
  selectors: {
    '&[data-dragged-over="true"]': {
      background: cssVarV2('layer/background/hoverOverlay'),
    },
  },
});
