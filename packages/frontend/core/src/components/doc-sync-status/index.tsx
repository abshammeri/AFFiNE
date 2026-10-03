import { Tooltip } from '@affine/component';
import { useSystemOnline } from '@affine/core/components/hooks/use-system-online';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useI18n } from '@affine/i18n';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import { useMemo } from 'react';

import * as styles from './styles.css';

type DocSyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

/**
 * A quiet per-doc sync indicator for the doc header:
 * grey when synced, amber pulsing while syncing, crossed when offline
 * and red when sync is failing. Not shown for local workspaces.
 */
export const DocSyncStatusIndicator = ({ docId }: { docId: string }) => {
  const t = useI18n();
  const workspace = useService(WorkspaceService).workspace;
  const isLocal = workspace.flavour === 'local';
  const isOnline = useSystemOnline();

  const docState = useLiveData(
    useMemo(
      () =>
        isLocal
          ? null
          : LiveData.from(workspace.engine.doc.docState$(docId), null),
      [docId, isLocal, workspace]
    )
  );

  if (isLocal || !docState) {
    return null;
  }

  let status: DocSyncStatus;
  if (!isOnline) {
    status = 'offline';
  } else if (docState.syncRetrying) {
    status = 'error';
  } else if (docState.synced && !docState.updating) {
    status = 'synced';
  } else if (docState.syncing || docState.updating) {
    status = 'syncing';
  } else if (docState.syncErrorMessage) {
    // doc scoped error (e.g. permission), sync is paused for this doc
    status = 'error';
  } else {
    status = 'syncing';
  }

  const label =
    status === 'offline'
      ? t['com.affine.doc-sync-status.offline']()
      : status === 'error'
        ? t['com.affine.doc-sync-status.error']()
        : status === 'syncing'
          ? t['com.affine.doc-sync-status.syncing']()
          : t['com.affine.doc-sync-status.synced']();

  return (
    <Tooltip content={label} side="bottom">
      <div
        className={styles.root}
        role="status"
        aria-label={label}
        data-testid="doc-sync-status"
        data-status={status}
      >
        <span className={styles.dot} data-status={status} />
      </div>
    </Tooltip>
  );
};
