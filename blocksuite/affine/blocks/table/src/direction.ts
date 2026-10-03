import type { TableBlockModel, TextDirection } from '@blocksuite/affine-model';
import { textDirectionConfigs } from '@blocksuite/affine-rich-text';
import type { EditorTextDirection } from '@blocksuite/affine-shared/utils';
import {
  detectTextDirection,
  resolveTextDirection,
} from '@blocksuite/affine-shared/utils';

import { compareByOrder } from './utils';

/**
 * The direction a table is laid out in, or `undefined` to inherit it from the
 * surrounding document (editor-wide setting `none`, or `auto` on a table with
 * no letters in it).
 */
export type TableLayoutDirection = 'ltr' | 'rtl' | undefined;

/**
 * Detect the direction of a table from the first cell (in row / column order)
 * whose text has a strong (letter) character, like a header row that starts
 * with an Arabic or an English word.
 *
 * Reading `deltas$` keeps a surrounding `computed` reactive to edits of the
 * cells it had to look at, and only those.
 */
export function detectTableDirection(
  model: TableBlockModel
): 'ltr' | 'rtl' | null {
  const { rows$, columns$, cells$ } = model.props;
  const cells = cells$.value;
  const sortedRows = Object.values(rows$.value).sort(compareByOrder);
  const sortedColumns = Object.values(columns$.value).sort(compareByOrder);
  for (const row of sortedRows) {
    for (const column of sortedColumns) {
      const text = cells[`${row.rowId}:${column.columnId}`]?.text;
      if (!text) continue;
      const content = text.deltas$.value
        .map(delta => (typeof delta.insert === 'string' ? delta.insert : ''))
        .join('');
      const direction = detectTextDirection(content);
      if (direction) return direction;
    }
  }
  return null;
}

/**
 * Resolve the direction the table should be rendered with: the table's own
 * `textDirection` wins, otherwise the editor-wide setting. `auto` is resolved
 * from the cell contents rather than left to the browser, because `dir="auto"`
 * on a whole table only looks at its first text node and would not mirror
 * the column order reliably.
 */
export function resolveTableDirection(
  model: TableBlockModel,
  globalDirection: EditorTextDirection | undefined
): TableLayoutDirection {
  const resolved = resolveTextDirection(
    model.props.textDirection$.value,
    globalDirection
  );
  if (resolved !== 'auto') return resolved;
  return detectTableDirection(model) ?? undefined;
}

/** Whether an element inside the table is laid out right to left. */
export function isRtlElement(element: Element | null | undefined): boolean {
  if (!element) return false;
  const view = element.ownerDocument.defaultView;
  return view?.getComputedStyle(element).direction === 'rtl';
}

/**
 * Set the table's own direction, or remove it (`null`) so the table follows
 * the editor-wide setting again. A single undo step.
 */
export function setTableTextDirection(
  model: TableBlockModel,
  textDirection: TextDirection | null
) {
  const { store } = model;
  const current = model.props.textDirection;
  if ((current ?? null) === textDirection) return;
  store.captureSync();
  store.transact(() => {
    if (textDirection) {
      store.updateBlock(model, { textDirection });
    } else {
      // `updateBlock(model, { textDirection: undefined })` is a no-op: the
      // prop has to be deleted from the (flat) block data.
      store.updateBlock(model, () => {
        delete model.props.textDirection;
      });
    }
  });
  // Close the step so an edit right after it is not merged into it.
  store.captureSync();
}

/** Short labels for the table's direction menus. */
const directionLabels: Record<string, string> = {
  ltr: 'Left to right',
  rtl: 'Right to left',
  auto: 'Auto',
  reset: 'Reset',
};

/**
 * The table direction options (Left to right / Right to left / Auto / Reset),
 * with the one matching the table's own `textDirection` marked as selected.
 * `Reset` is the selected one while the table follows the editor setting.
 */
export function getTableDirectionOptions(
  current: TextDirection | `${TextDirection}` | undefined
) {
  return textDirectionConfigs.map(config => ({
    ...config,
    label: directionLabels[config.textDirection ?? 'reset'] ?? config.name,
    selected: config.textDirection === (current ?? null),
  }));
}
