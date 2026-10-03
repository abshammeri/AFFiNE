import type { RouteObject } from 'react-router-dom';

export const workbenchRoutes = [
  {
    path: '/chat',
    lazy: () => import('./pages/workspace/chat/index'),
  },
  {
    path: '/all',
    lazy: () => import('./pages/workspace/all-page/all-page'),
  },
  {
    path: '/collection',
    lazy: () => import('./pages/workspace/all-collection'),
  },
  {
    path: '/collection/:collectionId',
    lazy: () => import('./pages/workspace/collection/index'),
  },
  {
    path: '/tag',
    lazy: () => import('./pages/workspace/all-tag'),
  },
  {
    path: '/tag/:tagId',
    lazy: () => import('./pages/workspace/tag'),
  },
  {
    path: '/trash',
    lazy: () => import('./pages/workspace/trash-page'),
  },
  {
    path: '/:pageId',
    lazy: () => import('./pages/workspace/detail-page/detail-page'),
  },
  {
    path: '/:pageId/attachments/:attachmentId',
    lazy: () => import('./pages/workspace/attachment/index'),
  },
  {
    path: '/journals',
    lazy: () => import('./pages/workspace/journals'),
  },
  {
    path: '/settings',
    lazy: () => import('./pages/workspace/settings'),
  },
  {
    path: '*',
    lazy: () => import('./pages/404'),
  },
] satisfies RouteObject[];

const runWhenIdle = (callback: () => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: 5000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 200);
  return () => clearTimeout(id);
};

let prefetched = false;

/**
 * Load the code of the lazy workbench routes in the background when the browser is idle,
 * one route per idle period, so that later navigations do not wait for chunks to download.
 *
 * @returns a function that stops the remaining prefetching
 */
export function prefetchWorkbenchRoutes() {
  if (prefetched) {
    return () => {};
  }
  prefetched = true;

  const queue: (() => Promise<unknown>)[] = workbenchRoutes.map(
    route => route.lazy
  );
  let cancel: (() => void) | null = null;
  let stopped = false;

  const next = () => {
    if (stopped || queue.length === 0) {
      cancel = null;
      return;
    }
    cancel = runWhenIdle(() => {
      const load = queue.shift();
      if (!load) {
        return;
      }
      load()
        .catch(err => {
          // not fatal, the route will be loaded again on navigation
          console.warn('failed to prefetch route', err);
        })
        .finally(next);
    });
  };
  next();

  return () => {
    stopped = true;
    cancel?.();
    if (queue.length > 0) {
      // allow a later call to prefetch the remaining routes
      prefetched = false;
    }
  };
}
