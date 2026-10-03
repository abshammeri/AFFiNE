import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { keyframes, style } from '@vanilla-extract/css';
export const pageDetailSkeletonStyle = style({
  padding: '0 20px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
});
export const blockSuiteEditorStyle = style({
  margin: 'auto 2rem',
  padding: '0 24px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100%',
});
export const illustration = style({
  maxWidth: '100%',
  width: 300,
  alignSelf: 'center',
});
export const content = style({
  width: '100%',
  textAlign: 'center',
  maxWidth: '261px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '16px auto 0',
  selectors: {
    '&[data-longer-loading="true"]': {
      maxWidth: '400px',
    },
  },
});
export const text = style({
  fontSize: cssVar('fontSm'),
  lineHeight: 1.6,
  fontWeight: 400,
  color: cssVarV2('text/secondary'),
  textWrap: 'wrap',
  wordBreak: 'break-word',
  textAlign: 'center',
  selectors: {
    '&[data-longer-loading="true"]': {
      textAlign: 'start',
    },
  },
});
export const stillSyncingTitle = style({
  marginTop: '12px',
  fontSize: cssVar('fontBase'),
  lineHeight: 1.6,
  fontWeight: 500,
  color: cssVarV2('text/primary'),
});
export const actionButton = style({ marginTop: '24px' });
export const mobileActionButton = style({
  padding: '8px 18px',
  height: 'auto',
  fontWeight: 600,
  marginTop: '24px',
});

export const actionContent = style({
  padding: '0 4px',
});
export const mobileActionContent = style({
  padding: '0 4px',
});

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});
export const editorSkeleton = style({
  width: '100%',
  maxWidth: 'var(--affine-editor-width, 800px)',
  margin: '0 auto',
  padding: '96px 24px 0',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  opacity: 0,
  animation: `${fadeIn} 200ms ease-out 150ms forwards`,
});
export const skeletonTitle = style({
  marginBottom: '22px',
});
export const skeletonGap = style({
  height: '12px',
});
