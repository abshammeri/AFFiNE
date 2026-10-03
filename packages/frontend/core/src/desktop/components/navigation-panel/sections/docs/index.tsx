import { IconButton } from '@affine/component';
import { usePageHelper } from '@affine/core/blocksuite/block-suite-page-list/utils';
import { DocsService } from '@affine/core/modules/doc';
import { DocsSearchService } from '@affine/core/modules/docs-search';
import { NavigationPanelService } from '@affine/core/modules/navigation-panel';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { inferOpenMode } from '@affine/core/utils';
import { useI18n } from '@affine/i18n';
import { PageIcon, PlusIcon } from '@blocksuite/icons/rc';
import { useServices } from '@toeverything/infra';
import {
  type MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { combineLatest } from 'rxjs';

import { CollapsibleSection } from '../../layouts/collapsible-section';
import { NavigationPanelEmptySection } from '../../layouts/empty-section';
import { NavigationPanelDocNode } from '../../nodes/doc';
import { NavigationPanelTreeRoot } from '../../tree';
import * as styles from './index.css';

const COLLAPSED_LIMIT = 10;

const childLocation = {
  at: 'navigation-panel:docs:list' as const,
};

/**
 * Top-level docs (docs no other doc links to), most recently edited first.
 */
const useRootDocIds = () => {
  const { docsService, docsSearchService } = useServices({
    DocsService,
    DocsSearchService,
  });
  const [rootDocIds, setRootDocIds] = useState<string[] | null>(null);

  useEffect(() => {
    const subscription = combineLatest([
      docsService.allNonTrashDocIds$(),
      docsService.allDocsUpdatedDate$(),
      docsSearchService.watchLinkedDocIds(),
    ]).subscribe(([docIds, updatedDates, linkedDocIds]) => {
      const updatedAt = new Map(
        updatedDates.map(({ id, updatedDate }) => [id, updatedDate ?? 0])
      );
      setRootDocIds(
        docIds
          .filter(id => !linkedDocIds.has(id))
          .sort((a, b) => (updatedAt.get(b) ?? 0) - (updatedAt.get(a) ?? 0))
      );
    });
    return () => subscription.unsubscribe();
  }, [docsSearchService, docsService]);

  return rootDocIds;
};

export const NavigationPanelDocs = () => {
  const { workspaceService, navigationPanelService } = useServices({
    WorkspaceService,
    NavigationPanelService,
  });
  const t = useI18n();
  const path = useMemo(() => ['docs'], []);
  const rootDocIds = useRootDocIds();
  const [expanded, setExpanded] = useState(false);

  const { createPage } = usePageHelper(
    workspaceService.workspace.docCollection
  );

  const handleCreateDoc: MouseEventHandler = useCallback(
    e => {
      createPage(undefined, { at: inferOpenMode(e) });
      navigationPanelService.setCollapsed(path, false);
    },
    [createPage, navigationPanelService, path]
  );

  const toggleExpanded = useCallback(() => setExpanded(v => !v), []);

  const visibleDocIds =
    rootDocIds && !expanded ? rootDocIds.slice(0, COLLAPSED_LIMIT) : rootDocIds;

  return (
    <CollapsibleSection
      path={path}
      title={t['com.affine.rootAppSidebar.docs']()}
      testId="navigation-panel-docs"
      headerTestId="navigation-panel-docs-category-divider"
      actions={
        <IconButton
          data-testid="navigation-panel-bar-add-doc-button"
          onClick={handleCreateDoc}
          onAuxClick={handleCreateDoc}
          size="16"
          tooltip={t['New Page']()}
        >
          <PlusIcon />
        </IconButton>
      }
    >
      <NavigationPanelTreeRoot
        placeholder={
          rootDocIds === null ? null : (
            <NavigationPanelEmptySection
              icon={PageIcon}
              message={t['com.affine.rootAppSidebar.docs.empty']()}
            />
          )
        }
      >
        {visibleDocIds?.map(docId => (
          <NavigationPanelDocNode
            key={docId}
            docId={docId}
            location={childLocation}
            reorderable={false}
            parentPath={path}
          />
        ))}
      </NavigationPanelTreeRoot>
      {rootDocIds && rootDocIds.length > COLLAPSED_LIMIT ? (
        <div
          className={styles.showMore}
          role="button"
          onClick={toggleExpanded}
          data-testid="navigation-panel-docs-show-more"
        >
          {expanded
            ? t['com.affine.rootAppSidebar.docs.show-less']()
            : t['com.affine.rootAppSidebar.docs.show-more']()}
        </div>
      ) : null}
    </CollapsibleSection>
  );
};
