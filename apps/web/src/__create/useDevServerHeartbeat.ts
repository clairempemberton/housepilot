'use client';

import { useEffect } from 'react';

export function useDevServerHeartbeat() {
  useEffect(() => {
    let lastHeartbeat = 0;

    const sendHeartbeat = () => {
      const now = Date.now();

      // Only send at most once every 3 minutes
      if (now - lastHeartbeat < 60_000 * 3) return;

      lastHeartbeat = now;

      // HACK: at time of writing, we run the dev server on a proxy url that
      // when requested, ensures that the dev server's life is extended. If
      // the user is using a page or is active in it in the app, but when the
      // user has popped out their preview, they no longer can rely on the
      // app to do this. This hook ensures it stays alive.
      fetch('/', {
        method: 'GET',
      }).catch(() => {
        // no-op: we just want to keep the dev server alive
      });
    };

    const handleActivity = () => {
      sendHeartbeat();
    };

    const events = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ] as const;

    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, []);
}