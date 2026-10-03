import { cssVar, cssVarV2 } from '@blocksuite/affine-shared/theme';
import { css } from '@emotion/css';

export const cellContainerStyle = css({
  position: 'relative',
  alignItems: 'center',
  border: '1px solid',
  borderColor: cssVarV2.table.border,
  borderCollapse: 'collapse',
  isolation: 'auto',
  textAlign: 'start',
  verticalAlign: 'top',
  // A cell often holds several lines of mixed Arabic / English text. Let each
  // line (v-line) pick its own direction and align to its own start edge
  // instead of inheriting one direction for the whole cell.
  // The v-line's inner div is an inline-block that shrinks to its text, so a
  // short line could not align to its own start edge. Make it a full-width
  // block inside cells so `plaintext` both resolves and aligns each line.
  '& v-line > div': {
    display: 'block !important' as 'block',
    unicodeBidi: 'plaintext',
    textAlign: 'start',
  },
  // v-text renders spans with an inline `word-break: break-word`, which acts
  // like `overflow-wrap: anywhere` and lets the cell's min-content shrink to a
  // single character, so narrow columns split words ("Versio-n"). In cells,
  // only wrap between words; the column grows to fit its longest word.
  '& v-text > span': {
    wordBreak: 'normal !important' as 'normal',
    overflowWrap: 'break-word',
  },
  'affine-table[data-internal-range-selection="true"] &': {
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
  'affine-table[data-internal-range-selection="true"] & rich-text': {
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
  'affine-table[data-internal-range-selection="true"] & rich-text *': {
    userSelect: 'text',
    WebkitUserSelect: 'text',
  },
});

export const columnOptionsCellStyle = css({
  position: 'absolute',
  height: '0',
  top: '0',
  left: '0',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const columnOptionsStyle = css({
  cursor: 'pointer',
  zIndex: 2,
  width: '28px',
  height: '16px',
  backgroundColor: cssVarV2.table.headerBackground.default,
  borderRadius: '8px',
  boxShadow: cssVar('buttonShadow'),
  opacity: 0,
  transition: 'opacity 0.2s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '--three-pointer-icon-color': cssVarV2.icon.secondary,
  ':hover': {
    opacity: 1,
  },
  '&.active': {
    opacity: 1,
    backgroundColor: cssVarV2.table.indicator.activated,
    '--three-pointer-icon-color': cssVarV2.table.indicator.pointerActive,
  },
});

export const rowOptionsCellStyle = css({
  position: 'absolute',
  top: '0',
  insetInlineStart: '0',
  width: '0',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
});

export const rowOptionsStyle = css({
  cursor: 'pointer',
  zIndex: 2,
  width: '16px',
  height: '28px',
  backgroundColor: cssVarV2.table.headerBackground.default,
  borderRadius: '8px',
  boxShadow: cssVar('buttonShadow'),
  opacity: 0,
  transition: 'opacity 0.2s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '--three-pointer-icon-color': cssVarV2.icon.secondary,
  ':hover': {
    opacity: 1,
  },
  '&.active': {
    opacity: 1,
    backgroundColor: cssVarV2.table.indicator.activated,
    '--three-pointer-icon-color': cssVarV2.table.indicator.pointerActive,
  },
});

export const threePointerIconStyle = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
});

export const threePointerIconDotStyle = css({
  width: '3px',
  height: '3px',
  backgroundColor: 'var(--three-pointer-icon-color)',
  borderRadius: '50%',
});

export const indicatorStyle = css({
  position: 'absolute',
  backgroundColor: cssVarV2.table.indicator.activated,
  zIndex: 2,
  transition: 'opacity 0.2s ease-in-out',
  pointerEvents: 'none',
});

export const columnIndicatorStyle = css([
  indicatorStyle,
  {
    top: '-1px',
    height: 'calc(100% + 2px)',
    width: '5px',
  },
]);

export const columnRightIndicatorStyle = css([
  columnIndicatorStyle,
  {
    cursor: 'ew-resize',
    insetInlineEnd: '-3px',
    pointerEvents: 'auto',
  },
]);

export const columnLeftIndicatorStyle = css([
  columnIndicatorStyle,
  {
    insetInlineStart: '-2px',
  },
]);

export const rowIndicatorStyle = css([
  indicatorStyle,
  {
    insetInlineStart: '-1px',
    width: 'calc(100% + 2px)',
    height: '5px',
  },
]);

export const rowBottomIndicatorStyle = css([
  rowIndicatorStyle,
  {
    bottom: '-3px',
  },
]);

export const rowTopIndicatorStyle = css([
  rowIndicatorStyle,
  {
    top: '-2px',
  },
]);
