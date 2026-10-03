// related component

import type { InsertToPosition } from '@blocksuite/affine-shared/utils';
import { DisposableGroup } from '@blocksuite/global/disposable';
import type { ReactiveController } from 'lit';

import { startDrag } from '../../../../core/utils/drag.js';
import type { TableRowHeader } from '../row/row-header.js';
import type { VirtualTableViewUILogic } from '../table-view-ui-logic';
import type { TableGridRow } from '../types.js';

/** Class of the row drag handle rendered by `TableRowHeader`. */
export const VIRTUAL_ROW_DRAG_HANDLER_CLASS = 'dv-virtual-row-drag-handler';

export class TableDragController implements ReactiveController {
  disposables = new DisposableGroup();

  dragStart = (row: TableGridRow, evt: PointerEvent) => {
    const rowRect = this.getRowClientRect(row);
    if (!rowRect) {
      return;
    }
    const offsetLeft = evt.x - rowRect.left;
    const offsetTop = evt.y - rowRect.top;
    const preview = createDragPreview(row, rowRect);
    preview.display(evt.x - offsetLeft, evt.y - offsetTop);
    const fromGroup = row.group.groupId || undefined;
    const rowId = row.rowId;

    startDrag<
      | undefined
      | {
          type: 'self';
          groupKey?: string;
          position: InsertToPosition;
        }
      | { type: 'out'; callback: () => void },
      PointerEvent
    >(evt, {
      onDrag: () => undefined,
      onMove: evt => {
        preview.display(evt.x - offsetLeft, evt.y - offsetTop);
        if (!this.host?.contains(evt.target as Node)) {
          const callback = this.logic.root.config.onDrag;
          if (callback) {
            this.dropPreview.remove();
            return {
              type: 'out',
              callback: callback(evt, rowId),
            };
          }
          return;
        }
        const result = this.showIndicator(evt);
        if (result) {
          return {
            type: 'self',
            groupKey: result.groupKey,
            position: result.position,
          };
        }
        return;
      },
      onClear: () => {
        preview.remove();
        this.dropPreview.remove();
      },
      onDrop: result => {
        if (!result) {
          return;
        }
        if (result.type === 'out') {
          result.callback();
          return;
        }
        if (result.type === 'self') {
          if (
            typeof result.position === 'object' &&
            result.position.id === rowId
          ) {
            return;
          }
          const viewRow = this.logic.view.rowGetOrCreate(rowId);
          viewRow.move(result.position, fromGroup, result.groupKey);
        }
      },
    });
  };

  dropPreview = createDropPreview();

  private getRowClientRect(row: TableGridRow) {
    const content = this.logic.virtualScroll$.value?.content;
    const top = row.top$.value;
    const bottom = row.bottom$.value;
    if (!content || top == null || bottom == null) {
      return;
    }
    const contentRect = content.getBoundingClientRect();
    const hostRect = this.host?.getBoundingClientRect();
    const left = Math.max(contentRect.left, hostRect?.left ?? contentRect.left);
    const right = Math.min(
      contentRect.right,
      hostRect?.right ?? contentRect.right
    );
    return {
      top: contentRect.top + top,
      bottom: contentRect.top + bottom,
      left,
      width: Math.max(0, right - left),
    };
  }

  /**
   * Drop position computed from the virtual layout (rows may not be in the
   * DOM, so we can't query row elements like the non-virtual table does).
   */
  getInsertPosition = (
    evt: MouseEvent
  ):
    | {
        groupKey: string | undefined;
        position: InsertToPosition;
        y: number;
        width: number;
        x: number;
      }
    | undefined => {
    const virtualScroll = this.logic.virtualScroll$.value;
    if (!virtualScroll) {
      return;
    }
    const y = evt.y;
    for (const group of virtualScroll.groups$.value) {
      const rows = group.rows$.value;
      const firstRect = rows[0] ? this.getRowClientRect(rows[0]) : undefined;
      if (!firstRect || y < firstRect.top) {
        continue;
      }
      for (const row of rows) {
        const rect = this.getRowClientRect(row);
        if (!rect) {
          break;
        }
        if (y < rect.bottom) {
          const mid = (rect.top + rect.bottom) / 2;
          return {
            groupKey: group.groupId || undefined,
            position: {
              id: row.rowId,
              before: y < mid,
            },
            y: y < mid ? rect.top : rect.bottom,
            width: rect.width,
            x: rect.left,
          };
        }
      }
    }
    return;
  };

