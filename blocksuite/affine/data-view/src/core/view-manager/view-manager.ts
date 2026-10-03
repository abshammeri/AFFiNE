import type { InsertToPosition } from '@blocksuite/affine-shared/utils';
import { nanoid } from '@blocksuite/store';
import { computed, type ReadonlySignal, signal } from '@preact/signals-core';

import type { DataSource } from '../data-source/base.js';
import type {
  DataViewDataType,
  DataViewMode,
  ViewMeta,
} from '../view/data-view.js';
import type { SingleView } from './single-view.js';

export interface ViewManager {
  viewMetas: ViewMeta[];
  dataSource: DataSource;
  readonly$: ReadonlySignal<boolean>;

  currentViewId$: ReadonlySignal<string | undefined>;
  currentView$: ReadonlySignal<SingleView | undefined>;

  setCurrentView(id: string): void;

  views$: ReadonlySignal<string[]>;

  viewGet(id: string): SingleView | undefined;

  viewAdd(type: DataViewMode): string;

  viewDelete(id: string): void;

  viewDuplicate(id: string): void;

  viewDataGet(id: string): DataViewDataType | undefined;

  moveTo(id: string, position: InsertToPosition): void;

  viewChangeType(id: string, type: string): void;
}

const RECENT_VIEWS_KEY = 'affine:data-view:recent-views';
const RECENT_VIEWS_LIMIT = 200;

/**
 * View ids are globally unique, so remembering the most recently selected
 * ones is enough to restore the last view of each database on reload.
 */
const readRecentViewIds = (): string[] => {
  try {
    const raw = globalThis.localStorage?.getItem(RECENT_VIEWS_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const rememberViewId = (id: string) => {
  try {
    const ids = [id, ...readRecentViewIds().filter(v => v !== id)];
    globalThis.localStorage?.setItem(
      RECENT_VIEWS_KEY,
      JSON.stringify(ids.slice(0, RECENT_VIEWS_LIMIT))
    );
  } catch {
    // storage unavailable, the view just won't be remembered
  }
};

export class ViewManagerBase implements ViewManager {
  _currentViewId$ = signal<string | undefined>(undefined);

  private readonly _recentViewIds = readRecentViewIds();

  views$ = computed(() => {
    return this.dataSource.viewDataList$.value.map(data => data.id);
  });

  private readonly _rememberedViewId$ = computed(() => {
    const views = this.views$.value;
    return this._recentViewIds.find(id => views.includes(id));
  });

  currentViewId$ = computed(() => {
    const current = this._currentViewId$.value;
    if (current && this.views$.value.includes(current)) {
      return current;
    }
    return this._rememberedViewId$.value ?? this.views$.value[0];
  });

  currentView$ = computed(() => {
    const id = this.currentViewId$.value;
    if (!id) return;
    return this.viewGet(id);
  });

  readonly$ = computed(() => {
    return this.dataSource.readonly$.value;
  });

  get viewMetas() {
    return this.dataSource.viewMetas;
  }

  constructor(public dataSource: DataSource) {}

  moveTo(id: string, position: InsertToPosition): void {
    this.dataSource.viewDataMoveTo(id, position);
  }

  setCurrentView(id: string | undefined): void {
    this._currentViewId$.value = id;
    if (id) {
      rememberViewId(id);
    }
  }

  viewAdd(type: DataViewMode): string {
    const meta = this.dataSource.viewMetaGet(type);
    const data = meta.model.defaultData(this);
    const id = this.dataSource.viewDataAdd({
      ...data,
      id: nanoid(),
      name: meta.model.defaultName,
      mode: type,
    });
    this.setCurrentView(id);
    return id;
  }

  viewChangeType(id: string, type: string): void {
    const from = this.viewGet(id)?.type;
    const meta = this.dataSource.viewMetaGet(type);
    this.dataSource.viewDataUpdate(id, old => {
      let data = {
        ...meta.model.defaultData(this),
        id: old.id,
        name: old.name,
        mode: type,
      };
      const convertFunction = this.dataSource.viewConverts.find(
        v => v.from === from && v.to === type
      );
      if (convertFunction) {
        data = {
          ...data,
          ...convertFunction.convert(old),
        };
      }
      return data;
    });
  }

  viewDataGet(id: string): DataViewDataType | undefined {
    return this.dataSource.viewDataGet(id);
  }

  viewDelete(id: string): void {
    this.dataSource.viewDataDelete(id);
    this.setCurrentView(this.views$.value[0]);
  }

  viewDuplicate(id: string): void {
    const newId = this.dataSource.viewDataDuplicate(id);
    this.setCurrentView(newId);
  }

  viewGet(id: string): SingleView | undefined {
    const meta = this.dataSource.viewMetaGetById(id);
    if (!meta) return;
    return new meta.model.dataViewManager(this, id);
  }
}
