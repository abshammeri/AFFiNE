import {
  menu,
  popMenu,
  popupTargetFromElement,
} from '@blocksuite/affine-components/context-menu';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import { PlusIcon } from '@blocksuite/icons/lit';
import { ShadowlessElement } from '@blocksuite/std';
import { css } from '@emotion/css';
import { effect } from '@preact/signals-core';
import { nothing } from 'lit';
import { property, query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { html } from 'lit/static-html.js';

import { renderUniLit } from '../../../../../../core';
import { createDndContext } from '../../../../../../core/utils/wc-dnd/dnd-context';
import { defaultActivators } from '../../../../../../core/utils/wc-dnd/sensors/index';
import { linearMove } from '../../../../../../core/utils/wc-dnd/utils/linear-move';
import { LEFT_TOOL_BAR_WIDTH } from '../../../../consts';
import { cellDivider } from '../../../../styles';
import type { VirtualTableViewUILogic } from '../../../table-view-ui-logic';
import type { TableGridGroup } from '../../../types';
import * as styles from './column-header-css';
import { DatabaseHeaderColumn } from './single-column-header';
import { getVerticalIndicator } from './vertical-indicator';
const leftBarStyle = css({
  width: LEFT_TOOL_BAR_WIDTH,
});
export class VirtualTableHeader extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  private readonly _onAddColumn = (e: MouseEvent) => {
    if (this.readonly) return;
    const ele = e.currentTarget as HTMLElement;
    popMenu(popupTargetFromElement(ele), {
      options: {
        title: {
          text: 'Property type',
        },
        items: [
          menu.group({
            items: this.tableViewManager.propertyMetas$.value.map(config => {
              return menu.action({
                name: config.config.name,
                prefix: renderUniLit(config.renderer.icon),
                select: () => {
                  const id = this.tableViewManager.propertyAdd('end', {
                    type: config.type,
                    name: config.config.name,
                  });
                  if (id) {
                    requestAnimationFrame(() => {
                      ele.scrollIntoView({
                        block: 'nearest',
                        inline: 'nearest',
                      });
                      this.openPropertyMenuById(id);
                    });
                  }
                },
              });
            }),
          }),
        ],
      },
    });
  };

  openPropertyMenuById = (id: string) => {
    const column = this.querySelectorAll('virtual-database-header-column');
    for (const item of column) {
      if (item.dataset.columnId === id) {
        item.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        item.editTitle();
        return;
      }
    }
  };

  private get readonly() {
    return this.tableViewManager.readonly$.value;
  }

  /**
   * Drag a column header to reorder columns (same behaviour as the
   * non-virtual table, which owns its dnd context in each table group).
   */
  dndContext = createDndContext({
    activators: defaultActivators,
    container: this,
    modifiers: [
      ({ transform }) => {
        return {
          ...transform,
          y: 0,
        };
      },
    ],
    onDragEnd: ({ over, active }) => {
      if (this.readonly) return;
      if (over && over.id !== active.id) {
        const properties = this.tableViewManager.properties$.value;
        const activeIndex = properties.findIndex(data => data.id === active.id);
        const overIndex = properties.findIndex(data => data.id === over.id);
        this.tableViewManager.propertyGetOrCreate(active.id).move({
          before: activeIndex > overIndex,
          id: over.id,
        });
      }
    },
    collisionDetection: linearMove(true),
    createOverlay: active => {
      if (this.readonly) return;
      const column = this.tableViewManager.propertyGetOrCreate(active.id);
      const preview = new DatabaseHeaderColumn();
      preview.column = column;
      preview.tableViewLogic = this.tableViewLogic;
      preview.classList.add(styles.column, styles.cell);
      Object.assign(preview.style, {
        position: 'fixed',
        zIndex: '999',
        pointerEvents: 'none',
        width: `${active.rect.width}px`,
        height: `${active.rect.height}px`,
        top: `${active.rect.top}px`,
        left: `${active.rect.left}px`,
        backgroundColor: 'var(--affine-background-primary-color)',
        boxShadow: 'var(--affine-shadow-2)',
        opacity: '0.9',
      });
      document.body.append(preview);
      return {
        overlay: preview,
        cleanup: () => {
          preview.remove();
        },
      };
    },
  });

  private showIndicator() {
    const indicator = getVerticalIndicator();
    this.disposables.add(
      effect(() => {
        const active = this.dndContext.active$.value;
        const over = this.dndContext.over$.value;
        if (!active || !over) {
          indicator.remove();
          return;
        }
        const scrollX = this.dndContext.scrollOffset$.value.x;
        const content = this.tableViewLogic.virtualScroll$.value?.content;
        const rowsBottom = this.gridGroup?.lastRowBottom$.value;
        const bottom =
          content && rowsBottom != null
            ? content.getBoundingClientRect().top + rowsBottom
            : this.getBoundingClientRect().bottom;
        const left =
          over.rect.left < active.rect.left ? over.rect.left : over.rect.right;
        indicator.display(
          left - scrollX,
          over.rect.top,
          Math.max(bottom - over.rect.top, over.rect.height)
        );
      })
    );
    this.disposables.add(() => {
      if (this.dndContext.active$.peek()) {
        indicator.remove();
      }
    });
  }

  override connectedCallback() {
    super.connectedCallback();
    this.classList.add(styles.columnHeaderContainer);
    this.showIndicator();
  }

  override render() {
    return html`
      <div class="${styles.columnHeader} database-row">
        ${this.readonly ? nothing : html` <div class="${leftBarStyle}"></div>`}
        ${repeat(
          this.tableViewManager.properties$.value,
          column => column.id,
          (column, index) => {
            const style = styleMap({
              width: `${column.width$.value}px`,
              border: index === 0 ? 'none' : undefined,
            });
            return html`
              <virtual-database-header-column
                style="${style}"
                data-column-id="${column.id}"
                data-column-index="${index}"
                class="${styles.column} ${styles.cell}"
                .column="${column}"
                .tableViewLogic="${this.tableViewLogic}"
              ></virtual-database-header-column>
              <div class="${cellDivider}" style="height: auto;"></div>
            `;
          }
        )}
        <div
          @click="${this._onAddColumn}"
          class="${styles.headerAddColumnButton}"
        >
          ${PlusIcon()}
        </div>
        <div class="scale-div" style="width: 1px;height: 1px;"></div>
      </div>
    `;
  }

  @query('.scale-div')
  accessor scaleDiv!: HTMLDivElement;

  @property({ attribute: false })
  accessor tableViewLogic!: VirtualTableViewUILogic;

  @property({ attribute: false })
  accessor gridGroup: TableGridGroup | undefined = undefined;

  get tableViewManager() {
    return this.tableViewLogic.view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtual-table-header': VirtualTableHeader;
  }
}
