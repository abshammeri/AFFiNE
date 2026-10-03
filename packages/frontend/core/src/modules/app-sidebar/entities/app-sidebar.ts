import { Entity, LiveData } from '@toeverything/infra';
import { map } from 'rxjs';

import type { AppSidebarState } from '../providers/storage';

enum APP_SIDEBAR_STATE {
  OPEN = 'open',
  WIDTH = 'width',
}

export class AppSidebar extends Entity {
  constructor(private readonly appSidebarState: AppSidebarState) {
    super();
  }

  /**
   * whether the sidebar is open,
   * even if the sidebar is not open, hovering can show the floating sidebar
   */
  open$ = LiveData.from(
    this.appSidebarState
      .watch<boolean>(APP_SIDEBAR_STATE.OPEN)
      .pipe(map(value => value ?? true)),
    this.appSidebarState.get<boolean>(APP_SIDEBAR_STATE.OPEN) ?? true
  );

  private readonly persistedWidth$ = LiveData.from(
    this.appSidebarState
      .watch<number>(APP_SIDEBAR_STATE.WIDTH)
      .pipe(map(value => value ?? 248)),
    this.appSidebarState.get<number>(APP_SIDEBAR_STATE.WIDTH) ?? 248
  );

  /**
   * in-memory width while the user is dragging the resize handle,
   * only persisted once the drag ends (see {@link setWidth})
   */
  private readonly draggingWidth$ = new LiveData<number | null>(null);

  width$ = LiveData.computed(
    get => get(this.draggingWidth$) ?? get(this.persistedWidth$)
  );

  /**
   * hovering can show the floating sidebar, without open it
   */
  hovering$ = new LiveData<boolean>(false);

  /**
   * prevent it from setting hovering once when the sidebar is closed
   */
  preventHovering$ = new LiveData<boolean>(false);

  /**
   * small screen mode, will disable hover effect
   */
  smallScreenMode$ = new LiveData<boolean>(false);
  resizing$ = new LiveData<boolean>(false);

  getCachedAppSidebarOpenState = () => {
    return this.appSidebarState.get<boolean>(APP_SIDEBAR_STATE.OPEN);
  };

  toggleSidebar = () => {
    this.setOpen(!this.open$.value);
  };

  setOpen = (open: boolean) => {
    this.appSidebarState.set(APP_SIDEBAR_STATE.OPEN, open);
    return;
  };

  setSmallScreenMode = (smallScreenMode: boolean) => {
    this.smallScreenMode$.next(smallScreenMode);
  };

  setHovering = (hoverFloating: boolean) => {
    this.hovering$.next(hoverFloating);
  };

  setPreventHovering = (preventHovering: boolean) => {
    this.preventHovering$.next(preventHovering);
  };

  setResizing = (resizing: boolean) => {
    this.resizing$.next(resizing);
  };

  /**
   * update the width in memory only, used on every mousemove while dragging
   */
  setDraggingWidth = (width: number) => {
    this.draggingWidth$.next(width);
  };

  /**
   * persist the width, e.g. once on drag end
   */
  setWidth = (width: number) => {
    this.appSidebarState.set(APP_SIDEBAR_STATE.WIDTH, width);
    this.draggingWidth$.next(null);
  };
}
