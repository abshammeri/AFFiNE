import { cssVarV2 } from '@toeverything/theme/v2';
import { globalStyle, style } from '@vanilla-extract/css';

export const docIconPickerTrigger = style({
  width: 64,
  height: 64,
  padding: 2,
  selectors: {
    '&[data-icon-type="emoji"], &[data-icon-type="affine-icon"]': {
      fontSize: 60,
      lineHeight: 1,
    },
    '&[data-icon-type="emoji"]': {
      fontFamily: 'Inter',
    },
    '&::after': {
      display: 'none',
    },
  },
});

export const placeholder = style({
  padding: '4px',
  // only reveal the placeholder when hovering the title area,
  // keep it reachable by keyboard
  opacity: 0,
  transition: 'opacity 0.2s ease',
  selectors: {
    '.doc-icon-container:hover &, .doc-icon-container:has(+ :hover) &, .doc-icon-container:focus-within &, &:focus-visible, &[data-state="open"]':
      {
        opacity: 1,
      },
  },
});
export const placeholderContent = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});
export const placeholderContentIcon = style({
  color: cssVarV2.icon.secondary,
  fontSize: 16,
});
export const placeholderContentText = style({
  color: cssVarV2.text.secondary,
  fontSize: 12,
});

globalStyle('.doc-icon-container[data-has-icon="false"]', {
  '@media': {
    print: {
      display: 'none',
    },
  },
});
