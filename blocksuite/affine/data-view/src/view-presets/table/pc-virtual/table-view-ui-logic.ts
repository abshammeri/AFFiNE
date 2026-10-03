import {
  menu,
  popMenu,
  popupTargetFromElement,
} from '@blocksuite/affine-components/context-menu';
import type { InsertToPosition } from '@blocksuite/affine-shared/utils';
import { DisposableGroup } from '@blocksuite/global/disposable';
import { AddCursorIcon } from '@blocksuite/icons/lit';
import { computed, type Signal, signal } from '@preact/signals-core';
import { cssVarV2 } from '@toeverything/theme/v2';
import type { TemplateResult } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { html } from 'lit/static-html.js';

import { dv } from '../../../core/common/dv-css.js';
import {
  type GroupTrait,
  groupTraitKey,
} from '../../../core/group-by/trait.js';
import {
  createUniComponentFromWebComponent,
  renderUniLit,
} from '../../../core/index.js';
import {
  DataViewUIBase,
  DataViewUILogicBase,
} from '../../../core/view/data-view-base.js';
import { getCollapsedState, setCollapsedState } from '../collapsed-state.js';
import { LEFT_TOOL_BAR_WIDTH } from '../consts.js';
import {
  TableViewRowSelection,
  type TableViewSelectionWithType,
} from '../selection.js';
import type { TableSingleView } from '../table-view-manager.js';
import { TableClipboardController } from './controller/clipboard.js';
import { TableDragController } from './controller/drag.js';
import { TableHotkeysController } from './controller/hotkeys.js';
import { TableSelectionController } from './controller/selection.js';
import { TableGroupFooter } from './group/bottom/group-footer.js';
import { TableGroupHeader } from './group/top/group-header.js';
import { DatabaseCellContainer } from './row/cell.js';
import { TableRowHeader } from './row/row-header.js';
import { TableRowLast } from './row/row-last.js';
import * as styles from './table-view-css.js';
import type {
  TableCellData,
  TableGrid,
  TableGroupData,
  TableRowData,
} from './types.js';
import {
  getScrollContainer,
  GridVirtualScroll,
} from './virtual/virtual-scroll.js';

export class VirtualTableViewUILogic extends DataViewUILogicBase<
  TableSingleView,
  TableViewSelectionWithType
