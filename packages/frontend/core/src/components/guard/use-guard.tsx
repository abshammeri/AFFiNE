import {
  type DocPermissionActions,
  GuardService,
  type WorkspacePermissionActions,
} from '@affine/core/modules/permissions';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect, useMemo } from 'react';

export const useGuard = <
  T extends WorkspacePermissionActions | DocPermissionActions,
>(
  action: T,
  ...args: T extends DocPermissionActions ? [string] : []
) => {
  const guardService = useService(GuardService);
  useEffect(() => {
    guardService.revalidateCan(action, ...args);
    // oxlint-disable-next-line react/exhaustive-deps
  }, [action, guardService, ...args]);

  const livedata$ = useMemo(
    () => {
      return guardService.can$(action, ...args);
    },
    // oxlint-disable-next-line react/exhaustive-deps
    [action, guardService, ...args]
  );

  const can = useLiveData(livedata$);
  return can;
};

/**
 * Read access for a doc that resolves instantly from the last known result.
 *
 * - `true` / `false`: the confirmed result, or the last known result while the check is pending
 * - `undefined`: the check is pending and nothing is known about this doc yet
 *
 * This is only meant to decide whether to *render* a doc. Write access must
 * always come from `useGuard('Doc_Update', docId)`, which stays `undefined`
 * (read-only) until the server confirms it.
 */
export const useDocReadAccess = (docId: string) => {
  const guardService = useService(GuardService);
  const canRead = useGuard('Doc_Read', docId);
  const cached = useMemo(
    () => (docId ? guardService.cachedCanReadDoc(docId) : undefined),
    [docId, guardService]
  );
  return canRead ?? cached;
};
