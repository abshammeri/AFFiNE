import { TextDirection } from '@blocksuite/affine-model';
import { html, svg, type TemplateResult } from 'lit';

export interface TextDirectionConfig {
  /** `null` = reset to the editor-wide direction. */
  textDirection: TextDirection | null;
  name: string;
  description: string;
  searchAlias: string[];
  hotkey: string[] | null;
  icon: TemplateResult<1>;
}

// Pilcrow + arrow glyphs, drawn to match the 24px icon set.
const directionIcon = (arrow: ReturnType<typeof svg>) =>
  html`<svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M10 13.5V3.5h7M14 3.5v10M10 3.5a3.25 3.25 0 0 0 0 6.5" />
    ${arrow}
  </svg>`;

export const TextDirectionLtrIcon = () =>
  directionIcon(svg`<path d="M5 19h14m-3-3 3 3-3 3" />`);
export const TextDirectionRtlIcon = () =>
  directionIcon(svg`<path d="M19 19H5m3-3-3 3 3 3" />`);
export const TextDirectionAutoIcon = () =>
  directionIcon(svg`<path d="M5 19h14M8 16l-3 3 3 3M16 16l3 3-3 3" />`);
export const TextDirectionResetIcon = () =>
  directionIcon(svg`<path d="M8 16.5l7 5M15 16.5l-7 5" />`);

export const textDirectionConfigs: TextDirectionConfig[] = [
  {
    textDirection: TextDirection.LTR,
    name: 'Left to right',
    description: 'Write this block left to right.',
    searchAlias: ['ltr', 'direction', 'english'],
    hotkey: ['Mod-Shift-,'],
    icon: TextDirectionLtrIcon(),
  },
  {
    textDirection: TextDirection.RTL,
    name: 'Right to left',
    description: 'Write this block right to left.',
    searchAlias: ['rtl', 'direction', 'arabic', 'hebrew'],
    hotkey: ['Mod-Shift-.'],
    icon: TextDirectionRtlIcon(),
  },
  {
    textDirection: TextDirection.Auto,
    name: 'Auto direction',
    description: 'Pick the direction from the first letter.',
    searchAlias: ['auto', 'direction', 'bidi'],
    hotkey: null,
    icon: TextDirectionAutoIcon(),
  },
  {
    textDirection: null,
    name: 'Reset direction',
    description: 'Use the editor default direction.',
    searchAlias: ['unset', 'direction', 'default'],
    hotkey: null,
    icon: TextDirectionResetIcon(),
  },
];
