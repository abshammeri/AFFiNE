import './pc-virtual/effect.js';
import './pc/effect.js';

import type { DataViewRootUILogic } from '../../core/data-view.js';
import { createIcon } from '../../core/utils/uni-icon.js';
import type { SingleView } from '../../core/view-manager/single-view.js';
import { TABLE_VIRTUAL_SCROLL_ROW_THRESHOLD } from './consts.js';
import { tableViewModel } from './define.js';
import { MobileTableViewUILogic } from './mobile/table-view-ui-logic.js';
import { TableViewUILogic } from './pc/table-view-ui-logic.js';
import { VirtualTableViewUILogic } from './pc-virtual/table-view-ui-logic';

/**
 * Picks the desktop table implementation.
 *
 * - The `enable_table_virtual_scroll` feature flag forces the virtualized
 *   table on (it is the override used to test it everywhere).
 * - Otherwise the virtualized table is used automatically for large tables
 *   (at least {@link TABLE_VIRTUAL_SCROLL_ROW_THRESHOLD} rows), except on the
 *   edgeless canvas where the zoom transform breaks its layout math.
 *
 * The choice is made once when the view logic is created, so a table never
 * swaps implementations while the user is editing it.
 */
export const shouldUseVirtualTable = (
  view: SingleView,
  root?: Pick<DataViewRootUILogic, 'config'>
) => {
  if (view.featureFlags$.value.enable_table_virtual_scroll) {
    return true;
  }
  if (root?.config.isEdgeless?.()) {
    return false;
  }
  // Count all rows (not just the filtered ones): filters can be removed later
  // without re-creating the view logic.
  return (
    view.manager.dataSource.rows$.value.length >=
    TABLE_VIRTUAL_SCROLL_ROW_THRESHOLD
  );
};

export const tableViewMeta = tableViewModel.createMeta({
  icon: createIcon('DatabaseTableViewIcon'),
  pcLogic: (view, root) =>
    // @ts-expect-error fixme: typesafe
    shouldUseVirtualTable(view, root)
      ? VirtualTableViewUILogic
      : TableViewUILogic,
  // @ts-expect-error fixme: typesafe
  mobileLogic: () => MobileTableViewUILogic,
});
