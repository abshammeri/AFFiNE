import { DebugLogger } from '@affine/debug';
import type { HTMLAttributes } from 'react';

import { notify } from '../notification';

const logger = new DebugLogger('toast');

export const sleep = (ms = 0) =>
  new Promise(resolve => setTimeout(resolve, ms));

export type ToastOptions = {
  duration?: number;
  /**
   * @deprecated toasts are rendered by the global notification center,
   * this option is ignored.
   */
  portal?: HTMLElement;
};

/**
 * Show a simple text toast, rendered by the sonner based notification center.
 *
 * @example
 * ```ts
 * toast('Hello World');
 * ```
 */
export const toast = (
  message: string,
  { duration = 3000 }: ToastOptions = {}
) => {
  logger.debug(`toast with message: "${message}"`);
  window.dispatchEvent(
    new CustomEvent('affine-toast:emit', { detail: message })
  );
  return notify(
    {
      title: message,
      rootAttrs: {
        'data-testid': 'affine-toast',
      } as HTMLAttributes<HTMLDivElement>,
    },
    { duration }
  );
};

export default toast;
