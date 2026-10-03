import {
  type GetDocRolePermissionsQuery,
  getDocRolePermissionsQuery,
} from '@affine/graphql';
import { Store } from '@toeverything/infra';

import type { WorkspaceServerService } from '../../cloud';
import { AuthService } from '../../cloud/services/auth';
import type { GlobalCache, NbstoreService } from '../../storage';
import type { WorkspaceService } from '../../workspace';

export type WorkspacePermissionActions = string;

export type DocPermissionActions = keyof Omit<
  GetDocRolePermissionsQuery['workspace']['doc']['permissions'],
  '__typename'
>;

export class GuardStore extends Store {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceServerService: WorkspaceServerService,
    private readonly nbstoreService: NbstoreService,
    private readonly globalCache: GlobalCache
  ) {
    super();
  }

  private static readonly DOC_READ_CACHE_LIMIT = 500;

  /**
   * Cache key for the last known `Doc_Read` results, scoped by workspace and user.
   * Returns null when the current user is unknown (nothing is cached then).
   */
  private docReadCacheKey() {
    const accountId =
      this.workspaceServerService.server?.scope.get(AuthService).session
        .account$.value?.id;
    if (!accountId) {
      return null;
    }
    return `doc-read-permission:${this.workspaceService.workspace.id}:${accountId}`;
  }

  /**
   * Last known `Doc_Read` result for a doc, persisted across reloads.
   * This is only a hint for rendering while the real check is pending,
   * it must never be used to grant write access.
   */
  getCachedDocReadPermission(docId: string): boolean | undefined {
    const key = this.docReadCacheKey();
    if (!key) {
      return undefined;
    }
    const cache = this.globalCache.get<Record<string, boolean>>(key);
    const value = cache?.[docId];
    return typeof value === 'boolean' ? value : undefined;
  }

  setCachedDocReadPermission(docId: string, canRead: boolean) {
    const key = this.docReadCacheKey();
    if (!key) {
      return;
    }
    const cache = { ...this.globalCache.get<Record<string, boolean>>(key) };
    if (cache[docId] === canRead) {
      return;
    }
    // re-insert so the most recently checked docs are kept when trimming
    delete cache[docId];
    cache[docId] = canRead;
    const keys = Object.keys(cache);
    for (let i = 0; i < keys.length - GuardStore.DOC_READ_CACHE_LIMIT; i++) {
      delete cache[keys[i]];
    }
    try {
      this.globalCache.set(key, cache);
    } catch (error) {
      // the cache is only an optimization, ignore storage errors (e.g. quota)
      console.warn('failed to cache doc permission', error);
    }
  }

  async getWorkspacePermissions(): Promise<
    Record<WorkspacePermissionActions, boolean>
  > {
    const { access } = await this.nbstoreService.realtime.request(
      'workspace.access.get',
      { workspaceId: this.workspaceService.workspace.id },
      { timeoutMs: 10000 }
    );
    return access.permissions as Record<WorkspacePermissionActions, boolean>;
  }

  async getDocPermissions(
    docId: string
  ): Promise<Record<DocPermissionActions, boolean>> {
    if (!this.workspaceServerService.server) {
      throw new Error('No server');
    }
    const data = await this.workspaceServerService.server.gql({
      query: getDocRolePermissionsQuery,
      variables: {
        workspaceId: this.workspaceService.workspace.id,
        docId,
      },
    });
    return data.workspace.doc.permissions;
  }
}
