import { popupTargetFromElement } from '@blocksuite/affine-components/context-menu';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import { CenterPeekIcon, MoreHorizontalIcon } from '@blocksuite/icons/lit';
import { ShadowlessElement } from '@blocksuite/std';
import { computed, effect, signal } from '@preact/signals-core';
import { css, html, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import { renderUniLit } from '../../../../core';
import type {
  CellRenderProps,
  DataViewCellLifeCycle,
} from '../../../../core/property';
import { isLinkClick } from '../../../../core/utils/event.js';
import {
  TableViewAreaSelection,
  TableViewRowSelection,
  type TableViewSelectionWithType,
} from '../../selection';
import type { VirtualTableViewUILogic } from '../table-view-ui-logic';
import type { TableGridCell } from '../types';
import { openDetail, popRowMenu } from './menu';
import { rowSelectedBg } from './row-header-css';
export class DatabaseCellContainer extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    affine-database-virtual-cell-container {
      position: relative;
      display: flex;
      align-items: start;
      width: 100%;
      border: none;
      outline: none;
      box-sizing: content-box;
    }

    affine-database-virtual-cell-container * {
      box-sizing: border-box;
    }

    affine-database-virtual-cell-container uni-lit > *:first-child {
      padding: 6px;
    }

    .dv-virtual-row-ops {
      position: absolute;
      top: 4px;
      right: 8px;
      display: flex;
      gap: 4px;
      cursor: pointer;
      z-index: 1;
    }

    .dv-virtual-row-op {
      display: flex;
      padding: 4px;
      border-radius: 4px;
      box-shadow: var(--affine-button-shadow);
      background-color: var(--affine-background-primary-color);
      position: relative;
    }

    .dv-virtual-row-op:hover:before {
      content: '';
      border-radius: 4px;
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      background-color: var(--affine-hover-color);
    }

    .dv-virtual-row-op svg {
      fill: var(--affine-icon-color);
      color: var(--affine-icon-color);
      width: 16px;
      height: 16px;
    }

    @media print {
      .dv-virtual-row-ops {
        display: none;
      }
    }
  `;

  private readonly _cell = signal<DataViewCellLifeCycle>();

  cell$ = computed(() => {
    return this.view.cellGetOrCreate(this.rowId, this.columnId);
  });

  selectCurrentCell = (editing: boolean) => {
    if (this.view.readonly$.value) {
      return;
    }
    const selectionView = this.selectionView;
    if (selectionView) {
      const selection = selectionView.selection;
      if (
        editing &&
        selection?.selectionType === 'area' &&
        selection.isEditing &&
        this.isSelected(selection)
      ) {
        // Already editing this cell.
        return;
      }
      // Enter edit mode directly (Notion-like single click editing). Cells
      // that are not editable inline (e.g. checkbox) handle the click in
      // `beforeEnterEditMode` and return false, so they only get selected.
      const shouldEnterEditMode =
        editing && this.cell?.beforeEnterEditMode() !== false;
      selectionView.selection = TableViewAreaSelection.create({
        groupKey: this.groupKey,
        focus: {
          rowIndex: this.rowIndex$.value,
          columnIndex: this.columnIndex$.value,
        },
        isEditing: shouldEnterEditMode,
      });
    }
  };

  get cell(): DataViewCellLifeCycle | undefined {
    return this._cell.value;
  }

  private get selectionView() {
    return this.tableViewLogic.selectionController;
  }

  get rowSelected$() {
    return this.gridCell.row.data.selected$;
  }

  contextMenu = (e: MouseEvent) => {
    if (this.view.readonly$.value) {
      return;
    }
    const selection = this.selectionView;
    if (!selection) {
      return;
    }
    e.preventDefault();
    const row = { id: this.rowId, groupKey: this.groupKey };
    if (!TableViewRowSelection.includes(selection.selection, row)) {
      selection.selection = TableViewRowSelection.create({
        rows: [row],
      });
    }
    popRowMenu(this.tableViewLogic, popupTargetFromElement(this), selection);
  };

  override connectedCallback() {
    super.connectedCallback();
    this.disposables.addFromEvent(this, 'contextmenu', this.contextMenu);
    this.disposables.addFromEvent(this.parentElement, 'click', e => {
      if (!this.isEditing$.value) {
        this.selectCurrentCell(
          !this.column$.value?.readonly$.value && !isLinkClick(e)
        );
      }
    });
    this.disposables.addFromEvent(this.parentElement, 'mouseenter', () => {
      this.gridCell.data.hover$.value = true;
    });
    this.disposables.addFromEvent(this.parentElement, 'mouseleave', () => {
      this.gridCell.data.hover$.value = false;
    });
    this.disposables.add(
      effect(() => {
        const rowSelected = this.rowSelected$.value;
        if (rowSelected) {
          this.parentElement?.classList.add(rowSelectedBg);
        } else {
          this.parentElement?.classList.remove(rowSelectedBg);
        }
      })
    );
    const style = this.parentElement?.style;
    if (style) {
      style.borderBottom = '1px solid var(--affine-border-color)';
      style.borderRight = '1px solid var(--affine-border-color)';
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    // Virtualized cells can be removed while hovered, in which case no
    // `mouseleave` fires; don't leave the row stuck in the hovered state.
    this.gridCell.data.hover$.value = false;
  }

  isRowSelected$ = computed(() => {
    const selection = this.selectionView?.selection;
    if (selection?.selectionType !== 'row') {
      return false;
    }
    return selection.rows.some(row => row.id === this.rowId);
  });

  isSelected(selection: TableViewSelectionWithType) {
    if (selection.selectionType !== 'area') {
      return false;
    }
    if (selection.groupKey !== this.groupKey) {
      return false;
    }
    if (selection.focus.columnIndex !== this.columnIndex$.value) {
      return false;
    }
    return selection.focus.rowIndex === this.rowIndex$.value;
  }

  private readonly selectThisRow = () => {
    const row = { id: this.rowId, groupKey: this.groupKey };
    const selection = this.selectionView.selection;
    if (!TableViewRowSelection.includes(selection, row)) {
      this.selectionView.selection = TableViewRowSelection.create({
        rows: [row],
      });
    }
  };

  private readonly clickOpenDetail = (e: MouseEvent) => {
    e.stopPropagation();
    this.selectionView.selection = TableViewRowSelection.create({
      rows: [{ id: this.rowId, groupKey: this.groupKey }],
    });
    openDetail(this.tableViewLogic, this.rowId, this.selectionView);
  };

  private readonly clickRowMenu = (e: MouseEvent) => {
    e.stopPropagation();
    const ele = e.currentTarget as HTMLElement;
    this.selectThisRow();
    popRowMenu(
      this.tableViewLogic,
      popupTargetFromElement(ele),
      this.selectionView
    );
  };

  /**
   * Peek / more buttons on the title cell, shown while hovering the row
   * (mirrors the row ops of the non-virtual table).
   */
  private renderRowOps() {
    const column = this.column$.value;
    if (
      !column ||
      column.readonly$.value ||
      this.view.mainProperties$.value.titleColumn !== this.columnId ||
      !this.gridCell.row.data.hover$.value ||
      this.isEditing$.value
    ) {
      return nothing;
    }
    return html`<div class="dv-virtual-row-ops">
      <div
        class="dv-virtual-row-op"
        data-testid="dv-row-open-detail"
        @click="${this.clickOpenDetail}"
      >
        ${CenterPeekIcon()}
      </div>
      ${
        this.view.readonly$.value
          ? nothing
          : html`<div class="dv-virtual-row-op" @click="${this.clickRowMenu}">
              ${MoreHorizontalIcon()}
            </div>`
      }
    </div>`;
  }

  override render() {
    const renderer = this.column$.value?.renderer$.value;
    if (!renderer) {
      return;
    }
    const { view } = renderer;
    this.view.lockRows(this.isEditing$.value);
    this.dataset['editing'] = `${this.isEditing$.value}`;
    const props: CellRenderProps = {
      cell: this.cell$.value,
      isEditing$: this.isEditing$,
      selectCurrentCell: this.selectCurrentCell,
    };

    return html`${renderUniLit(view, props, {
      ref: this._cell,
      style: {
        display: 'contents',
      },
    })}${this.renderRowOps()}`;
  }

  private _tagDraft: string | undefined;

  setTagDraft(value: string) {
    this._tagDraft = value;
  }

  consumeTagDraft(): string | undefined {
    const value = this._tagDraft;
    this._tagDraft = undefined;
    return value;
  }

  isEditing$ = signal(false);

  rowIndex$ = computed(() => {
    return this.gridCell.rowIndex$.value;
  });

  columnIndex$ = computed(() => {
    return this.gridCell.columnIndex$.value - 1;
  });

  column$ = computed(() => {
    return this.view.properties$.value.find(
      property => property.id === this.columnId
    );
  });

  get rowId() {
    return this.gridCell.row.rowId;
  }

  get columnId() {
    return this.gridCell.columnId;
  }

  get groupKey() {
    return this.gridCell.row.group.groupId;
  }

  @property({ attribute: false })
  accessor gridCell!: TableGridCell;

  @property({ attribute: false })
  accessor tableViewLogic!: VirtualTableViewUILogic;

  get view() {
    return this.tableViewLogic.view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-database-virtual-cell-container': DatabaseCellContainer;
  }
}
