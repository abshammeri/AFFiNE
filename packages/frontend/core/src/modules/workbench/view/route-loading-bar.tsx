import { useEffect, useState } from 'react';
import { useNavigation } from 'react-router-dom';

import * as styles from './route-loading-bar.css';

/**
 * only show the bar for loads that take noticeably long, so that fast navigations do not flash
 */
const SHOW_DELAY = 150;

/**
 * A thin progress bar at the top of the view, shown while the view's router is
 * loading a (lazy) route for longer than {@link SHOW_DELAY}ms.
 */
export const RouteLoadingBar = () => {
  const navigation = useNavigation();
  const loading = navigation.state !== 'idle';
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), SHOW_DELAY);
    return () => clearTimeout(timer);
  }, [loading]);

  if (!show) {
    return null;
  }

  return (
    <div
      className={styles.bar}
      role="progressbar"
      aria-busy="true"
      data-testid="route-loading-bar"
    />
  );
};
