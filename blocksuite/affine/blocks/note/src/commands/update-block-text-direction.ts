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
]);

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

  const models = (selectedModels ?? []).filter(model =>
    TEXT_DIRECTION_FLAVOURS.has(model.flavour)
  );
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
