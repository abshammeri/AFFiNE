import { ServerFeature } from '@affine/graphql';
import {
  effect,
  Entity,
  LiveData,
  onComplete,
  onStart,
} from '@toeverything/infra';
import { truncate } from 'lodash-es';
import {
  catchError,
  EMPTY,
  map,
  merge,
  type Observable,
  of,
  scan,
  switchMap,
  tap,
  throttleTime,
} from 'rxjs';

import type { WorkspaceServerService } from '../../cloud';
import type { DocRecord, DocsService } from '../../doc';
import type { DocDisplayMetaService } from '../../doc-display-meta';
import type { DocsSearchService } from '../../docs-search';
import type { WorkspaceService } from '../../workspace';
import type { QuickSearchSession } from '../providers/quick-search-provider';
import type { QuickSearchItem } from '../types/item';

interface DocsPayload {
  docId: string;
  title?: string;
  blockId?: string | undefined;
  blockContent?: string | undefined;
}

type SearchedDoc = DocsPayload & { score: number };

type SearchResult = {
  docs: SearchedDoc[];
  useLocalLabel: boolean;
  /**
   * when true, `docs` is already ordered and the score of each item is derived
   * from its position, so that the list stays stable while results are merged
   */
  ranked: boolean;
  /** false while server results are still pending */
  settled: boolean;
};

export class DocsQuickSearchSession
  extends Entity
  implements QuickSearchSession<'docs', DocsPayload>
{
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly workspaceServerService: WorkspaceServerService,
    private readonly docsSearchService: DocsSearchService,
    private readonly docsService: DocsService,
    private readonly docDisplayMetaService: DocDisplayMetaService
  ) {
    super();
  }

  private readonly isSupportServerIndexer = () =>
    this.workspaceServerService.server?.config$.value.features.includes(
      ServerFeature.Indexer
    ) ?? false;

  private readonly isIndexerLoading$ = this.docsSearchService.indexerState$.map(
    ({ completed }) => {
      return !completed;
    }
  );

  private readonly isQueryLoading$ = new LiveData(false);

  isCloudWorkspace = this.workspaceService.workspace.flavour !== 'local';

  isLoading$ = LiveData.computed(get => {
    return (
      (this.isCloudWorkspace ? false : get(this.isIndexerLoading$)) ||
      get(this.isQueryLoading$)
    );
  });

  error$ = new LiveData<any>(null);

  items$ = new LiveData<QuickSearchItem<'docs', DocsPayload>[]>([]);

  /**
   * Search the local index and the server index at the same time.
   * Local results are emitted as soon as they are available (usually on the first keystroke),
   * server results are merged in (deduped by docId) when they arrive.
   * Docs that are already shown keep their position, new docs are appended.
   */
  private searchLocalAndRemote$(query: string): Observable<SearchResult> {
    const local$ = this.docsSearchService.search$(query, 'local').pipe(
      map(docs => ({ local: docs as SearchedDoc[] })),
      catchError(err => {
        console.error('local search failed', err);
        return of({ local: [] as SearchedDoc[] });
      })
    );
    const remote$ = this.docsSearchService.search$(query, 'remote').pipe(
      map(docs => ({ remote: docs as SearchedDoc[] })),
      catchError(err => {
        console.error('remote search failed', err);
        return of({ remote: [] as SearchedDoc[] });
      })
    );

    return merge(local$, remote$).pipe(
      scan(
        (acc, next) => {
          const local = 'local' in next ? next.local : acc.local;
          const remote = 'remote' in next ? next.remote : acc.remote;

          // local hit wins over remote hit for the same doc, so that the subtitle does not flicker
          const byId = new Map<string, SearchedDoc>();
          for (const doc of [...(local ?? []), ...(remote ?? [])]) {
            if (!byId.has(doc.docId)) {
              byId.set(doc.docId, doc);
            }
          }

          // keep the order of docs that are already shown, append new ones
          const order = acc.order.filter(id => byId.has(id));
          const shown = new Set(order);
          for (const id of byId.keys()) {
            if (!shown.has(id)) {
              order.push(id);
            }
          }

          const docs = order
            .map(id => byId.get(id))
            .filter((doc): doc is SearchedDoc => !!doc);

          return { local, remote, order, docs };
        },
        {
          local: null as SearchedDoc[] | null,
          remote: null as SearchedDoc[] | null,
          order: [] as string[],
          docs: [] as SearchedDoc[],
        }
      ),
      map(({ docs, remote }) => ({
        docs,
        useLocalLabel: false,
        ranked: true,
        settled: remote !== null,
      }))
    );
  }

  query = effect(
    throttleTime<string>(150, undefined, {
      leading: true,
      trailing: true,
    }),
    switchMap((query: string) => {
      let out: Observable<{
        items: QuickSearchItem<'docs', DocsPayload>[];
        settled: boolean;
      }>;
      if (!query) {
        out = of({ items: [], settled: true });
      } else {
        const search$: Observable<SearchResult> = this.isSupportServerIndexer()
          ? this.searchLocalAndRemote$(query)
          : this.docsSearchService.search$(query, 'local').pipe(
              map(docs => ({
                docs,
                useLocalLabel: true,
                ranked: false,
                settled: true,
              }))
            );

        out = search$.pipe(
          map(({ docs, useLocalLabel, ranked, settled }) => {
            const items = docs
              .map((doc, index) => {
                const docRecord = this.docsService.list.doc$(doc.docId).value;
                return [doc, docRecord, index] as const;
              })
              .filter(
                (props): props is [(typeof props)[0], DocRecord, number] =>
                  !!props[1]
              )
              .map(([doc, docRecord, index]) => {
                const { title, icon, updatedDate } =
                  this.docDisplayMetaService.getDocDisplayMeta(docRecord);
                return {
                  id: 'doc:' + docRecord.id,
                  source: 'docs',
                  group: {
                    id: 'docs',
                    label: {
                      i18nKey: useLocalLabel
                        ? 'com.affine.quicksearch.group.searchfor-locally'
                        : 'com.affine.quicksearch.group.searchfor',
                      options: { query: truncate(query) },
                    },
                    // rank matching docs above commands, collections and tags
                    score: 12,
                  },
                  label: {
                    title: title,
                    subTitle: doc.blockContent,
                  },
                  // local and server scores are not comparable, use the merged position instead
                  score: ranked ? docs.length - index : doc.score,
                  icon,
                  timestamp: updatedDate,
                  payload: doc,
                } as QuickSearchItem<'docs', DocsPayload>;
              });
            return { items, settled };
          })
        );
      }
      return out.pipe(
        tap(({ items, settled }) => {
          this.items$.next(items);
          this.isQueryLoading$.next(!settled);
        }),
        onStart(() => {
          this.error$.next(null);
          this.isQueryLoading$.next(true);
        }),
        catchError(err => {
          this.error$.next(err instanceof Error ? err.message : err);
          this.items$.next([]);
          this.isQueryLoading$.next(false);
          return EMPTY;
        }),
        onComplete(() => {})
      );
    })
  );

  // TODO(@EYHN): load more

  override dispose(): void {
    this.query.unsubscribe();
  }
}
