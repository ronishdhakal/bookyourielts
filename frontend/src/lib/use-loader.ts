"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";

/**
 * Load data whenever `key` changes (null = do not load). Loading is derived, never set inside the effect,
 * and `reload()` refetches the same key. Stale responses from an earlier key are ignored.
 */
export function useLoader<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{
    key: string;
    n: number;
    data: T | null;
    error: string | null;
  } | null>(null);
  const [n, setN] = useState(0);
  const run = useEffectEvent(load);

  useEffect(() => {
    if (!key) return;
    const ctl = new AbortController();
    run(ctl.signal).then(
      (data) => !ctl.signal.aborted && setState({ key, n, data, error: null }),
      (e) =>
        !ctl.signal.aborted &&
        setState({
          key,
          n,
          data: null,
          error: e instanceof Error ? e.message : "Something went wrong.",
        }),
    );
    return () => ctl.abort();
  }, [key, n]);

  const ready = state?.key === key && state.n === n;
  const reload = useCallback(() => setN((v) => v + 1), []);
  // While reloading the same key keep showing the previous data instead of flashing a skeleton.
  const data = state?.key === key ? state.data : null;
  return {
    data,
    loading: !!key && !ready && data === null,
    refreshing: !!key && !ready,
    error: ready ? state.error : null,
    reload,
  };
}
