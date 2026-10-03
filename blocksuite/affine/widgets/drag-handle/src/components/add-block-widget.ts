import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import { PlusIcon } from '@blocksuite/icons/lit';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import type { AFFINE_ADD_BLOCK_WIDGET } from '../consts.js';

export class AffineAddBlockWidget extends LitElement {
  static override styles = css`
    :host {
      display: block;
      pointer-events: none;
    }

    .affine-add-block-widget {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 24px;
      cursor: pointer;
      border-radius: 4px;
      color: ${unsafeCSSVarV2('icon/secondary')};
      background: transparent;
      border: none;
      padding: 0;
      transition:
        color 0.12s ease,
        background 0.12s ease;
      animation: affine-add-block-fade-in 120ms ease-out;
      pointer-events: auto;
      user-select: none;
      box-sizing: border-box;
    }

    .affine-add-block-widget:hover {
      background: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
      color: var(--affine-text-primary-color);
    }

    @keyframes affine-add-block-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .affine-add-block-widget svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  `;

  @property({ type: Boolean })
  accessor visible = false;

  private readonly _handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent('add-block', { bubbles: true, composed: true })
    );
  };

  override render() {
    if (!this.visible) return html``;

    return html`
      <button
        class="affine-add-block-widget"
        title="Click to add a block below"
        aria-label="Add block below"
        @click=${this._handleClick}
      >
        ${PlusIcon({ width: '16', height: '16' })}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_ADD_BLOCK_WIDGET]: AffineAddBlockWidget;
  }
}
