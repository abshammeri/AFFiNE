import { useI18n } from '@affine/i18n';
import clsx from 'clsx';
import { useCallback } from 'react';

import { Button } from '../../ui/button';
import { Loading } from '../../ui/loading';
import { Skeleton } from '../../ui/skeleton';
import * as styles from './index.css';

export const EditorLoading = ({
  longerLoading = false,
  onRetry,
}: {
  /**
   * the doc is taking longer than usual to load, show a calm
   * "still syncing" state instead of the plain skeleton.
   * It keeps waiting, the editor replaces it as soon as the doc is ready.
   */
  longerLoading?: boolean;
  /**
   * defaults to reloading the page
   */
  onRetry?: () => void;
}) => {
  const t = useI18n();
  const retry = useCallback(() => {
    if (onRetry) {
      onRetry();
    } else {
      document.location.reload();
    }
  }, [onRetry]);
  if (!longerLoading) {
    return <EditorSkeleton />;
  }
  return (
    <div
      className={styles.blockSuiteEditorStyle}
      aria-busy="true"
      data-testid="editor-still-syncing"
    >
      <div className={styles.content} role="status" aria-live="polite">
        <Loading size={20} />
        <div className={styles.stillSyncingTitle}>
          {t['com.affine.editor.still-syncing.title']()}
        </div>
        <div className={styles.text}>
          {t['com.affine.editor.still-syncing.description']()}
        </div>
        <Button
          size={BUILD_CONFIG.isMobileEdition ? 'large' : 'default'}
          className={clsx(
            BUILD_CONFIG.isMobileEdition
              ? styles.mobileActionButton
              : styles.actionButton
          )}
          contentClassName={clsx(
            BUILD_CONFIG.isMobileEdition
              ? styles.mobileActionContent
              : styles.actionContent
          )}
          onClick={retry}
          variant="secondary"
        >
          {t['com.affine.editor.still-syncing.retry']()}
        </Button>
      </div>
    </div>
  );
};

const SKELETON_LINES = ['100%', '92%', '96%', '64%', 0, '100%', '88%', '72%'];

/**
 * A page-shaped placeholder (title + paragraphs), faded in after a short
 * delay so fast loads never flash it.
 */
const EditorSkeleton = () => {
  const t = useI18n();
  return (
    <div
      className={styles.editorSkeleton}
      aria-busy="true"
      aria-label={t['com.affine.loading']()}
    >
      <Skeleton className={styles.skeletonTitle} width="45%" height={40} />
      {SKELETON_LINES.map((width, index) =>
        width ? (
          <Skeleton key={index} width={width} height={18} />
        ) : (
          <div key={index} className={styles.skeletonGap} />
        )
      )}
    </div>
  );
};

export const PageDetailLoading = () => {
  return (
    <div className={styles.pageDetailSkeletonStyle}>
      <EditorLoading />
    </div>
  );
};
