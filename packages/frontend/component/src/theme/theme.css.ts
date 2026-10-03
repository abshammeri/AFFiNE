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
 * Note: Chromium (and so Electron) does not implement the `ui-sans-serif`
 * generic yet; it skips it like an unknown family, so there Arabic resolves to
 * the first later family with Arabic glyphs (Tahoma on macOS). WebKit honours
 * it (SF Arabic on Apple platforms).
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
const withGeist = (stack: string) =>
  ["'Geist'", 'ui-sans-serif', stack].join(', ');

const sansFamily = withGeist(baseTheme.fontSansFamily);
const fontFamily = withGeist(baseTheme.fontFamily);
const serifFamily = insertAfterFirstFamily(
  baseTheme.fontSerifFamily,
  'ui-serif',
  'ui-sans-serif'
);
// keep the monospace fonts first, but use ui-sans-serif before the generic
// system fallbacks for non-Latin text in code
const monoFamily = insertBefore(
  baseTheme.fontMonoFamily,
  'apple-system',
  'ui-sans-serif'
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
