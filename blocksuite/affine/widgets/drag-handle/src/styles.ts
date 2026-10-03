import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import { css } from 'lit';

import {
  ADD_BLOCK_WIDGET_WIDTH,
  DRAG_HANDLE_CONTAINER_WIDTH,
  DRAG_HANDLE_FADE_IN_DURATION,
} from './config.js';

export const styles = css`
  .affine-drag-handle-widget {
    display: flex;
    position: absolute;
    left: 0;
    top: 0;
    contain: size layout;
    pointer-events: none;
  }

  .affine-add-block-widget-container {
    top: 0;
    left: 0;
    position: absolute;
    display: flex;
    justify-content: center;
    width: ${ADD_BLOCK_WIDGET_WIDTH}px;
    min-height: 12px;
    pointer-events: none;
    user-select: none;
    box-sizing: border-box;
  }

  .affine-drag-handle-container {
    top: 0;
    left: 0;
    position: absolute;
    display: flex;
    justify-content: center;
    width: ${DRAG_HANDLE_CONTAINER_WIDTH}px;
    min-height: 12px;
    pointer-events: auto;
    user-select: none;
    box-sizing: border-box;
  }
  .affine-drag-handle-container:hover {
    cursor: grab;
  }

  .affine-drag-handle-grabber {
    width: 4px;
    height: 100%;
    border-radius: 1px;
    background: var(--affine-placeholder-color);
    transition: width 0.25s ease;
  }

  .affine-drag-handle-grabber.dots {
    width: 14px;
    height: 26px;
    box-sizing: border-box;
    padding: 5px 2px;
    border-radius: 4px;
    gap: 2px;
    display: flex;
    flex-wrap: wrap;
    background-color: transparent;
    transform: translateX(-100%);
    transition: unset;
  }

  .affine-drag-handle-grabber.dots:hover {
    background-color: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
  }

  .affine-drag-handle-grabber.grip {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border-radius: 4px;
    background-color: transparent;
    color: ${unsafeCSSVarV2('icon/secondary')};
    transition: background-color ${DRAG_HANDLE_FADE_IN_DURATION}ms ease;
    animation: affine-drag-handle-fade-in ${DRAG_HANDLE_FADE_IN_DURATION}ms
      ease-out;
  }

  .affine-drag-handle-container:hover .affine-drag-handle-grabber.grip {
    background-color: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
  }

  .affine-drag-handle-grabber.grip > .grip-icon {
    flex-shrink: 0;
    pointer-events: none;
  }

  @keyframes affine-drag-handle-fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .affine-drag-handle-grabber.dots > .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex: 0 0 4px;
    background-color: ${unsafeCSSVarV2('icon/secondary')};
  }

  @media print {
    .affine-drag-handle-widget {
      display: none;
    }
  }
  .affine-drag-hover-rect {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 6px;
    background: var(--affine-hover-color);
    pointer-events: none;
    z-index: 2;
    animation: expand 0.25s forwards;
  }
  @keyframes expand {
    0% {
      width: 0;
      height: 0;
    }
  }
`;
