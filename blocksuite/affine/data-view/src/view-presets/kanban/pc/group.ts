import {
  menu,
  popFilterableSimpleMenu,
  popupTargetFromElement,
} from '@blocksuite/affine-components/context-menu';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import { AddCursorIcon } from '@blocksuite/icons/lit';
import { ShadowlessElement } from '@blocksuite/std';
import { signal } from '@preact/signals-core';
import { css, nothing } from 'lit';
import { property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { html } from 'lit/static-html.js';

import { GroupTitle } from '../../../core/group-by/group-title.js';
import type { Group } from '../../../core/group-by/trait.js';
import { dragHandler } from '../../../core/utils/wc-dnd/dnd-context.js';
import type { Row } from '../../../core/view-manager/row.js';
import { KANBAN_GROUP_PAGE_SIZE } from '../consts.js';
import type { KanbanViewUILogic } from './kanban-view-ui-logic.js';

const styles = css`
  affine-data-view-kanban-group {
    width: 260px;
    flex-shrink: 0;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
  }

  .group-header {
    height: 32px;
    padding: 6px 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    overflow: hidden;
  }

  .group-header-title {
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--data-view-cell-text-size);
  }

  affine-data-view-kanban-group:hover .group-header-op {
    visibility: visible;
    opacity: 1;
  }

  .group-body {
    margin-top: 4px;
    display: flex;
    flex-direction: column;
    padding: 0 4px;
    gap: 12px;
  }

  .add-card {
    display: flex;
    align-items: center;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    font-size: var(--data-view-cell-text-size);
    line-height: var(--data-view-cell-text-line-height);
    visibility: hidden;
    opacity: 0;
    transition: all 150ms cubic-bezier(0.42, 0, 1, 1);
    color: var(--affine-text-secondary-color);
  }

  affine-data-view-kanban-group:hover .add-card {
    visibility: visible;
    opacity: 1;
  }

  affine-data-view-kanban-group .add-card:hover {
    background-color: var(--affine-hover-color);
    color: var(--affine-text-primary-color);
  }

  .kanban-show-more {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
    cursor: pointer;
    font-size: var(--data-view-cell-text-size);
    line-height: var(--data-view-cell-text-line-height);
    color: var(--affine-text-secondary-color);
    user-select: none;
    transition: all 150ms cubic-bezier(0.42, 0, 1, 1);
  }

  .kanban-show-more:hover {
    background-color: var(--affine-hover-color);
    color: var(--affine-text-primary-color);
  }

  .sortable-ghost {
    background-color: var(--affine-hover-color);
    opacity: 0.5;
  }

  .sortable-drag {
    background-color: var(--affine-background-primary-color);
  }
`;

export class KanbanGroup extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = styles;

  /** Number of cards (from the top of the column) that are rendered. */
  readonly visibleLimit$ = signal(KANBAN_GROUP_PAGE_SIZE);

  /**
   * Cards that are rendered even though they are past the limit, e.g. a card
   * the user just added at the end of a long column.
   */
  readonly revealedCards$ = signal<ReadonlySet<string>>(new Set());

  private visibleCards(rows: Row[]) {
    const limit = this.visibleLimit$.value;
    if (rows.length <= limit) {
      return rows;
    }
    const revealed = this.revealedCards$.value;
    return rows.filter(
      (row, index) => index < limit || revealed.has(row.rowId)
    );
  }

  /** Keep a card rendered even if it is past the visible limit. */
  revealCard(cardId: string) {
    if (this.revealedCards$.value.has(cardId)) return;
    this.revealedCards$.value = new Set([...this.revealedCards$.value, cardId]);
  }

  private readonly showMore = () => {
    this.visibleLimit$.value += KANBAN_GROUP_PAGE_SIZE;
  };

  /** Whether some cards of this column are not rendered. */
  get isTruncated() {
    return this.visibleCards(this.group.rows).length < this.group.rows.length;
  }

  private readonly clickAddCard = () => {
    const id = this.view.addCard('end', this.group.key);
    if (id && this.group.rows.length >= this.visibleLimit$.value) {
      this.revealCard(id);
    }
    requestAnimationFrame(() => {
      const columnId =
        this.view.mainProperties$.value.titleColumn ||
        this.view.propertyIds$.value[0];
      if (!columnId) return;
      this.kanbanViewLogic.selectionController.selection = {
        selectionType: 'cell',
        groupKey: this.group.key,
        cardId: id,
        columnId,
        isEditing: true,
      };
    });
    this.requestUpdate();
  };

  private readonly clickAddCardInStart = () => {
    const id = this.view.addCard('start', this.group.key);
    requestAnimationFrame(() => {
      const columnId =
        this.view.mainProperties$.value.titleColumn ||
        this.view.propertyIds$.value[0];
      if (!columnId) return;
      this.kanbanViewLogic.selectionController.selection = {
        selectionType: 'cell',
        groupKey: this.group.key,
        cardId: id,
        columnId,
        isEditing: true,
      };
    });
    this.requestUpdate();
  };

  private readonly clickGroupOptions = (e: MouseEvent) => {
    const ele = e.currentTarget as HTMLElement;
    popFilterableSimpleMenu(popupTargetFromElement(ele), [
      menu.action({
        name: 'Ungroup',
        hide: () => this.group.value == null,
        select: () => {
          this.group.rows.forEach(row => {
            this.group.manager.removeFromGroup(row.rowId, this.group.key);
          });
          this.requestUpdate();
        },
      }),
      menu.action({
        name: 'Delete Cards',
        select: () => {
          this.view.rowsDelete(this.group.rows.map(row => row.rowId));
          this.requestUpdate();
        },
      }),
    ]);
  };

  private renderShowMore(hiddenCount: number) {
    if (hiddenCount <= 0) {
      return nothing;
    }
    const next = Math.min(hiddenCount, KANBAN_GROUP_PAGE_SIZE);
    return html`<div
      class="kanban-show-more"
      role="button"
      data-testid="kanban-show-more"
      title="${hiddenCount} more ${hiddenCount === 1 ? 'card' : 'cards'}"
      @click="${this.showMore}"
    >
      Show ${next} more
    </div>`;
  }

  override render() {
    const rows = this.group.rows;
    const cards = this.visibleCards(rows);
    const hiddenCount = rows.length - cards.length;
    return html`
      <div class="group-header" ${dragHandler(this.group.key)}>
        ${GroupTitle(this.group, {
          readonly: this.view.readonly$.value,
          clickAdd: this.clickAddCardInStart,
          clickOps: this.clickGroupOptions,
        })}
      </div>
      <div class="group-body">
        ${repeat(
          cards,
          row => row.rowId,
          row => {
            return html`
              <affine-data-view-kanban-card
                data-card-id="${row.rowId}"
                .groupKey="${this.group.key}"
                .kanbanViewLogic="${this.kanbanViewLogic}"
                .cardId="${row.rowId}"
              ></affine-data-view-kanban-card>
            `;
          }
        )}
        ${this.renderShowMore(hiddenCount)}
        ${
          this.view.readonly$.value
            ? nothing
            : html`<div class="add-card" @click="${this.clickAddCard}">
                <div
                  style="margin-right: 4px;width: 16px;height: 16px;display:flex;align-items:center;"
                >
                  ${AddCursorIcon()}
                </div>
                Add
              </div>`
        }
      </div>
    `;
  }

  @property({ attribute: false })
  accessor group!: Group;

  @property({ attribute: false })
  accessor kanbanViewLogic!: KanbanViewUILogic;

  get view() {
    return this.kanbanViewLogic.view;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-data-view-kanban-group': KanbanGroup;
  }
}