> {
  ui$ = signal<TableViewUI | undefined>();
  clipboardController = new TableClipboardController(this);
  dragController = new TableDragController(this);
  hotkeysController = new TableHotkeysController(this);
  selectionController = new TableSelectionController(this);

  virtualScroll$ = signal<TableGrid>();
  yScrollContainer: HTMLElement | undefined;

  columns$ = computed(() => {
    return [
      {
        id: 'row-header',
        width: LEFT_TOOL_BAR_WIDTH,
      },
      ...this.view.properties$.value.map(property => ({
        id: property.id,
        width: property.width$.value + 1,
      })),
      {
        id: 'row-last',
        width: 40,
      },
    ];
  });

  groupTrait$ = computed(() => {
    return this.view.traitGet(groupTraitKey);
  });

  groups$ = computed(() => {
    const groupTrait = this.groupTrait$.value;
    if (!groupTrait?.groupsDataList$.value) {
      return [
        {
          id: '',
          rows: this.view.rowIds$.value,
        },
      ];
    }
    const groups = groupTrait.groupsDataList$.value.filter(
      (
        group
      ): group is NonNullable<
        (typeof groupTrait.groupsDataList$.value)[number]
      > => group != null
    );
    return groups.map(group => ({
      id: group.key,
      rows: this.groupCollapsed$(group.key).value
        ? []
        : group.rows.map(v => v.rowId),
    }));
  });

  private readonly collapsedGroups = new Map<string, Signal<boolean>>();

  /**
   * Collapsed state of a group, shared with the non-virtual table through
   * session storage.
   */
  groupCollapsed$(groupKey: string): Signal<boolean> {
    const key = groupKey || 'all';
    let collapsed = this.collapsedGroups.get(key);
    if (!collapsed) {
      collapsed = signal(getCollapsedState(this.view.id, key));
      this.collapsedGroups.set(key, collapsed);
    }
    return collapsed;
  }

  toggleGroupCollapsed(groupKey: string) {
    const collapsed$ = this.groupCollapsed$(groupKey);
    const next = !collapsed$.value;
    collapsed$.value = next;
    setCollapsedState(this.view.id, groupKey || 'all', next);
    if (next && this.selection$.value) {
      // Selection is index based; drop it rather than pointing at hidden rows.
      this.clearSelection();
    }
  }

  clearSelection = () => {
    this.selectionController.clear();
  };

  addRow = (position: InsertToPosition) => {
    if (this.view.readonly$.value) return;
    const rowId = this.view.rowAdd(position);
    if (rowId) {
      this.root.openDetailPanel({
        view: this.view,
        rowId,
      });
    }
    return rowId;
  };

  focusFirstCell = () => {
    this.selectionController.focusFirstCell();
  };

  showIndicator = (evt: MouseEvent) => {
    return this.dragController.showIndicator(evt) != null;
  };

  hideIndicator = () => {
    this.dragController.dropPreview.remove();
  };

  moveTo = (id: string, evt: MouseEvent) => {
    const result = this.dragController.getInsertPosition(evt);
    if (result) {
      const row = this.view.rowGetOrCreate(id);
      row.move(result.position, undefined, result.groupKey);
    }
  };

  onWheel = (event: WheelEvent) => {
    if (event.metaKey || event.ctrlKey) {
      return;
    }
    const ele = event.currentTarget;
    if (ele instanceof HTMLElement) {
      if (ele.scrollWidth === ele.clientWidth) {
        return;
      }
      event.stopPropagation();
    }
  };

  renderAddGroup = (groupHelper: GroupTrait) => {
    const addGroup = groupHelper.addGroup;
    if (!addGroup) {
      return;
    }
    const add = (e: MouseEvent) => {
      const ele = e.currentTarget as HTMLElement;
      popMenu(popupTargetFromElement(ele), {
        options: {
          items: [
            menu.input({
              onComplete: text => {
                const column = groupHelper.property$.value;
                if (column) {
                  column.dataUpdate(() =>
                    addGroup({
                      text,
                      oldData: column.data$.value,
                      dataSource: this.view.manager.dataSource,
                    })
                  );
                }
              },
            }),
          ],
        },
      });
    };
    return html` <div style="display:flex;">
      <div class="${dv.hover} ${dv.round8} ${styles.addGroup}" @click="${add}">
        <div class="${dv.icon16}" style="display:flex;">${AddCursorIcon()}</div>
        <div>New Group</div>
      </div>
    </div>`;
  };

  initVirtualScroll(yScrollContainer: HTMLElement, ui: TableViewUI) {
    const virtualScroll = new GridVirtualScroll<
      TableGroupData,
      TableRowData,
      TableCellData
    >({
      initGroupData: group => ({
        hover$: computed(() => {
          const headerHover = group.data.headerHover$.value;
          if (headerHover) {
            return true;
          }
          const footerHover = group.data.footerHover$.value;
          if (footerHover) {
            return true;
          }
          return group.rows$.value.some(row => row.data.hover$.value);
        }),
        headerHover$: signal(false),
        footerHover$: signal(false),
      }),
      initRowData: row => ({
        hover$: computed(() => {
          return row.cells$.value.some(cell => cell.data.hover$.value);
        }),
        selected$: computed(() => {
          const selection = this.selection$.value;
          if (!selection || selection.selectionType !== 'row') {
            return false;
          }
          const groupId = row.group.groupId;
          return TableViewRowSelection.includes(selection, {
            id: row.rowId,
            groupKey: groupId ? groupId : undefined,
          });
        }),
      }),
      initCellData: () => ({
        hover$: signal(false),
        selected$: signal(false),
      }),
      columns$: this.columns$,
      groups$: this.groups$,
      createCell: (cell, wrapper) => {
        if (cell.columnId === 'row-header') {
          wrapper.style.borderBottom = `1px solid ${cssVarV2.database.border}`;
          const rowHeader = new TableRowHeader();
          rowHeader.gridCell = cell;
          rowHeader.tableViewLogic = this;
          return rowHeader;
        }
        if (cell.columnId === 'row-last') {
          const rowLast = new TableRowLast();
          rowLast.gridCell = cell;
          rowLast.tableViewLogic = this;
          return rowLast;
        }
        const cellContainer = new DatabaseCellContainer();
        cellContainer.gridCell = cell;
        cellContainer.tableViewLogic = this;
        return cellContainer;
      },
      createGroup: {
        top: gridGroup => {
          const groupHeader = new TableGroupHeader();
          groupHeader.tableViewLogic = this;
          groupHeader.gridGroup = gridGroup;
          return groupHeader;
        },
        bottom: gridGroup => {
          const groupFooter = new TableGroupFooter();
          groupFooter.tableViewLogic = this;
          groupFooter.gridGroup = gridGroup;
          return groupFooter;
        },
      },
      fixedRowHeight$: signal(undefined),
      yScrollContainer,
    });

    this.yScrollContainer = yScrollContainer;

    this.virtualScroll$.value = virtualScroll;
    requestAnimationFrame(() => {
      if (virtualScroll) {
        virtualScroll.init();
        ui.disposables.add(() => virtualScroll.dispose());
      }
    });
  }

  renderer = createUniComponentFromWebComponent(TableViewUI);
}