  showIndicator = (evt: MouseEvent) => {
    const position = this.getInsertPosition(evt);
    if (position) {
      this.dropPreview.display(position.x, position.y, position.width);
    } else {
      this.dropPreview.remove();
    }
    return position;
  };

  constructor(private readonly logic: VirtualTableViewUILogic) {}

  get host() {
    return this.logic.ui$.value;
  }

  hostConnected() {
    this.disposables.add(
      this.logic.handleEvent('dragStart', context => {
        if (this.logic.view.readonly$.value) {
          return;
        }
        const event = context.get('pointerState').raw;
        const target = event.target;
        if (
          target instanceof Element &&
          this.host?.contains(target) &&
          target.closest(`.${VIRTUAL_ROW_DRAG_HANDLER_CLASS}`)
        ) {
          const rowHeader = target.closest<TableRowHeader>(
            'data-view-table-row-header'
          );
          const row = rowHeader?.gridCell?.row;
          if (row) {
            event.preventDefault();
            getSelection()?.removeAllRanges();
            this.dragStart(row, event);
            return true;
          }
        }
        return false;
      })
    );
  }
}

/**
 * A lightweight ghost of the dragged row. Cells are rendered from their text
 * content so we don't have to re-create cell components for the preview.
 */
const createDragPreview = (
  row: TableGridRow,
  rect: { width: number; top: number; bottom: number }
) => {
  const div = document.createElement('div');
  div.className = 'with-data-view-css-variable';
  Object.assign(div.style, {
    width: `${rect.width}px`,
    height: `${rect.bottom - rect.top}px`,
    position: 'fixed',
    pointerEvents: 'none',
    opacity: '0.5',
    backgroundColor: 'var(--affine-background-primary-color)',
    boxShadow: 'var(--affine-shadow-2)',
    zIndex: '9999',
    display: 'flex',
    overflow: 'hidden',
    fontSize: 'var(--data-view-cell-text-size, 14px)',
    color: 'var(--affine-text-primary-color)',
  });
  for (const cell of row.cells$.value) {
    const cellDiv = document.createElement('div');
    Object.assign(cellDiv.style, {
      width: `${cell.width$.value ?? 0}px`,
      flexShrink: '0',
      padding: '6px 8px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      borderRight:
        cell.columnId === 'row-header' || cell.columnId === 'row-last'
          ? 'none'
          : '1px solid var(--affine-border-color)',
    });
    if (cell.columnId !== 'row-header' && cell.columnId !== 'row-last') {
      cellDiv.textContent = cell.element.textContent?.trim() ?? '';
    }
    div.append(cellDiv);
  }
  document.body.append(div);
  return {
    display(x: number, y: number) {
      div.style.left = `${Math.round(x)}px`;
      div.style.top = `${Math.round(y)}px`;
    },
    remove() {
      div.remove();
    },
  };
};

const createDropPreview = () => {
  const div = document.createElement('div');
  div.dataset.isDropPreview = 'true';
  div.style.pointerEvents = 'none';
  div.style.position = 'fixed';
  div.style.zIndex = '9999';
  div.style.height = '2px';
  div.style.borderRadius = '1px';
  div.style.backgroundColor = 'var(--affine-primary-color)';
  div.style.boxShadow = '0px 0px 8px 0px rgba(30, 150, 235, 0.35)';
  return {
    display(x: number, y: number, width: number) {
      document.body.append(div);
      div.style.left = `${x}px`;
      div.style.top = `${y - 2}px`;
      div.style.width = `${width}px`;
    },
    remove() {
      div.remove();
    },
  };
};
