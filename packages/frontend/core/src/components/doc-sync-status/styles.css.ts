import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { keyframes, style } from '@vanilla-extract/css';

const pulse = keyframes({
  '0%': { opacity: 1 },
  '50%': { opacity: 0.35 },
  '100%': { opacity: 1 },
});

export const root = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  flexShrink: 0,
});

export const dot = style({
  position: 'relative',
  width: 8,
  height: 8,
  borderRadius: '50%',
  backgroundColor: cssVarV2('icon/tertiary'),
  transition: 'background-color 0.2s',
  selectors: {
    '&[data-status="synced"]': {
      backgroundColor: cssVarV2('icon/tertiary'),
    },
    '&[data-status="syncing"]': {
      backgroundColor: cssVar('warningColor'),
      animation: `${pulse} 1.6s ease-in-out infinite`,
    },
    '&[data-status="error"]': {
      backgroundColor: cssVarV2('status/error'),
    },
    '&[data-status="offline"]': {
      backgroundColor: 'transparent',
      boxShadow: `inset 0 0 0 1.5px ${cssVarV2('icon/tertiary')}`,
    },
    // the "crossed" line for the offline state
    '&[data-status="offline"]::after': {
      content: '""',
      position: 'absolute',
      left: '50%',
      top: -1,
      width: 1.5,
      height: 10,
      marginLeft: -0.75,
      borderRadius: 1,
      backgroundColor: cssVarV2('icon/tertiary'),
      transform: 'rotate(45deg)',
    },
  },
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  },
});