export class TableViewUI extends DataViewUIBase<VirtualTableViewUILogic> {
  private renderTable() {
    return this.logic.virtualScroll$.value?.content;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.logic.ui$.value = this;
    const controllers = [
      this.logic.clipboardController,
      this.logic.dragController,
      this.logic.hotkeysController,
      this.logic.selectionController,
    ];
    controllers.forEach(controller => controller.hostConnected());
    // The logic (and its controllers) outlives this element when switching
    // views, so release the handlers registered for this host on disconnect;
    // otherwise they pile up every time the view is shown again.
    this.disposables.add(() => {
      controllers.forEach(controller => {
        controller.disposables.dispose();
        controller.disposables = new DisposableGroup();
      });
    });
    const scrollContainer = getScrollContainer(this, 'y') ?? document.body;
    this.logic.initVirtualScroll(scrollContainer, this);
    this.classList.add('affine-database-table', styles.tableView);
    this.dataset['testid'] = 'dv-table-view';
  }

  override render(): TemplateResult {
    const vPadding = this.logic.root.config.virtualPadding$.value;
    const wrapperStyle = styleMap({
      marginLeft: `-${vPadding}px`,
      marginRight: `-${vPadding}px`,
    });
    const containerStyle = styleMap({
      paddingLeft: `${vPadding}px`,
      paddingRight: `${vPadding}px`,
    });
    return html`
      ${
        this.logic.headerWidget
          ? renderUniLit(this.logic.headerWidget, {
              dataViewLogic: this.logic,
            })
          : ''
      }
      <div class="${styles.tableContainer}" style="${wrapperStyle}">
        <div class="${styles.tableBlockTable}" @wheel="${this.logic.onWheel}">
          <div class="${styles.tableContainer2}" style="${containerStyle}">
            ${
              this.logic.groupTrait$.value?.allHidden$.value
                ? html`<div class="${styles.groupsHiddenMessage}">
                    All groups are hidden
                  </div>`
                : this.renderTable()
            }
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dv-table-view-ui-virtual': TableViewUI;
  }
}
