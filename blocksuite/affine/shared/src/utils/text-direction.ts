import type { TextDirection } from '@blocksuite/affine-model';

/**
 * Editor-wide direction. `none` means "don't set a `dir` attribute".
 */
export type EditorTextDirection = 'none' | 'ltr' | 'rtl' | 'auto';

/** The value rendered into a block's `dir` attribute (or nothing). */
export type ResolvedTextDirection = 'ltr' | 'rtl' | 'auto' | undefined;

/**
 * Block-level direction wins; otherwise fall back to the editor-wide one.
 * `none` resolves to `undefined` so no `dir` attribute is rendered.
 */
export function resolveTextDirection(
  blockDirection: TextDirection | `${TextDirection}` | undefined | null,
  globalDirection: EditorTextDirection | undefined
): ResolvedTextDirection {
  if (blockDirection) return blockDirection as ResolvedTextDirection;
  if (!globalDirection || globalDirection === 'none') return undefined;
  return globalDirection;
}

const STRONG_CHAR_RE = /\p{L}/u;
const RTL_CHAR_RE =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}]/u;

/**
 * Detect the direction of a string from its first strong (letter) character,
 * roughly like the browser does for `dir="auto"`.
 * Returns `null` when the text has no strong character.
 */
export function detectTextDirection(text: string): 'ltr' | 'rtl' | null {
  const match = STRONG_CHAR_RE.exec(text);
  if (!match) return null;
  return RTL_CHAR_RE.test(match[0]) ? 'rtl' : 'ltr';
}
