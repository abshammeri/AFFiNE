import { notify } from '@affine/component';
import { I18n } from '@affine/i18n';

interface TrashableDoc {
  moveToTrash(): unknown;
  restoreFromTrash(): unknown;
}

/**
 * Move docs to trash right away and offer an Undo in the toast, instead of
 * asking for confirmation first.
 */
export async function moveToTrashWithUndo(docs: TrashableDoc[]) {
  if (docs.length === 0) return;
  await Promise.all(docs.map(doc => doc.moveToTrash()));
  notify.success({
    title: I18n.t('com.affine.toastMessage.movedTrash'),
    actions: [
      {
        key: 'undo',
        label: I18n.t('Undo'),
        onClick: async () => {
          await Promise.all(docs.map(doc => doc.restoreFromTrash()));
        },
      },
    ],
  });
}
