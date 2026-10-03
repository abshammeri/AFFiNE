import type { I18nString } from '@affine/i18n';

export interface QuickSearchOptions {
  label?: I18nString;
  placeholder?: I18nString;
  defaultQuery?: string;
}

export interface QuickSearchSubmitOptions {
  /**
   * true when the item was submitted with Cmd (macOS) / Ctrl held,
   * e.g. Cmd+Enter or Cmd+Click, meaning "open in new tab"
   */
  newTab?: boolean;
}
