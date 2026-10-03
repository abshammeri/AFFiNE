import { EditorChevronDown } from '@blocksuite/affine-components/toolbar';
import { TableBlockModel, type TextDirection } from '@blocksuite/affine-model';
import {
  type ToolbarAction,
  type ToolbarModuleConfig,
  ToolbarModuleExtension,
} from '@blocksuite/affine-shared/services';
import { BlockFlavourIdentifier } from '@blocksuite/std';
import type { ExtensionType } from '@blocksuite/store';
import { html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

import { getTableDirectionOptions, setTableTextDirection } from '../direction';

const directionAction = {
  id: 'a.direction',
  label: 'Direction',
  tooltip: 'Table direction',
  run() {
    // Handled by the menu in `content`.
  },
  content(ctx) {
    const model = ctx.getCurrentModelByType(TableBlockModel);
    if (!model) return null;

    const options = getTableDirectionOptions(model.props.textDirection);
    const active = options.find(option => option.selected);
    const update = (textDirection: TextDirection | null) => {
      setTableTextDirection(model, textDirection);
    };

    return html`
      <editor-menu-button
        .contentPadding=${'8px'}
        .button=${html`
          <editor-icon-button
            aria-label="Table direction"
            data-testid="table-direction"
            .tooltip=${'Table direction'}
          >
            ${active?.icon} ${EditorChevronDown}
          </editor-icon-button>
        `}
      >
        <div data-size="large" data-orientation="vertical">
          <div class="highlight-heading">Direction</div>
          ${repeat(
            options,
            option => option.name,
            ({ textDirection, label, icon, selected }) => html`
              <editor-menu-action
                aria-label=${label}
                data-testid=${`table-direction-${textDirection ?? 'reset'}`}
                ?data-selected=${selected}
                @click=${() => update(textDirection)}
              >
                ${icon}<span class="label">${label}</span>
              </editor-menu-action>
            `
          )}
        </div>
      </editor-menu-button>
    `;
  },
} satisfies ToolbarAction;

const tableToolbarConfig = {
  actions: [directionAction],
} as const satisfies ToolbarModuleConfig;

/** Toolbar shown when the table block itself is selected. */
export const TableToolbarExtension: ExtensionType = ToolbarModuleExtension({
  id: BlockFlavourIdentifier('affine:table'),
  config: tableToolbarConfig,
});
