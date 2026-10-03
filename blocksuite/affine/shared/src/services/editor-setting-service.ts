import { createIdentifier } from '@blocksuite/global/di';
import type { DeepPartial } from '@blocksuite/global/utils';
import type { BlockStdScope } from '@blocksuite/std';
import type { ExtensionType } from '@blocksuite/store';
import type { Signal } from '@preact/signals-core';
import { z } from 'zod';

import { NodePropsSchema } from '../utils/index.js';

export const GeneralSettingSchema = z
  .object({
    edgelessScrollZoom: z.boolean().default(false),
    edgelessDisableScheduleUpdate: z.boolean().default(false),
    docCanvasPreferView: z
      .enum(['affine:embed-linked-doc', 'affine:embed-synced-doc'])
      .default('affine:embed-synced-doc'),
    /**
     * Editor-wide writing direction for text blocks that don't set their own
     * `textDirection`. `none` renders no `dir` attribute (legacy behaviour).
     */
    textDirection: z.enum(['none', 'ltr', 'rtl', 'auto']).default('auto'),
  })
  .merge(NodePropsSchema);

export type EditorSetting = z.infer<typeof GeneralSettingSchema>;

export interface EditorSettingService {
  setting$: Signal<DeepPartial<EditorSetting>>;
  set?: (
    key: keyof EditorSetting,
    value: EditorSetting[keyof EditorSetting]
  ) => void;
}

export const EditorSettingProvider = createIdentifier<EditorSettingService>(
  'AffineEditorSettingProvider'
);

export type GlobalTextDirection = EditorSetting['textDirection'];

/**
 * Read the editor-wide text direction. Reading it inside a signal-aware
 * render/computed makes the caller reactive to setting changes.
 */
export function getGlobalTextDirection(
  std: BlockStdScope
): GlobalTextDirection {
  const setting = std.getOptional(EditorSettingProvider);
  return setting?.setting$.value.textDirection ?? 'auto';
}

export function EditorSettingExtension(
  service: EditorSettingService
): ExtensionType {
  return {
    setup: di => {
      di.override(EditorSettingProvider, () => service);
    },
  };
}
