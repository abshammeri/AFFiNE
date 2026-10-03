import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const showMore = style({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minHeight: 28,
  padding: '0 8px 0 34px',
  borderRadius: 4,
  fontSize: 14,
  color: cssVarV2('text/secondary'),
  cursor: 'pointer',
  userSelect: 'none',
  selectors: {
    '&:hover': {
      background: cssVarV2('layer/background/hoverOverlay'),
    },
  },
});
