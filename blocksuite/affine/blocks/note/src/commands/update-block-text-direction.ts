import type { TextDirection } from '@blocksuite/affine-model';
import {
  getBlockSelectionsCommand,
  getSelectedModelsCommand,
  getTextSelectionCommand,
} from '@blocksuite/affine-shared/commands';
import type { Command } from '@blocksuite/std';
import type { BlockModel } from '@blocksuite/store';

/** Flavours that carry a `textDirection` prop. */
export const TEXT_DIRECTION_FLAVOURS = new Set([
  'affine:paragraph',
  'affine:list',
  'affine:callout',
  // The whole table: cells are not blocks, they follow the table's direction.
  'affine:table',
]);

/** `TableSelection.type`, the selection of cells inside a table block. */
const TABLE_SELECTION_TYPE = 'table';

type UpdateBlockTextDirectionConfig = {
  /** `null` removes the block's own direction so it inherits the editor's. */
  textDirection: TextDirection | null;
  selectedModels?: BlockModel[];
};

/**
 * Set (or unset) the writing direction of the selected text blocks.
 * Works with a text selection (every block the range touches) or a block
 * selection. The change is a single undo step.
 */
export const updateBlockTextDirection: Command<
  UpdateBlockTextDirectionConfig
> = (ctx, next) => {
  const { std, textDirection } = ctx;
  let { selectedModels } = ctx;

  if (!selectedModels) {
    const [result, resultCtx] = std.command
      .chain()
      .tryAll(chain => [
        chain.pipe(getTextSelectionCommand),
        chain.pipe(getBlockSelectionsCommand),
      ])
      .pipe(getSelectedModelsCommand, {
        types: ['text', 'block'],
        mode: 'flat',
      })
      .run();
    if (result) {
      selectedModels = resultCtx.selectedModels;
    }
  }

  let models = (selectedModels ?? []).filter(model =>
    TEXT_DIRECTION_FLAVOURS.has(model.flavour)
  );
  if (models.length === 0 && !ctx.selectedModels) {
    // The caret (or a cell range) is inside a table: cells are not blocks and
    // have no direction of their own, so the command targets the table.
    models = std.selection.value
      .filter(selection => selection.type === TABLE_SELECTION_TYPE)
      .map(selection => std.store.getBlock(selection.blockId)?.model)
      .filter(
        (model): model is BlockModel =>
          !!model && TEXT_DIRECTION_FLAVOURS.has(model.flavour)
      );
  }
  if (models.length === 0) return false;

  std.store.captureSync();
  std.store.transact(() => {
    models.forEach(model => {
      const props = model.props as { textDirection?: TextDirection };
      if (textDirection) {
        std.store.updateBlock(model, { textDirection });
      } else if (props.textDirection !== undefined) {
        // `updateBlock(model, { textDirection: undefined })` is a no-op, the
        // prop has to be removed so the block inherits the editor default.
        std.store.updateBlock(model, () => {
          delete props.textDirection;
        });
      }
    });
  });

  return next();
};
