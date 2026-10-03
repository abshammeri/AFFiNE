import { css } from '@emotion/css';

const externalRangeSelectionSelector =
  'affine-table[data-external-range-selection]';
const hiddenSelectionBackground = '#fff';

export const tableContainer = css({
  display: 'block',
  // Room for the row handles, which sit on the inline-start edge (the right
  // edge of a right-to-left table).
  paddingBlock: '10px 18px',
  paddingInlineStart: '10px',
  paddingInlineEnd: '0',
  overflowX: 'auto',
  overflowY: 'visible',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  '& *': {
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  [`${externalRangeSelectionSelector} &::selection`]: {
    backgroundColor: hiddenSelectionBackground,
  },
  [`${externalRangeSelectionSelector} & *::selection`]: {
    backgroundColor: hiddenSelectionBackground,
  },
  [`${externalRangeSelectionSelector} & rich-text::selection`]: {
    backgroundColor: hiddenSelectionBackground,
  },
  [`${externalRangeSelectionSelector} & rich-text *::selection`]: {
    backgroundColor: hiddenSelectionBackground,
  },
  '::-webkit-scrollbar': {
    height: '8px',
  },
  '::-webkit-scrollbar-thumb:horizontal': {
    borderRadius: '4px',
    backgroundColor: 'transparent',
  },
  '::-webkit-scrollbar-track:horizontal': {
    backgroundColor: 'transparent',
    height: '8px',
  },
  '&:hover::-webkit-scrollbar-thumb:horizontal': {
    borderRadius: '4px',
    backgroundColor: 'var(--affine-black-30)',
  },
  '&:hover::-webkit-scrollbar-track:horizontal': {
    backgroundColor: 'var(--affine-hover-color)',
    height: '8px',
  },
});

export const tableWrapper = css({
  overflow: 'visible',
  display: 'flex',
  flexDirection: 'row',
  gap: '8px',
  position: 'relative',
  width: 'max-content',
});

export const table = css({});

export const rowStyle = css({});
