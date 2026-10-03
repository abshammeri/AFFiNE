import { baseTheme, cssVar } from '@toeverything/theme';
import { globalStyle } from '@vanilla-extract/css';

globalStyle('body', {
  color: cssVar('textPrimaryColor'),
  fontFamily: cssVar('fontFamily'),
  fontSize: cssVar('fontBase'),
});

/**
 * Default sans stack: Geist for Latin, then `ui-sans-serif` for Arabic (and
 * other scripts Geist lacks), then the theme's own fallbacks ("Inter",
 * "Source Sans 3", Poppins, apple-system, ...). Serif / mono keep their theme
 * fonts and only gain `ui-sans-serif` as the fallback for Arabic.
 *
 * Arabic resolves as follows:
 * - WebKit honours `ui-sans-serif` (SF Arabic on Apple platforms).
 * - Chromium / Electron skip `ui-sans-serif`, so they use the bundled
 *   "IBM Plex Sans Arabic" (see fonts.css).
 * - If that font cannot load, Tahoma and Arial are removed from the stacks so
 *   the browser falls back to the operating system's Arabic font instead.
 *
 * The stacks come from @toeverything/theme; we re-declare the variables on
 * `:root:root` so they win over the theme's `:root` rules (incl. print).
 */
const insertAfterFirstFamily = (stack: string, ...families: string[]) => {
  const [first, ...rest] = stack.split(',').map(f => f.trim());
  return [first, ...families, ...rest].filter(Boolean).join(', ');
};
const insertBefore = (stack: string, marker: string, ...added: string[]) => {
  const families = stack.split(',').map(f => f.trim());
  const index = families.indexOf(marker);
  if (index === -1) return [...families, ...added].join(', ');
  families.splice(index, 0, ...added);
  return families.join(', ');
};
const withoutSystemAliases = (stack: string) =>
  stack
    .split(',')
    .map(f => f.trim())
    .filter(f => f !== 'apple-system' && f !== 'BlinkMacSystemFont')
    .join(', ');
const ARABIC_FALLBACKS = ['ui-sans-serif', "'IBM Plex Sans Arabic'"];
const withoutArabicLegacyFonts = (stack: string) =>
  stack
    .split(',')
    .map(f => f.trim())
    .filter(f => f !== 'Tahoma' && f !== 'Arial')
    .join(', ');
const withGeist = (stack: string) =>
  ["'Geist'", ...ARABIC_FALLBACKS, withoutArabicLegacyFonts(stack)].join(', ');

const sansFamily = withGeist(baseTheme.fontSansFamily);
const fontFamily = withGeist(baseTheme.fontFamily);
const serifFamily = insertAfterFirstFamily(
  withoutArabicLegacyFonts(baseTheme.fontSerifFamily),
  'ui-serif',
  ...ARABIC_FALLBACKS
);
// keep the monospace fonts first, but use the Arabic fallbacks before the
// generic system fallbacks for non-Latin text in code
const monoFamily = insertBefore(
  withoutArabicLegacyFonts(baseTheme.fontMonoFamily),
  'apple-system',
  ...ARABIC_FALLBACKS
);

globalStyle(':root:root', {
  vars: {
    [cssVar('fontFamily').slice(4, -1)]: fontFamily,
    [cssVar('fontSansFamily').slice(4, -1)]: sansFamily,
    [cssVar('fontSerifFamily').slice(4, -1)]: serifFamily,
    [cssVar('fontMonoFamily').slice(4, -1)]: monoFamily,
  },
  '@media': {
    print: {
      vars: {
        [cssVar('fontFamily').slice(4, -1)]: withoutSystemAliases(fontFamily),
        [cssVar('fontSansFamily').slice(4, -1)]:
          withoutSystemAliases(sansFamily),
        [cssVar('fontSerifFamily').slice(4, -1)]:
          withoutSystemAliases(serifFamily),
        [cssVar('fontMonoFamily').slice(4, -1)]:
          withoutSystemAliases(monoFamily),
      },
    },
  },
});
