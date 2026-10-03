import { Trans, useI18n } from '@affine/i18n';
import clsx from 'clsx';
import { useCallback } from 'react';

import { Button } from '../../ui/button';
import { Skeleton } from '../../ui/skeleton';
import { ThemedImg } from '../../ui/themed-img';
import imageUrlForDarkLoading from './assets/loading.dark.png';
import imageUrlForLightLoading from './assets/loading.light.png';
import * as styles from './index.css';

export const EditorLoading = ({
  longerLoading = false,
}: {
  longerLoading?: boolean;
}) => {
  const t = useI18n();
  const reloadPage = useCallback(() => {
    document.location.reload();
  }, []);
  if (!longerLoading) {
    return <EditorSkeleton />;
  }
  return (
    <div className={styles.blockSuiteEditorStyle}>
      <ThemedImg
        style={{ width: '300px' }}
        draggable={false}
        className={styles.illustration}
        lightSrc={imageUrlForLightLoading}
        darkSrc={imageUrlForDarkLoading}
      />
      <div className={styles.content} data-longer-loading={true}>
        <div>
          <div className={styles.text} data-longer-loading={true}>
            {t['com.affine.error.loading-timeout-error']()}
          </div>
          <div className={styles.text} data-longer-loading={true}>
            <Trans
              i18nKey="com.affine.error.contact-us"
              components={{
                1: (
                  <a
                    style={{ color: 'var(--affine-primary-color)' }}
                    href="https://affine.pro/redirect/discord"
                    target="__blank"
                  />
                ),
              }}
            />
          </div>
        </div>
        <Button
          size="large"
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
          onClick={reloadPage}
          variant="primary"
        >
          {t['com.affine.error.reload']()}
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
