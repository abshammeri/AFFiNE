import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import { PlusIcon } from '@blocksuite/icons/lit';
import { ShadowlessElement } from '@blocksuite/std';
import { computed } from '@preact/signals-core';
import { html, nothing } from 'lit';
import { property } from 'lit/decorators.js';

import { TableViewAreaSelection } from '../../../selection';
import type { VirtualTableViewUILogic } from '../../table-view-ui-logic';
import type { TableGridGroup } from '../../types';
import * as styles from './group-footer-css';

export class TableGroupFooter extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  @property({ attribute: false })
  accessor tableViewLogic!: VirtualTableViewUILogic;

  @property({ attribute: false })
  accessor gridGroup!: TableGridGroup;

  group$ = computed(() => {
    const groups =
      this.tableViewLogic.groupTrait$.value?.groupsDataList$.value ?? [];
    return groups
      .filter((group): group is NonNullable<typeof group> => group != null)
      .find(g => g.key === this.gridGroup.groupId);
  });

  get selectionController() {
    return this.tableViewLogic.selectionController;
  }

  get tableViewManager() {
    return this.tableViewLogic.view;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.classList.add(styles.groupFooter);
    // A collapsed group renders an empty footer. Keep a non-zero width so the
    // virtual wrapper's ResizeObserver still reports its (0px) height; a 0x0
    // element never gets an initial observation, which would leave the
    // group's bottom unknown and stop every following group from rendering.
    this.style.minWidth = '1px';
    this.disposables.addFromEvent(this, 'mouseenter', () => {
      this.gridGroup.data.footerHover$.value = true;
    });
    this.disposables.addFromEvent(this, 'mouseleave', () => {
      this.gridGroup.data.footerHover$.value = false;
    });
  }

  private readonly clickAddRow = () => {
    const group = this.group$.value;
    const rowId = this.tableViewManager.rowAdd('end', group?.key);
    this.requestUpdate();

    requestAnimationFrame(() => {
      const rowIndex = this.selectionController.getRow(group?.key, rowId)
        ?.rowIndex$.value;
      if (rowIndex == null) return;
      const index = this.tableViewManager.properties$.value.findIndex(
        v => v.type$.value === 'title'
      );

      this.selectionController.selection = undefined;

      requestAnimationFrame(() => {
        this.selectionController.selection = TableViewAreaSelection.create({
          groupKey: group?.key,
          focus: {
            rowIndex: rowIndex,
            columnIndex: index,
          },
          isEditing: true,
        });
      });
    });
  };

  override render() {
    if (
      this.group$.value &&
      this.tableViewLogic.groupCollapsed$(this.gridGroup.groupId).value
    ) {
      return nothing;
    }
    return html`
      ${
        this.tableViewManager.readonly$.value
          ? null
          : html`
              <div
                class="${styles.addRowWrapper} dv-hover"
                @click="${this.clickAddRow}"
              >
                <div
                  class="${styles.addRowButton} dv-icon-16"
                  data-test-id="affine-database-add-row-button"
                  role="button"
                >
                  ${PlusIcon()}<span class="${styles.addRowText}"
                    >New Record</span
                  >
                </div>
              </div>
            `
      }
      <affine-database-virtual-column-stats
        .view="${this.tableViewManager}"
        .group="${this.group$.value}"
      ></affine-database-virtual-column-stats>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'virtual-table-group-footer': TableGroupFooter;
  }
}
