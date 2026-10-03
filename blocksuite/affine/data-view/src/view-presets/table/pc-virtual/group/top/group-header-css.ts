import { css } from '@emotion/css';

export const groupHeader = css({
  display: 'block',
});

export const groupToggleButton = css({
  width: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'background-color 150ms cubic-bezier(0.42, 0, 1, 1)',
  '&:hover': {
    background: 'var(--affine-hover-color)',
  },
  '& svg': {
    width: '16px',
    height: '16px',
    flexShrink: 0,
    userSelect: 'none',
  },
});
